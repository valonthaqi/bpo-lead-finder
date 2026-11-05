import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .string({ error: "DATABASE_URL is missing" })
    .regex(/^postgres(ql)?:\/\//, "DATABASE_URL must be a Postgres URL"),
  SEARCH_API_KEY: z
    .string({ error: "SEARCH_API_KEY is missing" })
    .startsWith("tvly-", "SEARCH_API_KEY must start with tvly-"),
  FETCH_USER_AGENT: z.string().default("bpo-lead-finder/0.1"),
});

export function readEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => issue.message);
    throw new Error(problems.join(". "));
  }
  return result.data;
}
