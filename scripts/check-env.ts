import postgres from "postgres";
import { readEnv } from "../src/lib/env";

async function main() {
  const env = readEnv();
  const { hostname, port } = new URL(env.DATABASE_URL);
  console.log(`DATABASE_URL read: ${hostname}:${port}`);
  console.log("SEARCH_API_KEY read: format is valid, Tavily was not called");

  const client = postgres(env.DATABASE_URL, { max: 1 });
  await client`select 1`;
  await client.end();
  console.log("Database connection works");
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
