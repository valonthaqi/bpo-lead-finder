import { eq } from "drizzle-orm";
import { db } from "./db";
import { DEFAULT_PER_SEARCH_CREDIT_CAP, searches, settings } from "./db/schema";
import type { Filters } from "./filters";

const SETTINGS_ROW_ID = 1;

export async function getPerSearchCreditCap() {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.id, SETTINGS_ROW_ID));
  return row?.perSearchCreditCap ?? DEFAULT_PER_SEARCH_CREDIT_CAP;
}

export async function setPerSearchCreditCap(perSearchCreditCap: number) {
  await db
    .insert(settings)
    .values({ id: SETTINGS_ROW_ID, perSearchCreditCap })
    .onConflictDoUpdate({ target: settings.id, set: { perSearchCreditCap } });
}

export async function createSearch(filters: Filters, creditCap?: number) {
  const [search] = await db
    .insert(searches)
    .values({
      ...filters,
      creditCap: creditCap ?? (await getPerSearchCreditCap()),
    })
    .returning();
  return search;
}
