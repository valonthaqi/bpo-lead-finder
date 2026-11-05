import { parseArgs } from "node:util";
import { eq } from "drizzle-orm";
import { closeDb, db } from "../src/lib/db";
import { searches } from "../src/lib/db/schema";
import { filtersSchema } from "../src/lib/filters";
import { runSearch } from "../src/lib/pipeline";
import { createSearch } from "../src/lib/searches";

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
  console.log(search);
}

main()
  .catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(closeDb);
