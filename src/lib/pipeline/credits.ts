import { eq, gte, sql } from "drizzle-orm";
import { db } from "../db";
import { searches, searchQueries } from "../db/schema";
import type { PlannedQuery } from "./queries";

const CREDIT_LOCK_ID = 1;

export type StopReason = "credit_cap" | "no_credits" | "no_new_domains";

export function getCreditsRemaining(credits: {
  planLimit: number;
  planUsage: number;
  localCreditsUsed: number;
}) {
  return (
    credits.planLimit - Math.max(credits.planUsage, credits.localCreditsUsed)
  );
}

export function getBudgetStopReason(state: {
  creditsUsed: number;
  creditCap: number;
  creditsRemaining: number;
}): StopReason | null {
  if (state.creditsUsed >= state.creditCap) return "credit_cap";
  if (state.creditsRemaining <= 0) return "no_credits";
  return null;
}

export async function reserveCredit(
  searchId: number,
  query: PlannedQuery,
  plan: { planLimit: number; planUsage: number },
): Promise<StopReason | null> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${CREDIT_LOCK_ID})`);

    const [search] = await tx
      .select()
      .from(searches)
      .where(eq(searches.id, searchId));
    const [{ localCreditsUsed }] = await tx
      .select({
        localCreditsUsed: sql<number>`coalesce(sum(${searchQueries.creditsCharged}), 0)::int`,
      })
      .from(searchQueries)
      .where(gte(searchQueries.createdAt, sql`date_trunc('month', now())`));

    const stopReason = getBudgetStopReason({
      creditsUsed: search.creditsUsed,
      creditCap: search.creditCap,
      creditsRemaining: getCreditsRemaining({
        planLimit: plan.planLimit,
        planUsage: plan.planUsage + search.creditsUsed,
        localCreditsUsed,
      }),
    });
    if (stopReason) return stopReason;

    await tx
      .insert(searchQueries)
      .values({ ...query, status: "pending", creditsCharged: 1 })
      .onConflictDoUpdate({
        target: searchQueries.key,
        set: {
          status: "pending",
          creditsCharged: sql`${searchQueries.creditsCharged} + 1`,
        },
      });
    await tx
      .update(searches)
      .set({ creditsUsed: sql`${searches.creditsUsed} + 1` })
      .where(eq(searches.id, searchId));
    return null;
  });
}
