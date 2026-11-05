# BPO Lead Finder

A prospecting tool for finding offshore BPO call centers that run US insurance campaigns (Medicare, ACA, final expense, life insurance).

Pick a country, a language or market, and a campaign type. The app searches multiple public sources and returns a ranked list of matching call centers with their public business contact details, what they appear to work on, where each detail came from, and a fit score with the reasons behind it. Results can be exported as CSV.

> Status: early development. The project is set up; the search pipeline isn't built yet.

## Run it locally

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local   # then fill in the values
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

The app collects public, company-level business information only, with no personal employee profiles. LinkedIn, Facebook and Instagram are never scraped directly; their public company pages are reached only through search API results. Other sites are fetched with robots.txt respected, rate limits applied and an honest User-Agent.

## Other commands

```bash
npm run build       # production build
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm run format      # Prettier
```
