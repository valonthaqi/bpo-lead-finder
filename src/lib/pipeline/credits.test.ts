import { beforeEach, describe, expect, it, vi } from "vitest";
import { searches, searchQueries } from "../db/schema";
import { createTestDb } from "../db/test-db";
import type { PlannedQuery } from "./queries";

const testDb = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("../db", () => ({
  get db() {
    return testDb.current;
  },
}));

const { getBudgetStopReason, getCreditsRemaining, reserveCredit } =
  await import("./credits");
const { createSearch } = await import("../searches");

const filters = {
  countryId: "pakistan",
  marketId: "english",
  campaignId: "medicare",
} as const;

const plenty = { planLimit: 1000, planUsage: 0 };

function database() {
  return testDb.current as Awaited<ReturnType<typeof createTestDb>>;
}

function query(number: number): PlannedQuery {
  return {
    key: `web|pakistan|query ${number}`,
    source: "web",
    country: "pakistan",
    text: `query ${number}`,
  };
}

function reserveMany(
  searchId: number,
  count: number,
  plan: { planLimit: number; planUsage: number },
) {
  return Promise.all(
    Array.from({ length: count }, (_, number) =>
      reserveCredit(searchId, query(number), plan),
    ),
  );
}

function countGranted(outcomes: (string | null)[]) {
  return outcomes.filter((outcome) => outcome === null).length;
}

beforeEach(async () => {
  testDb.current = await createTestDb();
});

describe("reserveCredit", () => {
  it("records the credit before any search could be sent", async () => {
    const { id } = await createSearch(filters, 5);

    expect(await reserveCredit(id, query(1), plenty)).toBeNull();

    const [row] = await database().select().from(searchQueries);
    expect(row.status).toBe("pending");
    expect(row.creditsCharged).toBe(1);
    const [search] = await database().select().from(searches);
    expect(search.creditsUsed).toBe(1);
  });

  it("never overshoots the search's cap when many reserve at once", async () => {
    const { id } = await createSearch(filters, 5);

    const outcomes = await reserveMany(id, 50, plenty);

    expect(countGranted(outcomes)).toBe(5);
    expect(outcomes.filter((outcome) => outcome === "credit_cap")).toHaveLength(
      45,
    );
    expect(await database().select().from(searchQueries)).toHaveLength(5);
  });

  it("never overshoots the monthly budget when many reserve at once", async () => {
    const { id } = await createSearch(filters, 100);

    const outcomes = await reserveMany(id, 50, {
      planLimit: 4,
      planUsage: 0,
    });

    expect(countGranted(outcomes)).toBe(4);
    expect(outcomes.filter((outcome) => outcome === "no_credits")).toHaveLength(
      46,
    );
  });

  it("shares the monthly budget between two searches", async () => {
    const one = await createSearch(filters, 100);
    const two = await createSearch(filters, 100);

    const outcomes = await Promise.all([
      ...Array.from({ length: 10 }, (_, number) =>
        reserveCredit(one.id, query(number), { planLimit: 6, planUsage: 0 }),
      ),
      ...Array.from({ length: 10 }, (_, number) =>
        reserveCredit(two.id, query(number + 10), {
          planLimit: 6,
          planUsage: 0,
        }),
      ),
    ]);

    expect(countGranted(outcomes)).toBe(6);
  });

  it("counts credits spent outside the app, as they run down", async () => {
    const { id } = await createSearch(filters, 100);

    const outcomes = await reserveMany(id, 10, {
      planLimit: 1000,
      planUsage: 997,
    });

    expect(countGranted(outcomes)).toBe(3);
  });

  it("counts a retry of a failed query as another credit", async () => {
    const { id } = await createSearch(filters, 5);
    await reserveCredit(id, query(1), plenty);
    await reserveCredit(id, query(1), plenty);

    const [row] = await database().select().from(searchQueries);
    expect(row.creditsCharged).toBe(2);
  });
});

describe("getCreditsRemaining", () => {
  it("uses the local tally when Tavily's usage is behind", () => {
    expect(
      getCreditsRemaining({
        planLimit: 1000,
        planUsage: 0,
        localCreditsUsed: 33,
      }),
    ).toBe(967);
  });

  it("uses Tavily's usage when credits were spent outside this app", () => {
    expect(
      getCreditsRemaining({
        planLimit: 1000,
        planUsage: 50,
        localCreditsUsed: 33,
      }),
    ).toBe(950);
  });
});

describe("getBudgetStopReason", () => {
  const running = { creditsUsed: 5, creditCap: 100, creditsRemaining: 500 };

  it("keeps going while within every limit", () => {
    expect(getBudgetStopReason(running)).toBeNull();
  });

  it("stops at the per-search credit cap", () => {
    expect(getBudgetStopReason({ ...running, creditsUsed: 100 })).toBe(
      "credit_cap",
    );
  });

  it("stops when the monthly credits are gone", () => {
    expect(getBudgetStopReason({ ...running, creditsRemaining: 0 })).toBe(
      "no_credits",
    );
  });
});
