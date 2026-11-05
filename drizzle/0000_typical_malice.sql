CREATE TABLE "search_queries" (
	"key" text PRIMARY KEY NOT NULL,
	"search_id" integer NOT NULL,
	"source" text NOT NULL,
	"country" text NOT NULL,
	"text" text NOT NULL,
	"status" text NOT NULL,
	"raw_response" jsonb,
	"credits_charged" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "search_queries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "searches" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "searches_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"country_id" text NOT NULL,
	"market_id" text NOT NULL,
	"campaign_id" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"message" text,
	"credit_cap" integer NOT NULL,
	"credits_used" integer DEFAULT 0 NOT NULL,
	"queries_planned" integer DEFAULT 0 NOT NULL,
	"queries_done" integer DEFAULT 0 NOT NULL,
	"domains_found" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "searches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"per_search_credit_cap" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "search_queries" ADD CONSTRAINT "search_queries_search_id_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."searches"("id") ON DELETE no action ON UPDATE no action;