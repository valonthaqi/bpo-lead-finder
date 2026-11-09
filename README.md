# BPO Lead Finder

A prospecting tool for finding offshore BPO call centers that run US insurance campaigns (Medicare, ACA, final expense, life insurance).

Pick a country, a language or market, and a campaign type. The app searches multiple public sources and returns a ranked list of matching call centers with their public business contact details, what they appear to work on, where each detail came from, and a fit score with the reasons behind it. Results can be exported as CSV.

## Run it locally

Requires Node.js 22.12 or newer, a free Supabase project and a free Tavily API key.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run check:env            # checks settings without spending search credits
npm run db:migrate           # creates the database tables
npm run dev
```

Open http://localhost:3000.

## Accounts

There's no public signup. In Supabase, switch off **Authentication → Sign In / Providers → Allow new users to sign up**, add your own account under **Authentication → Users → Add user** (tick **Auto Confirm User**), then make it the owner:

```bash
npm run users:make-owner -- you@example.com
```

- **Owner:** one account. Sees everyone and every search, and manages all roles. Nobody can change or remove the owner.
- **Admin:** adds people on the Users page, and manages only the people they added.
- **User:** runs searches and exports results.

Everyone sees only their own searches, except the owner, who sees all of them. Everyone can change their password on the Account page.

## Deploy

Searches run in the background inside the server process, so the app needs an always-running Node host. Serverless hosts stop the process after each response. `render.yaml` describes a free [Render](https://render.com) web service:

1. In Render, choose **New → Blueprint** and connect this GitHub repository.
2. Enter the settings from `.env.example` when Render asks for them. `NEXT_PUBLIC_` settings are needed at build time, so set them before the first deploy.
3. Every push to `main` deploys again.

The free plan sleeps after 15 minutes without visitors and takes about a minute to wake. A search cut off by a restart or by sleeping shows "Run again", which reuses stored results for free.

## How it works

The search pipeline is in `src/lib/pipeline/`, with one file per step:

1. **discover:** turn filters into search queries and collect candidate URLs
2. **fetch:** download pages politely and cache them
3. **extract:** pull out company details and page text
4. **normalize:** standardize domains, phone numbers and names
5. **dedupe:** merge records for the same business
6. **score:** rate each business and record the reasons

A search runs as a background job inside the server. The results page shows its progress, and one search runs at a time. If the server restarts during a search, that search is marked as interrupted, and "Run again" reuses stored results for free.

## Search credits

Tavily's free plan gives 1,000 credits a month. Each new query uses one. The same query never pays twice, the credit cap per search is in Settings, and a search stops with a clear message when a limit is reached.

## Data rules

The app collects public, company-level business information only, with no personal employee profiles. LinkedIn, Facebook and Instagram are currently left out and are never scraped directly. Other sites are fetched with robots.txt respected, rate limits applied and an honest User-Agent.

## Other commands

```bash
npm run build       # production build
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm run format      # Prettier
npm test            # unit tests
npm run check       # all checks and the build, stops at the first failure
```
