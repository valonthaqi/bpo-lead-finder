CREATE TABLE "companies" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "companies_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"search_id" integer NOT NULL,
	"name" text NOT NULL,
	"domains" jsonb NOT NULL,
	"phones" jsonb NOT NULL,
	"emails" jsonb NOT NULL,
	"address" text,
	"social_links" jsonb NOT NULL,
	"campaigns" jsonb NOT NULL,
	"score" integer NOT NULL,
	"fit_label" text NOT NULL,
	"reasons" jsonb NOT NULL,
	"sources" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fetched_pages" (
	"url" text PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"status" text NOT NULL,
	"extracted" jsonb,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fetched_pages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "searches" ADD COLUMN "domains_to_fetch" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "searches" ADD COLUMN "domains_fetched" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "searches" ADD COLUMN "companies_found" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_search_id_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."searches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "companies_search_score" ON "companies" USING btree ("search_id","score");