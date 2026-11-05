import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const DEFAULT_PER_SEARCH_CREDIT_CAP = 100;

export const settings = pgTable("settings", {
  id: integer("id").primaryKey(),
  perSearchCreditCap: integer("per_search_credit_cap").notNull(),
}).enableRLS();

export const searches = pgTable("searches", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  countryId: text("country_id").notNull(),
  marketId: text("market_id").notNull(),
  campaignId: text("campaign_id").notNull(),
  status: text("status").notNull().default("queued"),
  message: text("message"),
  creditCap: integer("credit_cap").notNull(),
  creditsUsed: integer("credits_used").notNull().default(0),
  queriesPlanned: integer("queries_planned").notNull().default(0),
  queriesDone: integer("queries_done").notNull().default(0),
  domainsFound: integer("domains_found").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}).enableRLS();

export const searchQueries = pgTable("search_queries", {
  key: text("key").primaryKey(),
  searchId: integer("search_id")
    .notNull()
    .references(() => searches.id),
  source: text("source").notNull(),
  country: text("country").notNull(),
  text: text("text").notNull(),
  status: text("status").notNull(),
  rawResponse: jsonb("raw_response"),
  creditsCharged: integer("credits_charged").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}).enableRLS();
