import { count, desc, eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { companies, DEFAULT_SETTINGS, searches, settings } from "./db/schema";
import type { Filters } from "./filters";
import { ACTIVE_STATUSES } from "./search-status";

const SETTINGS_ROW_ID = 1;
const RECENT_SEARCH_LIMIT = 10;

export const COMPANIES_PER_PAGE = 50;

export type Settings = typeof DEFAULT_SETTINGS;

export async function getSettings(): Promise<Settings> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.id, SETTINGS_ROW_ID));
  return row ?? DEFAULT_SETTINGS;
}

export async function saveSettings(values: Settings) {
  await db
    .insert(settings)
    .values({ id: SETTINGS_ROW_ID, ...values })
    .onConflictDoUpdate({ target: settings.id, set: values });
}

export async function createSearch(filters: Filters, creditCap?: number) {
  const [search] = await db
    .insert(searches)
    .values({
      ...filters,
      creditCap: creditCap ?? (await getSettings()).perSearchCreditCap,
    })
    .returning();
  return search;
}

export async function getSearch(searchId: number) {
  const [search] = await db
    .select()
    .from(searches)
    .where(eq(searches.id, searchId));
  return search ?? null;
}

export function listRecentSearches() {
  return db
    .select()
    .from(searches)
    .orderBy(desc(searches.id))
    .limit(RECENT_SEARCH_LIMIT);
}

export async function hasActiveSearch() {
  const [{ total }] = await db
    .select({ total: count() })
    .from(searches)
    .where(inArray(searches.status, ACTIVE_STATUSES));
  return total > 0;
}

export async function markActiveSearchesInterrupted() {
  await db
    .update(searches)
    .set({
      status: "interrupted",
      message:
        "The server restarted during this search. Run it again: stored search results are reused for free.",
    })
    .where(inArray(searches.status, ACTIVE_STATUSES));
}

export async function getCompaniesPage(searchId: number, page: number) {
  const [{ total }] = await db
    .select({ total: count() })
    .from(companies)
    .where(eq(companies.searchId, searchId));
  const rows = await db
    .select()
    .from(companies)
    .where(eq(companies.searchId, searchId))
    .orderBy(desc(companies.score), companies.id)
    .limit(COMPANIES_PER_PAGE)
    .offset((page - 1) * COMPANIES_PER_PAGE);
  return { rows, total, pageCount: Math.ceil(total / COMPANIES_PER_PAGE) };
}

export function getAllCompanies(searchId: number) {
  return db
    .select()
    .from(companies)
    .where(eq(companies.searchId, searchId))
    .orderBy(desc(companies.score), companies.id);
}
