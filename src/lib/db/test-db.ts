import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

export async function createTestDb() {
  const pglite = new PGlite();
  const migrations = readdirSync("drizzle")
    .filter((name) => name.endsWith(".sql"))
    .sort();
  for (const file of migrations) {
    await pglite.exec(readFileSync(`drizzle/${file}`, "utf8"));
  }
  return drizzle(pglite);
}
