import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { searches, searchQueries } from "../db/schema";
import { readEnv } from "../env";
import { filtersSchema } from "../filters";
import {
  isCandidateDomain,
  SEARCH_EXCLUDED_DOMAINS,
  SOURCES,
} from "../sources";
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

export type DiscoverResult = {
  candidates: Candidate[];
  allResults: Candidate[];
  stopReason: StopReason | null;
  creditsUsed: number;
  domainsFound: number;
};

function buildTavilyDomains(sourceId: string) {
  const source = SOURCES.find((item) => item.id === sourceId);
  return {
    includeDomains: source?.domains ?? [],
    excludeDomains: SEARCH_EXCLUDED_DOMAINS,
  };
}

export async function discover(searchId: number): Promise<DiscoverResult> {
  const apiKey = readEnv().SEARCH_API_KEY;
  const [search] = await db
    .select()
    .from(searches)
    .where(eq(searches.id, searchId));

  const planned = buildQueries(filtersSchema.parse(search));
  await db
    .update(searches)
    .set({ status: "discovering", queriesPlanned: planned.length })
    .where(eq(searches.id, searchId));

  const storedRows = await db
    .select()
    .from(searchQueries)
    .where(
      inArray(
        searchQueries.key,
        planned.map((query) => query.key),
      ),
    );
  const storedResponses = new Map(
    storedRows
      .filter((row) => row.status === "done" || row.status === "empty")
      .map((row) => [row.key, row.rawResponse]),
  );

  const candidates: Candidate[] = [];
  const allResults: Candidate[] = [];
  const domains = new Set<string>();
  let queriesDone = 0;

  function addResponse(query: PlannedQuery, raw: unknown) {
    const domainCountBefore = domains.size;
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
      allResults.push(candidate);
      if (!isCandidateDomain(domain)) continue;
      domains.add(domain);
      candidates.push(candidate);
    }
    queriesDone += 1;
    return domains.size > domainCountBefore;
  }

  function saveProgress() {
    return db
      .update(searches)
      .set({ queriesDone, domainsFound: domains.size })
      .where(eq(searches.id, searchId));
  }

  for (const query of planned) {
    const raw = storedResponses.get(query.key);
    if (raw !== undefined) addResponse(query, raw);
  }
  await saveProgress();

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
      if (outcome.kind === "plan_limit") {
        stopReason = "no_credits";
        return;
      }
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

    const foundNewDomain = addResponse(query, outcome.raw);
    const source = SOURCES.find((item) => item.id === query.source);
    if (source?.countsForEarlyStop) {
      queriesWithoutNewDomains = foundNewDomain
        ? 0
        : queriesWithoutNewDomains + 1;
    }
    await saveProgress();
  });

  return {
    candidates,
    allResults,
    stopReason,
    creditsUsed,
    domainsFound: domains.size,
  };
}
