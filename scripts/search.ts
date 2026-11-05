import { parseArgs } from "node:util";
import { desc, eq } from "drizzle-orm";
import { closeDb, db } from "../src/lib/db";
import { companies, searches } from "../src/lib/db/schema";
import { filtersSchema } from "../src/lib/filters";
import { runSearch } from "../src/lib/pipeline";
import { createSearch } from "../src/lib/searches";

const RESULTS_TO_PRINT = 25;

async function main() {
  const { values } = parseArgs({
    options: {
      country: { type: "string" },
      market: { type: "string", default: "english" },
      campaign: { type: "string" },
      cap: { type: "string" },
    },
  });

  const filters = filtersSchema.parse({
    countryId: values.country,
    marketId: values.market,
    campaignId: values.campaign,
  });
  const creditCap = values.cap === undefined ? undefined : Number(values.cap);

  const { id } = await createSearch(filters, creditCap);
  await runSearch(id);

  const [search] = await db.select().from(searches).where(eq(searches.id, id));
  console.log(`${search.status}: ${search.message}`);

  const ranked = await db
    .select()
    .from(companies)
    .where(eq(companies.searchId, id))
    .orderBy(desc(companies.score))
    .limit(RESULTS_TO_PRINT);

  for (const company of ranked) {
    console.log(
      `\n${company.score} ${company.fitLabel}: ${company.name} (${company.domains.join(", ")})`,
    );
    console.log(`  ${company.phones.join(", ")} ${company.emails.join(", ")}`);
    for (const reason of company.reasons) {
      console.log(
        `  ${reason.points >= 0 ? "+" : ""}${reason.points} ${reason.label}`,
      );
    }
  }
}

main()
  .catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(closeDb);
