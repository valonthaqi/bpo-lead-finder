import { afterEach, describe, expect, it, vi } from "vitest";
import { getRemainingCredits, searchTavily } from "./tavily";

const request = {
  query: "final expense call center Pakistan",
  country: "pakistan",
  includeDomains: [],
  excludeDomains: ["linkedin.com"],
};

function stubFetch(...responses: Response[]) {
  const fetchMock = vi.fn();
  responses.forEach((response) => fetchMock.mockResolvedValueOnce(response));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("searchTavily", () => {
  it("returns the raw response and sends basic search settings", async () => {
    const body = { results: [{ url: "https://a.com", extra: "kept" }] };
    const fetchMock = stubFetch(Response.json(body));

    const outcome = await searchTavily("key", request);

    expect(outcome).toEqual({ kind: "ok", raw: body });
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.search_depth).toBe("basic");
    expect(sent.max_results).toBe(20);
    expect(sent.exclude_domains).toEqual(["linkedin.com"]);
    expect(sent.include_answer).toBeUndefined();
  });

  it("reports the plan limit on status 432", async () => {
    stubFetch(new Response(null, { status: 432 }));
    expect(await searchTavily("key", request)).toEqual({ kind: "plan_limit" });
  });

  it("retries once after a rate limit", async () => {
    const fetchMock = stubFetch(
      new Response(null, { status: 429, headers: { "Retry-After": "0" } }),
      Response.json({ results: [] }),
    );

    const outcome = await searchTavily("key", request);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(outcome.kind).toBe("ok");
  });

  it("reports other failures as errors", async () => {
    stubFetch(new Response(null, { status: 500 }));
    expect(await searchTavily("key", request)).toEqual({
      kind: "error",
      message: "Tavily returned 500",
    });
  });

  it("reports a response with the wrong shape as an error", async () => {
    stubFetch(Response.json({ unexpected: true }));
    const outcome = await searchTavily("key", request);
    expect(outcome.kind).toBe("error");
  });
});

describe("getRemainingCredits", () => {
  it("subtracts plan usage from the plan limit", async () => {
    stubFetch(
      Response.json({ account: { plan_usage: 150, plan_limit: 1000 } }),
    );
    expect(await getRemainingCredits("key")).toBe(850);
  });

  it("throws when the check fails", async () => {
    stubFetch(new Response(null, { status: 401 }));
    await expect(getRemainingCredits("key")).rejects.toThrow("401");
  });
});
