import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { companies, searches, searchQueries } from "../db/schema";
import { createTestDb } from "../db/test-db";
import type { Filters } from "../filters";

const testDb = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("../db", () => ({
  get db() {
    return testDb.current;
  },
}));

const { runSearch } = await import("./index");
const { createSearch, saveSettings } = await import("../searches");

const filters: Filters = {
  countryId: "pakistan",
  marketId: "english",
  campaignId: "final-expense",
};

type TavilyStub = {
  creditsLeft?: number;
  searchDelayMs?: number;
  searchResponse?: (query: string, callNumber: number) => Response;
  sites?: Record<string, string>;
};

let searchesRunning = 0;
let mostSearchesRunning = 0;

function uniqueDomainResponse(query: string) {
  const slug = query.toLowerCase().replace(/[^a-z]+/g, "");
  return Response.json({
    results: [{ url: `https://www.${slug}.com/about`, title: query }],
  });
}

function stubTavily({
  creditsLeft = 500,
  searchDelayMs = 0,
  searchResponse,
  sites = {},
}: TavilyStub = {}) {
  const queries: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (!url.startsWith("https://api.tavily.com")) {
        return sites[url]
          ? new Response(sites[url], {
              headers: { "content-type": "text/html" },
            })
          : new Response(null, { status: 404 });
      }
      if (url.endsWith("/usage")) {
        return Response.json({
          account: { plan_usage: 0, plan_limit: creditsLeft },
        });
      }
      const body = JSON.parse(String(init?.body));
      const query = `${body.query} ${body.include_domains.length > 0 ? "directories" : "web"}`;
      queries.push(query);
      const callNumber = queries.length;
      searchesRunning += 1;
      mostSearchesRunning = Math.max(mostSearchesRunning, searchesRunning);
      await new Promise((resolve) => setTimeout(resolve, searchDelayMs));
      searchesRunning -= 1;
      return (searchResponse ?? uniqueDomainResponse)(query, callNumber);
    }),
  );
  return queries;
}

async function runNewSearch(creditCap: number) {
  const { id } = await createSearch(filters, creditCap);
  await runSearch(id);
  const db = testDb.current as Awaited<ReturnType<typeof createTestDb>>;
  const [search] = await db.select().from(searches).where(eq(searches.id, id));
  return search;
}

beforeEach(async () => {
  searchesRunning = 0;
  mostSearchesRunning = 0;
  vi.stubEnv("DATABASE_URL", "postgresql://unused");
  vi.stubEnv("SEARCH_API_KEY", "tvly-test");
  testDb.current = await createTestDb();
});

