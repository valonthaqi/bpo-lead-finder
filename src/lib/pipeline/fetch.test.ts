import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchedPages } from "../db/schema";
import { createTestDb } from "../db/test-db";

const testDb = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("../db", () => ({
  get db() {
    return testDb.current;
  },
}));

const { fetchCompanyPages } = await import("./fetch");

const HOME = `<title>Zards BPO</title><a href="/contact">Contact</a><a href="/private/about">About</a>`;

function htmlResponse(html: string) {
  return new Response(html, { headers: { "content-type": "text/html" } });
}

function stubSite(routes: Record<string, () => Response>) {
  const requested: { url: string; userAgent: string }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      requested.push({
        url,
        userAgent: new Headers(init?.headers).get("User-Agent") ?? "",
      });
      return routes[url]?.() ?? new Response(null, { status: 404 });
    }),
  );
  return requested;
}

beforeEach(async () => {
  vi.stubEnv("DATABASE_URL", "postgresql://unused");
  vi.stubEnv("SEARCH_API_KEY", "tvly-test");
  testDb.current = await createTestDb();
});

describe("fetchCompanyPages", () => {
  it("reads the home page and its contact links, and identifies itself", async () => {
    const requested = stubSite({
      "https://zards.com/": () => htmlResponse(HOME),
      "https://zards.com/contact": () => htmlResponse("<title>Contact</title>"),
      "https://zards.com/private/about": () =>
        htmlResponse("<title>About</title>"),
    });

    const pages = await fetchCompanyPages("zards.com", "PK");

    expect(pages.map((page) => page.title)).toEqual([
      "Zards BPO",
      "Contact",
      "About",
    ]);
    expect(requested[0].url).toBe("https://zards.com/robots.txt");
    expect(
      requested.every((r) => r.userAgent.includes("bpo-lead-finder")),
    ).toBe(true);
  });

  it("does not request a page that robots.txt disallows", async () => {
    const requested = stubSite({
      "https://zards.com/robots.txt": () =>
        new Response("User-agent: *\nDisallow: /private/"),
      "https://zards.com/": () => htmlResponse(HOME),
      "https://zards.com/contact": () => htmlResponse("<title>Contact</title>"),
    });

    const pages = await fetchCompanyPages("zards.com", "PK");

    expect(pages).toHaveLength(2);
    expect(requested.map((r) => r.url)).not.toContain(
      "https://zards.com/private/about",
    );
    const db = testDb.current as Awaited<ReturnType<typeof createTestDb>>;
    const rows = await db.select().from(fetchedPages);
    expect(rows.find((row) => row.status === "blocked")?.url).toBe(
      "https://zards.com/private/about",
    );
  });

  it("does not fetch at all when robots.txt blocks the whole site", async () => {
    const requested = stubSite({
      "https://zards.com/robots.txt": () =>
        new Response("User-agent: *\nDisallow: /"),
    });
    expect(await fetchCompanyPages("zards.com", "PK")).toEqual([]);
    expect(requested).toHaveLength(1);
  });

  it("uses stored pages instead of fetching again, including failures", async () => {
    const requested = stubSite({
      "https://zards.com/": () => htmlResponse("<title>Zards BPO</title>"),
    });
    await fetchCompanyPages("zards.com", "PK");
    const countAfterFirst = requested.length;

    const pages = await fetchCompanyPages("zards.com", "PK");

    expect(pages).toHaveLength(1);
    expect(requested).toHaveLength(countAfterFirst);

    await fetchCompanyPages("dead.com", "PK");
    const countAfterDead = requested.length;
    await fetchCompanyPages("dead.com", "PK");
    expect(requested).toHaveLength(countAfterDead);
  });

  it("tries the www address when the bare domain fails", async () => {
    stubSite({
      "https://www.zards.com/": () => htmlResponse("<title>Zards BPO</title>"),
    });
    const pages = await fetchCompanyPages("zards.com", "PK");
    expect(pages[0].url).toBe("https://www.zards.com/");
  });

  it("skips pages that aren't HTML", async () => {
    stubSite({
      "https://zards.com/": () =>
        new Response("{}", { headers: { "content-type": "application/json" } }),
    });
    expect(await fetchCompanyPages("zards.com", "PK")).toEqual([]);
  });
});
