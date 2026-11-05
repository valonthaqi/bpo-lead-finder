import type { CountryCode } from "libphonenumber-js";
import robotsParser from "robots-parser";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { fetchedPages } from "../db/schema";
import { readEnv } from "../env";
import { extractPage, type ExtractedPage } from "./extract";
import { getRootDomain, normalizeDomain } from "./normalize";

const MAX_PAGES_PER_DOMAIN = 3;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_HTML_BYTES = 2_000_000;
const MIN_DELAY_MS = 1_000;
const MAX_DELAY_MS = 10_000;

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function getRobots(domain: string, userAgent: string) {
  const robotsUrl = `https://${domain}/robots.txt`;
  try {
    const response = await fetch(robotsUrl, {
      headers: { "User-Agent": userAgent },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    return robotsParser(robotsUrl, response.ok ? await response.text() : "");
  } catch {
    return robotsParser(robotsUrl, "");
  }
}

async function readHtml(url: string, domain: string, userAgent: string) {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": userAgent, Accept: "text/html" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const isHtml = response.headers.get("content-type")?.includes("html");
    const size = Number(response.headers.get("content-length") ?? 0);
    const finalDomain = normalizeDomain(response.url || url) ?? "";
    if (
      !response.ok ||
      !isHtml ||
      size > MAX_HTML_BYTES ||
      getRootDomain(finalDomain) !== domain
    ) {
      return null;
    }
    return (await response.text()).slice(0, MAX_HTML_BYTES);
  } catch {
    return null;
  }
}

async function savePage(
  url: string,
  domain: string,
  status: string,
  extracted: ExtractedPage | null,
) {
  await db
    .insert(fetchedPages)
    .values({ url, domain, status, extracted })
    .onConflictDoNothing();
}

export async function fetchCompanyPages(
  domain: string,
  countryCode: CountryCode,
): Promise<ExtractedPage[]> {
  const stored = await db
    .select()
    .from(fetchedPages)
    .where(eq(fetchedPages.domain, domain))
    .orderBy(fetchedPages.fetchedAt);
  if (stored.length > 0) {
    return stored.flatMap((row) => (row.extracted ? [row.extracted] : []));
  }

  const userAgent = readEnv().FETCH_USER_AGENT;
  const robots = await getRobots(domain, userAgent);
  const crawlDelay = (robots.getCrawlDelay(userAgent) ?? 0) * 1000;
  const delay = Math.min(Math.max(crawlDelay, MIN_DELAY_MS), MAX_DELAY_MS);

  const pages: ExtractedPage[] = [];
  const urls = [`https://${domain}/`];

  for (let index = 0; index < urls.length; index++) {
    const url = urls[index];
    if (index > 0) await wait(delay);

    if (robots.isAllowed(url, userAgent) === false) {
      await savePage(url, domain, "blocked", null);
      continue;
    }

    let html = await readHtml(url, domain, userAgent);
    let pageUrl = url;
    if (html === null && index === 0) {
      pageUrl = `https://www.${domain}/`;
      await wait(delay);
      html = await readHtml(pageUrl, domain, userAgent);
    }
    if (html === null) {
      await savePage(url, domain, "failed", null);
      continue;
    }

    const page = extractPage(html, pageUrl, countryCode);
    await savePage(pageUrl, domain, "ok", page);
    pages.push(page);
    if (index === 0) {
      urls.push(...page.contactLinks.slice(0, MAX_PAGES_PER_DOMAIN - 1));
    }
  }

  return pages;
}
