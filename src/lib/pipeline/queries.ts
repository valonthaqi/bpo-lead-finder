import { getFilterOptions, type Filters } from "../filters";
import { SOURCES } from "../sources";

export const MAX_QUERIES_WITHOUT_NEW_DOMAINS = 15;

export type PlannedQuery = {
  key: string;
  source: string;
  country: string;
  text: string;
};

export function buildQueryKey(source: string, country: string, text: string) {
  const normalizedText = text.trim().toLowerCase().replace(/\s+/g, " ");
  return [source, country, normalizedText].join("|");
}

export function buildQueries(filters: Filters): PlannedQuery[] {
  const { country, market, campaign } = getFilterOptions(filters);
  const tavilyCountry = country.name.toLowerCase();
  const locations = [country.name, ...country.cities];

  const combinations: { rank: number; text: string }[] = [];
  for (const [termIndex, term] of campaign.searchTerms.entries()) {
    for (const [phraseIndex, phrase] of market.servicePhrases.entries()) {
      for (const [locationIndex, location] of locations.entries()) {
        combinations.push({
          rank: termIndex + phraseIndex + locationIndex,
          text: `${term} ${phrase} ${location}`,
        });
      }
    }
  }
  combinations.sort((a, b) => a.rank - b.rank);

  const planned: { rank: number; query: PlannedQuery }[] = [];
  for (const source of SOURCES.filter((item) => item.enabled)) {
    for (const { rank, text } of combinations.slice(0, source.maxQueries)) {
      const key = buildQueryKey(source.id, tavilyCountry, text);
      const query = { key, source: source.id, country: tavilyCountry, text };
      planned.push({ rank, query });
    }
  }
  planned.sort((a, b) => a.rank - b.rank);

  return planned.map(({ query }) => query);
}
