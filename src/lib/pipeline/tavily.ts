import { z } from "zod";

const SEARCH_URL = "https://api.tavily.com/search";
const USAGE_URL = "https://api.tavily.com/usage";
const REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_RETRY_SECONDS = 5;

export const tavilyResponseSchema = z.object({
  results: z.array(
    z.object({
      url: z.string(),
      title: z.string().nullish(),
      content: z.string().nullish(),
    }),
  ),
});

const usageSchema = z.object({
  account: z.object({
    plan_usage: z.number(),
    plan_limit: z.number(),
  }),
});

export type TavilyRequest = {
  query: string;
  country: string;
  includeDomains: string[];
  excludeDomains: string[];
};

export type TavilyOutcome =
  | { kind: "ok"; raw: unknown }
  | { kind: "plan_limit" }
  | { kind: "error"; message: string };

function sendSearch(apiKey: string, request: TavilyRequest) {
  return fetch(SEARCH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: request.query,
      search_depth: "basic",
      topic: "general",
      max_results: 20,
      country: request.country,
      include_domains: request.includeDomains,
      exclude_domains: request.excludeDomains,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

export async function searchTavily(
  apiKey: string,
  request: TavilyRequest,
): Promise<TavilyOutcome> {
  try {
    let response = await sendSearch(apiKey, request);

    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      const seconds =
        retryAfter === null ? DEFAULT_RETRY_SECONDS : Number(retryAfter);
      await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
      response = await sendSearch(apiKey, request);
    }

    if (response.status === 432) return { kind: "plan_limit" };
    if (!response.ok) {
      return { kind: "error", message: `Tavily returned ${response.status}` };
    }

    const raw: unknown = await response.json();
    tavilyResponseSchema.parse(raw);
    return { kind: "ok", raw };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { kind: "error", message };
  }
}

export async function getPlanUsage(apiKey: string) {
  const response = await fetch(USAGE_URL, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Tavily usage check returned ${response.status}`);
  }
  const { account } = usageSchema.parse(await response.json());
  return { planLimit: account.plan_limit, planUsage: account.plan_usage };
}