describe("runSearch", () => {
  it("stops at the credit cap and stores every raw response", async () => {
    const queries = stubTavily();

    const search = await runNewSearch(3);

    expect(queries).toHaveLength(3);
    expect(search.status).toBe("stopped_budget");
    expect(search.creditsUsed).toBe(3);
    expect(search.domainsFound).toBe(3);
    expect(search.message).toContain("credit cap");

    const db = testDb.current as Awaited<ReturnType<typeof createTestDb>>;
    const rows = await db.select().from(searchQueries);
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.status === "done")).toBe(true);
    expect(rows.every((row) => row.rawResponse !== null)).toBe(true);
  });

  it("never pays twice for a query it already stored", async () => {
    const queries = stubTavily();
    await runNewSearch(3);
    expect(queries).toHaveLength(3);

    const search = await runNewSearch(0);

    expect(queries).toHaveLength(3);
    expect(search.creditsUsed).toBe(0);
    expect(search.domainsFound).toBe(3);
  });

  it("keeps stored results free after old searches are deleted", async () => {
    const queries = stubTavily();
    await runNewSearch(3);
    const db = testDb.current as Awaited<ReturnType<typeof createTestDb>>;
    await db.delete(companies);
    await db.delete(searches);

    const search = await runNewSearch(0);

    expect(queries).toHaveLength(3);
    expect(search.domainsFound).toBe(3);
  });

  it("spends only on the new queries when run again with a higher cap", async () => {
    const queries = stubTavily();
    await runNewSearch(2);

    const search = await runNewSearch(5);

    expect(queries).toHaveLength(7);
    expect(new Set(queries).size).toBe(7);
    expect(search.creditsUsed).toBe(5);
  });

  it("stops before paying when the monthly credits are gone", async () => {
    const queries = stubTavily({ creditsLeft: 0 });

    const search = await runNewSearch(100);

    expect(queries).toHaveLength(0);
    expect(search.status).toBe("stopped_budget");
    expect(search.message).toContain("monthly Tavily credits");
  });

  it("stops at the remaining monthly credits when below the cap", async () => {
    const queries = stubTavily({ creditsLeft: 2 });
    const search = await runNewSearch(100);
    expect(queries).toHaveLength(2);
    expect(search.status).toBe("stopped_budget");
  });

  it("marks an empty response and does not pay for it again", async () => {
    const queries = stubTavily({
      searchResponse: () => Response.json({ results: [] }),
    });
    await runNewSearch(1);

    const db = testDb.current as Awaited<ReturnType<typeof createTestDb>>;
    const [row] = await db.select().from(searchQueries);
    expect(row.status).toBe("empty");

    await runNewSearch(0);
    expect(queries).toHaveLength(1);
  });

  it("counts its own spending when Tavily's usage is behind", async () => {
    const queries = stubTavily({ creditsLeft: 2 });
    await runNewSearch(2);

    const search = await runNewSearch(100);

    expect(queries).toHaveLength(2);
    expect(search.creditsUsed).toBe(0);
    expect(search.message).toContain("monthly Tavily credits");
  });

  it("keeps raw job board results but not as candidates", async () => {
    stubTavily({
      searchResponse: () =>
        Response.json({
          results: [
            {
              url: "https://pk.indeed.com/job/1",
              title: "Closer at Axxon BPO",
            },
            { url: "https://zardsbpo.com", title: "Zards BPO" },
          ],
        }),
    });

    const search = await runNewSearch(1);

    expect(search.domainsFound).toBe(1);
    const db = testDb.current as Awaited<ReturnType<typeof createTestDb>>;
    const [row] = await db.select().from(searchQueries);
    expect(JSON.stringify(row.rawResponse)).toContain("Axxon BPO");
  });

  it("ranks companies from search through fetching and scoring", async () => {
    stubTavily({
      searchResponse: () =>
        Response.json({
          results: [
            { url: "https://zardsbpo.com/about", title: "Zards BPO" },
            { url: "https://www.zardsbpo.pk/", title: "Zards BPO Karachi" },
            { url: "https://cigna.com", title: "Health insurance plans" },
            { url: "https://pk.indeed.com/1", title: "Closer at Zards BPO" },
          ],
        }),
      sites: {
        "https://zardsbpo.com/":
          '<title>Zards BPO</title><a href="tel:+923001234567">Call</a><p>Final expense BPO in Karachi for US agencies. Email info@zardsbpo.com</p>',
        "https://zardsbpo.pk/": "<title>Zards BPO</title><p>Karachi</p>",
      },
    });

    const search = await runNewSearch(1);

    const db = testDb.current as Awaited<ReturnType<typeof createTestDb>>;
    const rows = await db.select().from(companies);
    expect(rows).toHaveLength(1);
    const [company] = rows;
    expect(company.name).toBe("Zards BPO");
    expect(company.domains.sort()).toEqual(["zardsbpo.com", "zardsbpo.pk"]);
    expect(company.phones).toEqual(["+923001234567"]);
    expect(company.emails).toEqual(["info@zardsbpo.com"]);
    expect(company.campaigns).toEqual(["Final expense"]);
    expect(company.fitLabel).toBe("Strong fit");
    expect(company.reasons.map((reason) => reason.label)).toContain(
      "Named on 1 other site(s)",
    );
    expect(search.domainsToFetch).toBe(2);
    expect(search.domainsFetched).toBe(2);
    expect(search.companiesFound).toBe(1);
  });

  it("runs up to 3 queries at once and spends exactly the credit cap", async () => {
    const queries = stubTavily({ searchDelayMs: 10 });

    const search = await runNewSearch(7);

    expect(mostSearchesRunning).toBe(3);
    expect(queries).toHaveLength(7);
    expect(new Set(queries).size).toBe(7);
    expect(search.creditsUsed).toBe(7);
    expect(search.status).toBe("stopped_budget");

    const db = testDb.current as Awaited<ReturnType<typeof createTestDb>>;
    const rows = await db.select().from(searchQueries);
    expect(rows.reduce((sum, row) => sum + row.creditsCharged, 0)).toBe(7);
  });

  it("spends exactly the monthly budget with parallel queries", async () => {
    const queries = stubTavily({ creditsLeft: 4, searchDelayMs: 10 });

    const search = await runNewSearch(100);

    expect(queries).toHaveLength(4);
    expect(search.creditsUsed).toBe(4);
    expect(search.message).toContain("monthly Tavily credits");
  });

  it("does not check Tavily's usage when nothing can be spent", async () => {
    const queries = stubTavily();
    await runNewSearch(0);
    const usageCalls = vi
      .mocked(fetch)
      .mock.calls.filter(([url]) => String(url).endsWith("/usage"));
    expect(usageCalls).toHaveLength(0);
    expect(queries).toHaveLength(0);
  });

  it("reads websites in parallel, within the limit, one page at a time per site", async () => {
    let running = 0;
    let mostRunning = 0;
    const runningByHost = new Map<string, number>();
    let mostRunningOnOneHost = 0;
    const domains = [
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith("/usage")) {
          return Response.json({
            account: { plan_usage: 0, plan_limit: 100 },
          });
        }
        if (url.startsWith("https://api.tavily.com")) {
          return Response.json({
            results: domains.map((name) => ({
              url: `https://${name}bpo.com/`,
              title: `${name} BPO`,
            })),
          });
        }
        const host = new URL(url).hostname;
        running += 1;
        runningByHost.set(host, (runningByHost.get(host) ?? 0) + 1);
        mostRunning = Math.max(mostRunning, running);
        mostRunningOnOneHost = Math.max(
          mostRunningOnOneHost,
          runningByHost.get(host) ?? 0,
        );
        await new Promise((resolve) => setTimeout(resolve, 20));
        running -= 1;
        runningByHost.set(host, (runningByHost.get(host) ?? 0) - 1);
        return new Response(
          '<title>Home</title><a href="/contact">Contact</a>',
          {
            headers: { "content-type": "text/html" },
          },
        );
      }),
    );
    await saveSettings({ perSearchCreditCap: 1, fetchConcurrency: 3 });

    const search = await runNewSearch(1);

    expect(search.domainsFetched).toBe(8);
    expect(mostRunning).toBe(3);
    expect(mostRunningOnOneHost).toBe(1);
  });

  it("stops cleanly when Tavily reports the plan limit", async () => {
    const queries = stubTavily({
      searchResponse: (query, callNumber) =>
        callNumber === 3
          ? new Response(null, { status: 432 })
          : uniqueDomainResponse(query),
    });

    const search = await runNewSearch(100);

    expect(search.status).toBe("stopped_budget");
    expect(search.message).toContain("monthly Tavily credits");
    expect(queries.length).toBeLessThanOrEqual(3 + 2);
    expect(search.creditsUsed).toBe(queries.length);
  });

  it("stops early when queries keep finding the same domains", async () => {
    const queries = stubTavily({
      searchResponse: () =>
        Response.json({ results: [{ url: "https://same.com" }] }),
    });

    const search = await runNewSearch(100);

    const webQueries = queries.filter((query) => query.endsWith("web"));
    expect(webQueries.length).toBeGreaterThanOrEqual(16);
    expect(webQueries.length).toBeLessThanOrEqual(16 + 2);
    expect(search.status).toBe("completed");
    expect(search.message).toContain("no new domains");
  });

  it("marks the search failed on an error and retries that query next run", async () => {
    let shouldFail = true;
    const queries = stubTavily({
      searchResponse: (query, callNumber) =>
        shouldFail && callNumber === 1
          ? new Response(null, { status: 500 })
          : uniqueDomainResponse(query),
    });

    const failed = await runNewSearch(50);
    expect(failed.status).toBe("failed");
    expect(failed.message).toBe("Tavily returned 500");
    expect(failed.creditsUsed).toBe(queries.length);
    expect(queries.length).toBeLessThanOrEqual(3);

    shouldFail = false;
    const failedQuery = queries[0];
    const countAfterFailure = queries.length;
    await runNewSearch(1);
    expect(queries[countAfterFailure]).toBe(failedQuery);

    const db = testDb.current as Awaited<ReturnType<typeof createTestDb>>;
    const rows = await db.select().from(searchQueries);
    const charged = rows.filter((row) => row.creditsCharged === 2);
    expect(charged).toHaveLength(1);
    expect(charged[0].status).toBe("done");
  });
});
