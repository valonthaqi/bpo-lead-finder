import { eq } from "drizzle-orm";
import { db } from "../db";
import { companies, searches } from "../db/schema";
import { COUNTRIES, filtersSchema } from "../filters";
import { getSettings } from "../searches";
import { buildDraft, dedupeCompanies } from "./dedupe";
import { discover, type DiscoverResult, type FoundResults } from "./discover";
import { groupCandidatesToFetch } from "./evidence";
import type { ExtractedPage } from "./extract";
import { fetchCompanyPages } from "./fetch";
import { runWithLimit } from "./run-with-limit";
import { buildMention, scoreCompany, type ScoredCompany } from "./score";

const RANKING_SAVE_INTERVAL_MS = 3_000;

export function describeOutcome(result: DiscoverResult, companyCount: number) {
  const found = `${companyCount} companies ranked from ${result.domainsFound} candidate domains, using ${result.creditsUsed} new credits.`;
  switch (result.stopReason) {
    case "credit_cap":
      return `Stopped at this search's credit cap: ${found}`;
    case "no_credits":
      return `Stopped because the monthly Tavily credits ran out: ${found}`;
    case "no_new_domains":
      return `Stopped early to save credits because recent queries found no new domains: ${found}`;
    case null:
      return `All planned queries ran: ${found}`;
  }
}

function isBudgetStop(result: DiscoverResult) {
  return (
    result.stopReason === "credit_cap" || result.stopReason === "no_credits"
  );
}

function toCompanyRow(searchId: number, company: ScoredCompany) {
  const sourcesByUrl = new Map(company.sources.map((link) => [link.url, link]));
  return {
    searchId,
    name: company.name,
    domains: company.domains,
    phones: company.phones,
    emails: company.emails,
    address: company.address,
    socialLinks: company.socialLinks,
    campaigns: company.campaigns,
    score: company.score,
    fitLabel: company.fitLabel,
    isPreliminary: company.isPreliminary,
    reasons: company.reasons,
    sources: [...sourcesByUrl.values()],
  };
}

function atMostEveryFewSeconds(action: () => Promise<void>) {
  let lastRunAt = 0;
  let isRunning = false;
  return async () => {
    if (isRunning || Date.now() - lastRunAt < RANKING_SAVE_INTERVAL_MS) return;
    isRunning = true;
    try {
      await action();
    } finally {
      isRunning = false;
      lastRunAt = Date.now();
    }
  };
}

export async function runSearch(searchId: number) {
  try {
    const [search] = await db
      .select()
      .from(searches)
      .where(eq(searches.id, searchId));
    const filters = filtersSchema.parse(search);
    const country = COUNTRIES.find((item) => item.id === filters.countryId);
    if (!country) throw new Error("Unknown filter value");

    let found: FoundResults = { candidates: [], allResults: [] };
    const pagesByDomain = new Map<string, ExtractedPage[]>();

    async function saveRanking() {
      const groups = groupCandidatesToFetch(found.candidates);
      const drafts = [...groups].map(([domain, results]) =>
        buildDraft(domain, results, pagesByDomain.get(domain)),
      );
      const mentions = found.allResults.map(buildMention);
      const ranking = dedupeCompanies(drafts).map((company) =>
        scoreCompany(company, filters, mentions),
      );

      await db.transaction(async (tx) => {
        await tx.delete(companies).where(eq(companies.searchId, searchId));
        if (ranking.length > 0) {
          await tx
            .insert(companies)
            .values(ranking.map((company) => toCompanyRow(searchId, company)));
        }
        await tx
          .update(searches)
          .set({
            companiesFound: ranking.length,
            domainsToFetch: groups.size,
            domainsFetched: pagesByDomain.size,
          })
          .where(eq(searches.id, searchId));
      });
      return ranking.length;
    }

    const saveRankingSoon = atMostEveryFewSeconds(async () => {
      await saveRanking();
    });

    const result = await discover(searchId, async (latest) => {
      found = latest;
      await saveRankingSoon();
    });
    found = result;

    await db
      .update(searches)
      .set({ status: "fetching" })
      .where(eq(searches.id, searchId));
    await saveRanking();

    const domains = [...groupCandidatesToFetch(found.candidates).keys()];
    const { fetchConcurrency } = await getSettings();
    await runWithLimit(domains, fetchConcurrency, async (domain) => {
      pagesByDomain.set(
        domain,
        await fetchCompanyPages(domain, country.isoCode),
      );
      await saveRankingSoon();
    });

    await db
      .update(searches)
      .set({ status: "scoring" })
      .where(eq(searches.id, searchId));
    const companyCount = await saveRanking();

    await db
      .update(searches)
      .set({
        status: isBudgetStop(result) ? "stopped_budget" : "completed",
        message: describeOutcome(result, companyCount),
      })
      .where(eq(searches.id, searchId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await db
      .update(searches)
      .set({ status: "failed", message })
      .where(eq(searches.id, searchId));
  }
}
