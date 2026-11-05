import { describe, expect, it } from "vitest";
import { getProgressPercent } from "./search-status";

const search = { domainsToFetch: 80, domainsFetched: 20 };

describe("getProgressPercent", () => {
  it("shows how many websites have been read", () => {
    expect(getProgressPercent({ ...search, status: "fetching" })).toBe(25);
  });

  it("is full while scoring", () => {
    expect(getProgressPercent({ ...search, status: "scoring" })).toBe(100);
  });

  it("is unknown before websites are being read", () => {
    expect(getProgressPercent({ ...search, status: "discovering" })).toBeNull();
    expect(
      getProgressPercent({
        status: "fetching",
        domainsToFetch: 0,
        domainsFetched: 0,
      }),
    ).toBeNull();
  });
});
