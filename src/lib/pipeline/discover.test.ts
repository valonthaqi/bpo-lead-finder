import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { searches, searchQueries } from "../db/schema";
import type { Filters } from "../filters";

const testDb = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("../db", () => ({
  get db() {
    return testDb.current;
  },
}));

const { runSearch } = await import("./index");
const { createSearch } = await import("../searches");

const filters: Filters = {
  countryId: "pakistan",
  marketId: "english",
  campaignId: "final-expense",
};

type TavilyStub = {
  creditsLeft?: number;
  searchResponse?: (query: string, callNumber: number) => Response;
};

function uniqueDomainResponse(query: string) {
  const slug = query.toLowerCase().replace(/[^a-z]+/g, "");
  return Response.json({
    results: [{ url: `https://www.${slug}.com/about`, title: query }],
  });
}

function stubTavily({ creditsLeft = 500, searchResponse }: TavilyStub = {}) {
  const queries: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/usage")) {
        return Response.json({
          account: { plan_usage: 0, plan_limit: creditsLeft },
        });
      }
      const body = JSON.parse(String(init?.body));
      const query = `${body.query} ${body.include_domains.length > 0 ? "directories" : "web"}`;
      queries.push(query);
      return (searchResponse ?? uniqueDomainResponse)(query, queries.length);
    }),
  );
  return queries;
}

async function runNewSearch(creditCap: number) {
  const { id } = await createSearch(filters, creditCap);
  await runSearch(id);
  const db = testDb.current as ReturnType<typeof drizzle>;
  const [search] = await db.select().from(searches).where(eq(searches.id, id));
  return search;
}

beforeEach(async () => {
  vi.stubEnv("DATABASE_URL", "postgresql://unused");
  vi.stubEnv("SEARCH_API_KEY", "tvly-test");
  const pglite = new PGlite();
  for (const file of readdirSync("drizzle").filter((name) =>
    name.endsWith(".sql"),
  )) {
    await pglite.exec(readFileSync(`drizzle/${file}`, "utf8"));
  }
  testDb.current = drizzle(pglite);
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

    const db = testDb.current as ReturnType<typeof drizzle>;
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
    const db = testDb.current as ReturnType<typeof drizzle>;
    const [row] = await db.select().from(searchQueries);
    expect(JSON.stringify(row.rawResponse)).toContain("Axxon BPO");
  });

  it("stops cleanly when Tavily reports the plan limit", async () => {
    const queries = stubTavily({
      searchResponse: (query, callNumber) =>
        callNumber === 3
          ? new Response(null, { status: 432 })
          : uniqueDomainResponse(query),
    });

    const search = await runNewSearch(100);

    expect(queries).toHaveLength(3);
    expect(search.status).toBe("stopped_budget");
    expect(search.domainsFound).toBe(2);
  });

  it("stops early when queries keep finding the same domains", async () => {
    const queries = stubTavily({
      searchResponse: () =>
        Response.json({ results: [{ url: "https://same.com" }] }),
    });

    const search = await runNewSearch(100);

    expect(queries.filter((query) => query.endsWith("web"))).toHaveLength(16);
    expect(
      queries.filter((query) => query.endsWith("directories")),
    ).toHaveLength(2);
    expect(search.status).toBe("completed");
    expect(search.message).toContain("no new domains");
  });

  it("marks the search failed on an error and retries that query next run", async () => {
    const queries = stubTavily({
      searchResponse: (query, callNumber) =>
        callNumber === 1
          ? new Response(null, { status: 500 })
          : uniqueDomainResponse(query),
    });

    const failed = await runNewSearch(5);
    expect(failed.status).toBe("failed");
    expect(failed.message).toBe("Tavily returned 500");
    expect(failed.creditsUsed).toBe(1);

    const retried = await runNewSearch(1);
    expect(queries[1]).toBe(queries[0]);
    expect(retried.domainsFound).toBe(1);

    const db = testDb.current as ReturnType<typeof drizzle>;
    const rows = await db.select().from(searchQueries);
    expect(rows[0].creditsCharged).toBe(2);
  });
});
