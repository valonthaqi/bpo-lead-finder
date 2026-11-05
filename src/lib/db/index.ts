import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const globalForDb = globalThis as unknown as {
  dbClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.dbClient ?? postgres(process.env.DATABASE_URL ?? "", { max: 5 });
globalForDb.dbClient = client;

export const db = drizzle(client);
