export const ACTIVE_STATUSES = ["queued", "discovering", "fetching", "scoring"];

export const STATUS_LABELS: Record<string, string> = {
  queued: "Waiting to start",
  discovering: "Searching",
  fetching: "Reading company websites",
  scoring: "Scoring companies",
  completed: "Finished",
  stopped_budget: "Stopped by the credit budget",
  failed: "Failed",
  interrupted: "Interrupted by a restart",
};

export type SearchProgress = {
  id: number;
  countryId: string;
  marketId: string;
  campaignId: string;
  status: string;
  message: string | null;
  creditCap: number;
  creditsUsed: number;
  queriesPlanned: number;
  queriesDone: number;
  domainsFound: number;
  domainsToFetch: number;
  domainsFetched: number;
  companiesFound: number;
};

export function isActive(status: string) {
  return ACTIVE_STATUSES.includes(status);
}

export function getProgressPercent(search: {
  status: string;
  domainsToFetch: number;
  domainsFetched: number;
}) {
  if (search.status === "scoring") return 100;
  if (search.status === "fetching" && search.domainsToFetch > 0) {
    return Math.round((search.domainsFetched / search.domainsToFetch) * 100);
  }
  return null;
}
