import { eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { searches, searchQueries } from "../db/schema";
import { readEnv } from "../env";
import { filtersSchema } from "../filters";
import {
  isCandidateDomain,
  SEARCH_EXCLUDED_DOMAINS,
  SOURCES,
} from "../sources";
import { normalizeDomain } from "./normalize";
import {
  buildQueries,
  getCreditsRemaining,
  getStopReason,
  type StopReason,
} from "./queries";
import { getPlanUsage, searchTavily, tavilyResponseSchema } from "./tavily";

export type Candidate = {
  url: string;
  domain: string;
  title: string;
  snippet: string;
  source: string;
};

export type DiscoverResult = {
  candidates: Candidate[];
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

async function getLocalCreditsUsedThisMonth() {
  const [{ total }] = await db
    .select({
      total: sql<number>`coalesce(sum(${searchQueries.creditsCharged}), 0)::int`,
    })
    .from(searchQueries)
    .where(gte(searchQueries.createdAt, sql`date_trunc('month', now())`));
  return total;
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

  let creditsRemaining = getCreditsRemaining({
    ...(await getPlanUsage(apiKey)),
    localCreditsUsed: await getLocalCreditsUsedThisMonth(),
  });
  let creditsUsed = 0;
  let queriesDone = 0;
  let queriesWithoutNewDomains = 0;
  let stopReason: StopReason | null = null;
  const candidates: Candidate[] = [];
  const domains = new Set<string>();

  for (const query of planned) {
    let raw = storedResponses.get(query.key);

    if (raw === undefined) {
      stopReason ??= getStopReason({
        creditsUsed,
        creditCap: search.creditCap,
        creditsRemaining,
        queriesWithoutNewDomains,
      });
      if (stopReason) continue;

      await db
        .insert(searchQueries)
        .values({
          key: query.key,
          searchId,
          source: query.source,
          country: query.country,
          text: query.text,
          status: "pending",
          creditsCharged: 1,
        })
        .onConflictDoUpdate({
          target: searchQueries.key,
          set: {
            searchId,
            status: "pending",
            creditsCharged: sql`${searchQueries.creditsCharged} + 1`,
          },
        });
      creditsUsed += 1;
      creditsRemaining -= 1;

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
        await db
          .update(searches)
          .set({ creditsUsed })
          .where(eq(searches.id, searchId));
        if (outcome.kind === "plan_limit") {
          stopReason = "no_credits";
          continue;
        }
        throw new Error(outcome.message);
      }

      raw = outcome.raw;
      const { results } = tavilyResponseSchema.parse(raw);
      await db
        .update(searchQueries)
        .set({
          status: results.length > 0 ? "done" : "empty",
          rawResponse: raw,
        })
        .where(eq(searchQueries.key, query.key));
    }

    const domainCountBefore = domains.size;
    for (const result of tavilyResponseSchema.parse(raw).results) {
      const domain = normalizeDomain(result.url);
      if (!domain || !isCandidateDomain(domain)) continue;
      domains.add(domain);
      candidates.push({
        url: result.url,
        domain,
        title: result.title ?? "",
        snippet: result.content ?? "",
        source: query.source,
      });
    }
    const source = SOURCES.find((item) => item.id === query.source);
    if (source?.countsForEarlyStop) {
      queriesWithoutNewDomains =
        domains.size > domainCountBefore ? 0 : queriesWithoutNewDomains + 1;
    }
    queriesDone += 1;

    await db
      .update(searches)
      .set({ creditsUsed, queriesDone, domainsFound: domains.size })
      .where(eq(searches.id, searchId));
  }

  return { candidates, stopReason, creditsUsed, domainsFound: domains.size };
}
