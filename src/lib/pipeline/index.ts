import { eq } from "drizzle-orm";
import { db } from "../db";
import { companies, searches } from "../db/schema";
import { COUNTRIES, filtersSchema, type Filters } from "../filters";
import { getSettings } from "../searches";
import { buildDraft, dedupeCompanies } from "./dedupe";
import { discover, type DiscoverResult } from "./discover";
import { groupCandidatesToFetch } from "./evidence";
import type { ExtractedPage } from "./extract";
import { fetchCompanyPages } from "./fetch";
import { runWithLimit } from "./run-with-limit";
import { buildMention, scoreCompany, type ScoredCompany } from "./score";

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

async function fetchDomains(
  searchId: number,
  filters: Filters,
  domains: string[],
) {
  const country = COUNTRIES.find((item) => item.id === filters.countryId);
  if (!country) throw new Error("Unknown filter value");

  const { fetchConcurrency } = await getSettings();
  const pagesByDomain = new Map<string, ExtractedPage[]>();
  await runWithLimit(domains, fetchConcurrency, async (domain) => {
    pagesByDomain.set(domain, await fetchCompanyPages(domain, country.isoCode));
    await db
      .update(searches)
      .set({ domainsFetched: pagesByDomain.size })
      .where(eq(searches.id, searchId));
  });
  return pagesByDomain;
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
    reasons: company.reasons,
    sources: [...sourcesByUrl.values()],
  };
}

export async function runSearch(searchId: number) {
  try {
    const result = await discover(searchId);
    const [search] = await db
      .select()
      .from(searches)
      .where(eq(searches.id, searchId));
    const filters = filtersSchema.parse(search);

    const groups = groupCandidatesToFetch(result.candidates);
    await db
      .update(searches)
      .set({ status: "fetching", domainsToFetch: groups.size })
      .where(eq(searches.id, searchId));
    const pagesByDomain = await fetchDomains(searchId, filters, [
      ...groups.keys(),
    ]);

    await db
      .update(searches)
      .set({ status: "scoring" })
      .where(eq(searches.id, searchId));
    const drafts = [...groups].map(([domain, results]) =>
      buildDraft(domain, results, pagesByDomain.get(domain) ?? []),
    );
    const mentions = result.allResults.map(buildMention);
    const scored = dedupeCompanies(drafts).map((company) =>
      scoreCompany(company, filters, mentions),
    );

    if (scored.length > 0) {
      await db
        .insert(companies)
        .values(scored.map((company) => toCompanyRow(searchId, company)));
    }

    await db
      .update(searches)
      .set({
        status: isBudgetStop(result) ? "stopped_budget" : "completed",
        message: describeOutcome(result, scored.length),
        companiesFound: scored.length,
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
