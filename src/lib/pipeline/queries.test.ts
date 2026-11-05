import { describe, expect, it } from "vitest";
import { buildQueries, buildQueryKey, getStopReason } from "./queries";

const filters = {
  countryId: "pakistan",
  marketId: "english",
  campaignId: "final-expense",
} as const;

describe("buildQueryKey", () => {
  it("treats case and spacing differences as the same query", () => {
    expect(buildQueryKey("web", "pakistan", "  Final   Expense BPO ")).toBe(
      buildQueryKey("web", "pakistan", "final expense bpo"),
    );
  });

  it("keeps the same text on different sources separate", () => {
    expect(buildQueryKey("web", "pakistan", "bpo")).not.toBe(
      buildQueryKey("directories", "pakistan", "bpo"),
    );
  });
});

describe("buildQueries", () => {
  it("starts with the broadest combination", () => {
    expect(buildQueries(filters)[0].text).toBe(
      "final expense call center Pakistan",
    );
  });

  it("never plans the same query twice", () => {
    const keys = buildQueries(filters).map((query) => query.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("plans every web combination plus the capped directory queries", () => {
    const queries = buildQueries(filters);
    const web = queries.filter((query) => query.source === "web");
    const directories = queries.filter(
      (query) => query.source === "directories",
    );
    expect(web).toHaveLength(4 * 8 * 6);
    expect(directories).toHaveLength(12);
  });

  it("does not plan queries for disabled sources", () => {
    const sources = buildQueries(filters).map((query) => query.source);
    expect(sources).not.toContain("linkedin");
  });

  it("is repeatable, so a new run finds its stored queries", () => {
    expect(buildQueries(filters)).toEqual(buildQueries(filters));
  });

  it("rejects an unknown filter value", () => {
    expect(() =>
      buildQueries({ ...filters, countryId: "atlantis" as "pakistan" }),
    ).toThrow("Unknown filter value");
  });
});

describe("getStopReason", () => {
  const running = {
    creditsUsed: 5,
    creditCap: 100,
    creditsRemaining: 500,
    queriesWithoutNewDomains: 0,
  };

  it("keeps going while within every limit", () => {
    expect(getStopReason(running)).toBeNull();
  });

  it("stops at the per-search credit cap", () => {
    expect(getStopReason({ ...running, creditsUsed: 100 })).toBe("credit_cap");
  });

  it("stops when the monthly credits are gone", () => {
    expect(getStopReason({ ...running, creditsRemaining: 0 })).toBe(
      "no_credits",
    );
  });

  it("stops when queries stop finding new domains", () => {
    expect(getStopReason({ ...running, queriesWithoutNewDomains: 15 })).toBe(
      "no_new_domains",
    );
  });
});
