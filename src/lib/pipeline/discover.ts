import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { searches, searchQueries } from "../db/schema";
import { readEnv } from "../env";
import { filtersSchema } from "../filters";
import { DISABLED_DOMAINS, isCandidateDomain, SOURCES } from "../sources";
import { reserveCredit } from "./credits";
import { normalizeDomain } from "./normalize";
import {
  buildQueries,
  MAX_QUERIES_WITHOUT_NEW_DOMAINS,
  type PlannedQuery,
  type StopReason,
} from "./queries";
import { runWithLimit } from "./run-with-limit";
import { getPlanUsage, searchTavily, tavilyResponseSchema } from "./tavily";

const TAVILY_CONCURRENCY = 3;

export type Candidate = {
  url: string;
  domain: string;
  title: string;
  snippet: string;
  source: string;
};

export type FoundResults = {
  candidates: Candidate[];
  allResults: Candidate[];
};

export type DiscoverResult = FoundResults & {
  stopReason: StopReason | null;
  creditsUsed: number;
  domainsFound: number;
};

function buildTavilyDomains(sourceId: string) {
  const source = SOURCES.find((item) => item.id === sourceId);
  return {
    includeDomains: source?.domains ?? [],
    excludeDomains: DISABLED_DOMAINS,
  };
}

type DiscoveryProgress = FoundResults & {
  domains: Set<string>;
  queriesDone: number;
};

async function loadStoredResponses(planned: PlannedQuery[]) {
  const rows = await db
    .select()
    .from(searchQueries)
    .where(
      inArray(
        searchQueries.key,
        planned.map((query) => query.key),
      ),
    );
  return new Map(
    rows
      .filter((row) => row.status === "done" || row.status === "empty")
      .map((row) => [row.key, row.rawResponse]),
  );
}

function addResponse(
  progress: DiscoveryProgress,
  query: PlannedQuery,
  raw: unknown,
) {
  const domainCountBefore = progress.domains.size;
  for (const result of tavilyResponseSchema.parse(raw).results) {
    const domain = normalizeDomain(result.url);
    if (!domain) continue;
    const candidate = {
      url: result.url,
      domain,
      title: result.title ?? "",
      snippet: result.content ?? "",
      source: query.source,
    };
    progress.allResults.push(candidate);
    if (!isCandidateDomain(domain)) continue;
    progress.domains.add(domain);
    progress.candidates.push(candidate);
  }
  progress.queriesDone += 1;
  return progress.domains.size > domainCountBefore;
}

function saveProgress(searchId: number, progress: DiscoveryProgress) {
  return db
    .update(searches)
    .set({
      queriesDone: progress.queriesDone,
      domainsFound: progress.domains.size,
    })
    .where(eq(searches.id, searchId));
}

async function searchAndStore(apiKey: string, query: PlannedQuery) {
  const outcome = await searchTavily(apiKey, {
    query: query.text,
    country: query.country,
    ...buildTavilyDomains(query.source),
  });

  if (outcome.kind !== "ok") {
    await db
      .update(searchQueries)
      .set({ status: "failed" })
      .where(eq(searchQueries.key, query.key));
    if (outcome.kind === "plan_limit") return null;
    throw new Error(outcome.message);
  }

  const { results } = tavilyResponseSchema.parse(outcome.raw);
  await db
    .update(searchQueries)
    .set({
      status: results.length > 0 ? "done" : "empty",
      rawResponse: outcome.raw,
    })
    .where(eq(searchQueries.key, query.key));
  return outcome.raw;
}

export async function discover(
  search: typeof searches.$inferSelect,
  onResultsChanged: (found: FoundResults) => Promise<void>,
): Promise<DiscoverResult> {
  const searchId = search.id;
  const apiKey = readEnv().SEARCH_API_KEY;

  const planned = buildQueries(filtersSchema.parse(search));
  await db
    .update(searches)
    .set({ status: "discovering", queriesPlanned: planned.length })
    .where(eq(searches.id, searchId));

  const storedResponses = await loadStoredResponses(planned);
  const progress: DiscoveryProgress = {
    candidates: [],
    allResults: [],
    domains: new Set(),
    queriesDone: 0,
  };

  for (const query of planned) {
    const raw = storedResponses.get(query.key);
    if (raw !== undefined) addResponse(progress, query, raw);
  }
  await saveProgress(searchId, progress);
  await onResultsChanged(progress);

  const queriesToRun = planned.filter(
    (query) => !storedResponses.has(query.key),
  );
  const plan =
    queriesToRun.length > 0 && search.creditCap > 0
      ? await getPlanUsage(apiKey)
      : { planLimit: 0, planUsage: 0 };

  let creditsUsed = 0;
  let queriesWithoutNewDomains = 0;
  let stopReason: StopReason | null = null;

  await runWithLimit(queriesToRun, TAVILY_CONCURRENCY, async (query) => {
    if (stopReason) return;
    if (queriesWithoutNewDomains >= MAX_QUERIES_WITHOUT_NEW_DOMAINS) {
      stopReason = "no_new_domains";
      return;
    }

    const budgetStop = await reserveCredit(searchId, query, plan);
    if (budgetStop) {
      stopReason = budgetStop;
      return;
    }
    creditsUsed += 1;

    const raw = await searchAndStore(apiKey, query);
    if (raw === null) {
      stopReason = "no_credits";
      return;
    }

    const foundNewDomain = addResponse(progress, query, raw);
    const source = SOURCES.find((item) => item.id === query.source);
    if (source?.countsForEarlyStop) {
      queriesWithoutNewDomains = foundNewDomain
        ? 0
        : queriesWithoutNewDomains + 1;
    }
    await saveProgress(searchId, progress);
    await onResultsChanged(progress);
  });

  return {
    candidates: progress.candidates,
    allResults: progress.allResults,
    stopReason,
    creditsUsed,
    domainsFound: progress.domains.size,
  };
}
