import { beforeEach, describe, expect, it, vi } from "vitest";
import { searches } from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";

const testDb = vi.hoisted(() => ({ current: null as unknown }));
const runSearch = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  get db() {
    return testDb.current;
  },
}));
vi.mock("@/lib/pipeline/run-search", () => ({ runSearch }));

const { POST } = await import("./route");

const validFilters = {
  countryId: "pakistan",
  marketId: "english",
  campaignId: "final-expense",
};

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/searches", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(async () => {
  testDb.current = await createTestDb();
  runSearch.mockClear();
});

describe("POST /api/searches", () => {
  it("creates a search and starts it without waiting", async () => {
    runSearch.mockReturnValue(new Promise(() => {}));

    const response = await post(validFilters);

    expect(response.status).toBe(201);
    const { id } = await response.json();
    expect(runSearch).toHaveBeenCalledWith(id);
  });

  it("rejects invalid filters", async () => {
    const response = await post({ ...validFilters, countryId: "atlantis" });
    expect(response.status).toBe(400);
    expect(runSearch).not.toHaveBeenCalled();
  });

  it("refuses to start a second search while one is running", async () => {
    await post(validFilters);
    const response = await post(validFilters);
    expect(response.status).toBe(409);
    expect(runSearch).toHaveBeenCalledTimes(1);
    const db = testDb.current as Awaited<ReturnType<typeof createTestDb>>;
    expect(await db.select().from(searches)).toHaveLength(1);
  });
});
