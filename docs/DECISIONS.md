# Decisions

A running log of choices and why they were made. Newest entries go at the bottom.

## 2026-11-05: Starting decisions

| Decision                                                 | Why                                                                                                         |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Next.js App Router, TypeScript strict, Tailwind          | One codebase for UI and server code, and type errors surface early.                                         |
| SQLite                                                   | No server to run, one local file, enough for a single user.                                                 |
| Zod for external data                                    | Search responses and scraped data can't be trusted to have the expected shape.                              |
| Rules-based scoring, no paid APIs                        | Free, repeatable, and every point can be explained to a reviewer.                                           |
| Social platforms only through search API results         | Direct scraping of LinkedIn, Facebook and Instagram conflicts with their terms, and the brief forbids that. |
| Company-level contact details only                       | The brief asks for public business information; employee profiles are personal data.                        |
| Pipeline in `src/lib/pipeline/`, independent of Next.js  | Can move to a background job if searches get slow, and is easy to test.                                     |
| Separate `fetch` and `extract` steps                     | `fetch` touches the network; `extract` is pure, so it can be tested with saved HTML.                        |
| Cache search responses and fetched pages in the database | Free quotas are small, and repeat runs should cost nothing.                                                 |
| Dedup on domain, E.164 phone, and fuzzy name + country   | The same business shows up differently on each source, and no single field is always present.               |

## 2026-11-05: Removed experimental options from the generated Next config

`create-next-app` enabled `cacheComponents` and `partialPrefetching`. Nothing here needs them, and they change how pages render, which is one more thing to explain. Removed; the build still passes.

## 2026-11-05: Left `npm audit` warnings in place

`npm audit` reports 8 moderate issues, all in the dev-only ESLint dependency chain (`minimatch` through `typescript-eslint`). None of it ships in the app. The suggested `--force` fix would downgrade `eslint-config-next` to an older major version, so it isn't worth applying.

## 2026-11-05: The search provider must be swappable (Google's API is closing)

The original plan assumed Google Programmable Search's free quota. Google's documentation now says the Custom Search JSON API is closed to new customers, and existing customers have until January 1, 2027 to move off it.

So `discover` will talk to a small provider interface, chosen by `SEARCH_PROVIDER` in the environment, rather than to one vendor. Which provider to use is still open.

## 2026-11-05: Drizzle for database access

Its schema is plain TypeScript and its queries read like SQL, with no separate engine or code generation step, so it's easier to explain line by line than Prisma.

## 2026-11-05: Nothing that costs money

No subscriptions, payments or cards on file. Every feature must work on a free version. This rules out any search provider that asks for a card, and a provider running out of free quota has to fail clearly rather than start charging.

## 2026-11-05: No comments in code

The code will be walked through live, so clear names and small functions carry the meaning. Reasons for choices live in this file instead.

## 2026-11-05: Finish by November 8, November 9 at the latest

The brief allows seven days, but November 9 is the last available working day. Features are cut before the deadline moves.
