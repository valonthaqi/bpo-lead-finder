import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { companies, searches } from "./db/schema";
import { createTestDb } from "./db/test-db";
import type { Filters } from "./filters";

const testDb = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("./db", () => ({
  get db() {
    return testDb.current;
  },
}));

const {
  COMPANIES_PER_PAGE,
  createSearch,
  getCompaniesPage,
  getSettings,
  getSearch,
  hasActiveSearch,
  markActiveSearchesInterrupted,
  saveSettings,
} = await import("./searches");

const filters: Filters = {
  countryId: "pakistan",
  marketId: "english",
  campaignId: "final-expense",
};

function database() {
  return testDb.current as Awaited<ReturnType<typeof createTestDb>>;
}

beforeEach(async () => {
  testDb.current = await createTestDb();
});

describe("settings", () => {
  it("start at the defaults and can be changed", async () => {
    expect(await getSettings()).toEqual({
      perSearchCreditCap: 100,
      fetchConcurrency: 6,
    });
    await saveSettings({ perSearchCreditCap: 40, fetchConcurrency: 4 });
    await saveSettings({ perSearchCreditCap: 25, fetchConcurrency: 8 });
    expect(await getSettings()).toMatchObject({
      perSearchCreditCap: 25,
      fetchConcurrency: 8,
    });
  });

  it("is copied onto new searches, unless a cap is given", async () => {
    await saveSettings({ perSearchCreditCap: 25, fetchConcurrency: 6 });
    expect((await createSearch(filters)).creditCap).toBe(25);
    expect((await createSearch(filters, 3)).creditCap).toBe(3);
  });
});

describe("markActiveSearchesInterrupted", () => {
  it("marks only searches that were still running", async () => {
    const running = await createSearch(filters, 1);
    const finished = await createSearch(filters, 1);
    await database()
      .update(searches)
      .set({ status: "completed", message: "Done" })
      .where(eqId(finished.id));

    expect(await hasActiveSearch()).toBe(true);
    await markActiveSearchesInterrupted();

    expect((await getSearch(running.id))?.status).toBe("interrupted");
    expect((await getSearch(finished.id))?.status).toBe("completed");
    expect((await getSearch(finished.id))?.message).toBe("Done");
    expect(await hasActiveSearch()).toBe(false);
  });
});

describe("getCompaniesPage", () => {
  it("sorts by score and splits into pages", async () => {
    const { id } = await createSearch(filters, 1);
    const rows = Array.from({ length: COMPANIES_PER_PAGE + 2 }, (_, index) => ({
      searchId: id,
      name: `Company ${index}`,
      domains: [],
      phones: [],
      emails: [],
      socialLinks: [],
      campaigns: [],
      score: index,
      fitLabel: "Low fit",
      reasons: [],
      sources: [],
    }));
    await database().insert(companies).values(rows);

    const first = await getCompaniesPage(id, 1);
    expect(first.total).toBe(COMPANIES_PER_PAGE + 2);
    expect(first.pageCount).toBe(2);
    expect(first.rows).toHaveLength(COMPANIES_PER_PAGE);
    expect(first.rows[0].score).toBe(COMPANIES_PER_PAGE + 1);

    const second = await getCompaniesPage(id, 2);
    expect(second.rows.map((row) => row.score)).toEqual([1, 0]);
  });

  it("only returns companies from that search", async () => {
    const one = await createSearch(filters, 1);
    const two = await createSearch(filters, 1);
    await database().insert(companies).values({
      searchId: one.id,
      name: "Only in one",
      domains: [],
      phones: [],
      emails: [],
      socialLinks: [],
      campaigns: [],
      score: 1,
      fitLabel: "Low fit",
      reasons: [],
      sources: [],
    });
    expect((await getCompaniesPage(two.id, 1)).total).toBe(0);
  });
});

function eqId(id: number) {
  return eq(searches.id, id);
}
