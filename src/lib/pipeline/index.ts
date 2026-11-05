import { eq } from "drizzle-orm";
import { db } from "../db";
import { searches } from "../db/schema";
import { discover, type DiscoverResult } from "./discover";

export function describeOutcome(result: DiscoverResult) {
  const found = `${result.domainsFound} domains found using ${result.creditsUsed} new credits.`;
  switch (result.stopReason) {
    case "credit_cap":
      return `Stopped at this search's credit cap: ${found}`;
    case "no_credits":
      return `Stopped because the monthly Tavily credits ran out: ${found}`;
    case "no_new_domains":
      return `Stopped early to save credits because recent queries found no new domains: ${found}`;
    case null:
      return `All planned queries ran: ${found}`;
  }
}

function isBudgetStop(result: DiscoverResult) {
  return (
    result.stopReason === "credit_cap" || result.stopReason === "no_credits"
  );
}

export async function runSearch(searchId: number) {
  try {
    const result = await discover(searchId);
    await db
      .update(searches)
      .set({
        status: isBudgetStop(result) ? "stopped_budget" : "completed",
        message: describeOutcome(result),
      })
      .where(eq(searches.id, searchId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await db
      .update(searches)
      .set({ status: "failed", message })
      .where(eq(searches.id, searchId));
  }
}
