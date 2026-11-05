import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { readEnv } from "../env";

const client = postgres(readEnv().DATABASE_URL, { max: 5 });

export const db = drizzle(client);

export function closeDb() {
  return client.end();
}
