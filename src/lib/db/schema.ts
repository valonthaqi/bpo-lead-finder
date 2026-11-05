import type { ExtractedPage } from "../pipeline/extract";
import type { CompanySourceLink, ScoreReason } from "../pipeline/score";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const DEFAULT_SETTINGS = {
  perSearchCreditCap: 100,
  fetchConcurrency: 6,
};

export const settings = pgTable("settings", {
  id: integer("id").primaryKey(),
  perSearchCreditCap: integer("per_search_credit_cap").notNull(),
  fetchConcurrency: integer("fetch_concurrency")
    .notNull()
    .default(DEFAULT_SETTINGS.fetchConcurrency),
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
  domainsToFetch: integer("domains_to_fetch").notNull().default(0),
  domainsFetched: integer("domains_fetched").notNull().default(0),
  companiesFound: integer("companies_found").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}).enableRLS();

export const searchQueries = pgTable("search_queries", {
  key: text("key").primaryKey(),
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

export const fetchedPages = pgTable("fetched_pages", {
  url: text("url").primaryKey(),
  domain: text("domain").notNull(),
  status: text("status").notNull(),
  extracted: jsonb("extracted").$type<ExtractedPage>(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}).enableRLS();

export const companies = pgTable(
  "companies",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    searchId: integer("search_id")
      .notNull()
      .references(() => searches.id),
    name: text("name").notNull(),
    domains: jsonb("domains").$type<string[]>().notNull(),
    phones: jsonb("phones").$type<string[]>().notNull(),
    emails: jsonb("emails").$type<string[]>().notNull(),
    address: text("address"),
    socialLinks: jsonb("social_links").$type<string[]>().notNull(),
    campaigns: jsonb("campaigns").$type<string[]>().notNull(),
    score: integer("score").notNull(),
    fitLabel: text("fit_label").notNull(),
    reasons: jsonb("reasons").$type<ScoreReason[]>().notNull(),
    sources: jsonb("sources").$type<CompanySourceLink[]>().notNull(),
  },
  (table) => [index("companies_search_score").on(table.searchId, table.score)],
).enableRLS();
