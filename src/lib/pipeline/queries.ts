import { getFilterOptions, type Filters } from "../filters";
import { SOURCES } from "../sources";

export const MAX_QUERIES_WITHOUT_NEW_DOMAINS = 15;

export type PlannedQuery = {
  key: string;
  source: string;
  country: string;
  text: string;
};

export type StopReason = "credit_cap" | "no_credits" | "no_new_domains";

export function buildQueryKey(source: string, country: string, text: string) {
  const normalizedText = text.trim().toLowerCase().replace(/\s+/g, " ");
  return [source, country, normalizedText].join("|");
}

export function buildQueries(filters: Filters): PlannedQuery[] {
  const { country, market, campaign } = getFilterOptions(filters);

  const tavilyCountry = country.name.toLowerCase();
  const locations = [country.name, ...country.cities];

  const combinations: { rank: number; text: string }[] = [];
  campaign.searchTerms.forEach((term, termIndex) => {
    market.servicePhrases.forEach((phrase, phraseIndex) => {
      locations.forEach((location, locationIndex) => {
        combinations.push({
          rank: termIndex + phraseIndex + locationIndex,
          text: `${term} ${phrase} ${location}`,
        });
      });
    });
  });
  combinations.sort((a, b) => a.rank - b.rank);

  const ranked: (PlannedQuery & { rank: number })[] = [];
  for (const source of SOURCES.filter((item) => item.enabled)) {
    for (const { rank, text } of combinations.slice(0, source.maxQueries)) {
      ranked.push({
        rank,
        key: buildQueryKey(source.id, tavilyCountry, text),
        source: source.id,
        country: tavilyCountry,
        text,
      });
    }
  }
  ranked.sort((a, b) => a.rank - b.rank);

  return ranked.map(({ key, source, country, text }) => ({
    key,
    source,
    country,
    text,
  }));
}

export function getCreditsRemaining(credits: {
  planLimit: number;
  planUsage: number;
  localCreditsUsed: number;
}) {
  return (
    credits.planLimit - Math.max(credits.planUsage, credits.localCreditsUsed)
  );
}

export function getBudgetStopReason(state: {
  creditsUsed: number;
  creditCap: number;
  creditsRemaining: number;
}): StopReason | null {
  if (state.creditsUsed >= state.creditCap) return "credit_cap";
  if (state.creditsRemaining <= 0) return "no_credits";
  return null;
}
