# BPO Lead Finder

A prospecting tool for finding offshore BPO call centers that run US insurance campaigns (Medicare, ACA, final expense, life insurance).

Pick a country, a language or market, and a campaign type. The app searches multiple public sources and returns a ranked list of matching call centers with their public business contact details, what they appear to work on, where each detail came from, and a fit score with the reasons behind it. Results can be exported as CSV.

> Status: the search pipeline works from the terminal. The web interface is next.

## Run it locally

Requires Node.js 22.12 or newer, a free Supabase project and a free Tavily API key.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run check:env            # checks settings without spending search credits
npm run db:migrate
npm run dev
```

Open http://localhost:3000.

## How it works

The search pipeline is in `src/lib/pipeline/`, with one file per step:

1. **discover:** turn filters into search queries and collect candidate URLs
2. **fetch:** download pages politely and cache them
3. **extract:** pull out company details and page text
4. **normalize:** standardize domains, phone numbers and names
5. **dedupe:** merge records for the same business
6. **score:** rate each business and record the reasons

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
npm run search -- --country pakistan --campaign final-expense --cap 0   # terminal search, --cap sets the credits it may spend
```
