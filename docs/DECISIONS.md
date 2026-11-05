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

## 2026-11-05: Postgres on Supabase replaces SQLite

The company's preferred stack is Next.js and Postgres, and Supabase is fine with them. This replaces the earlier SQLite choice. Connections use the session pooler, because Supabase's direct connection is IPv6-only on the free plan and the transaction pooler is meant for short-lived serverless connections.

## 2026-11-05: Background job for large searches

The company expects 500 to 1000 results per search, which can't finish inside one request. A search becomes a row in a `searches` table with status and progress, a route starts it, and the UI polls. No paid queue service.

## 2026-11-05: Social platforms left out for now

The company hasn't answered whether reaching social platforms through a search API is acceptable. They're left out, and the source list stays easy to extend.

## 2026-11-05: Search credits are a hard budget

Tavily's free plan is 1,000 credits a month, with no card, no pagination and at most 20 results per query. So each search runs many query variations, every raw result is stored, the same query never runs twice, a per-search credit cap lives in settings, and a search stops with a clear message when the budget runs out.

## 2026-11-05: Dropped abstractions that weren't needed

- **Search provider interface:** there is one provider, so `discover` calls a plain Tavily client. `SEARCH_PROVIDER` is gone.
- **Source adapters:** a source is an entry in a list with domains to include or exclude. Enabling a social platform later means changing a flag.
- **A table linking searches to queries:** query plans are repeatable, so a new run rebuilds the list and finds stored results by key.
- **A monthly budget setting and local tally:** Tavily's usage endpoint reports what's actually left, including use outside this app, and status 432 is the backstop.
- **Automatic resume and heartbeat:** a search left running after a restart is marked `interrupted`, and "Run again" reuses stored queries for free.

## 2026-11-05: A credit is counted before the request is sent

Tavily's docs don't say whether a failed search is charged, so each attempt is recorded first. If the process dies mid-request, the attempt has still been counted. A query only counts as stored once a valid response is saved, so a failed one can be retried.

## 2026-11-05: One Tavily error fails the search

Anything other than a rate limit or the plan limit stops the search with a clear message, rather than spending more credits against a service that's failing. "Run again" continues from the stored queries.

## 2026-11-05: PGlite for testing the credit logic

The rules that spend credits run against real Postgres in memory with a fake Tavily, so the tests use the same SQL and migration as the app and can't spend a real credit. It's a dev-only dependency.

## 2026-11-05: First yield measurement

33 credits across "Pakistan, final expense" (23) and "Colombia, Spanish market, ACA" (10). Web queries found about 7 to 12 new domains per credit. Reading the titles by hand, about 15 of 99 Pakistan domains and 6 to 8 of 76 Colombia domains look like real call centers. The rest are job boards, scripts, news and insurers. Directory queries used 14 of the 33 credits, added 7 domains and returned nothing half the time. Follow-up changes are decided after review.

## 2026-11-05: Search changes after the first measurement

- **Three domain lists in `sources.ts`.** Noise (video, forums, documents, news, people-data sites) is excluded at Tavily, so it doesn't use up result slots. Job boards and directories are still searched, and their raw results are stored, but they aren't candidates because they aren't call centers. Filtering also runs locally, because stored responses from before a list changed still contain them.
- **Two directory queries per search, not counted towards early stop.** They can only return the same few sites, so "no new domains" says nothing about them.
- **Clearer query order.** ACA starts with "Obamacare", because the bare abbreviation pulled in unrelated results. Spanish searches start with Spanish phrases.
- **Local credit tally.** Tavily's usage endpoint still showed 0 after 33 searches while its dashboard showed 33, so it lags. Remaining credits use the larger of Tavily's usage and the local count.
- **Job board company names.** Postings name real companies, but extracting them is optional and depends on time.

## 2026-11-05: Second yield measurement

30 more credits, 63 in total, matching the local count. Reading titles by hand, Pakistan now has about 25 likely call centers among 126 candidates, and Colombia about 8 to 9 among 125. Findings:

- 9 of 28 web queries came back empty, against 0 of 19 before. This coincided with the longer exclude list, but the cause isn't confirmed. Empty responses are currently stored as done, so they would never be retried.
- Spanish-first queries did worse for Colombia: 15 credits added 1 or 2 likely call centers, because they surface consumer pages from insurers and news sites. The earlier 10 credits with English terms found about 7.
- A fixed blocklist can't keep up with new job boards. Tested offline on stored results, requiring call-center words in the title, snippet or domain reduces candidates from 126 to 75 and from 125 to 29. It lost a few real companies, and let through some pages that merely mention a call center, so it can only be a first pass.
- At this rate 100 credits would give about 40 to 70 likely call centers for Pakistan, and fewer for Colombia.

## 2026-11-05: Short exclude list confirmed

Three queries that came back empty with the 28-domain exclude list returned 19 to 20 results each with only the 3 disabled sources excluded. Noise is now filtered locally only.

## 2026-11-05: Query tuning paused until scoring is reviewed

English call center terms come first for every market, and burial and funeral terms moved lower. These orders haven't been measured yet, because no credits have been spent since the change.

## 2026-11-05: Full pipeline results

Using stored search results and no new credits:

| Search                  | Sites read | Companies | Strong | Possible | Low |
| ----------------------- | ---------- | --------- | ------ | -------- | --- |
| Pakistan, final expense | 77         | 77        | 21     | 25       | 31  |
| Colombia, Spanish, ACA  | 30         | 30        | 4      | 10       | 16  |

- About 13 of 105 sites couldn't be read. Those companies are scored from search snippets, and the reasons say so.
- Reading the names by hand, about two thirds of Pakistan's strong fits look like real offshore call centers. Most of the others look like US lead sellers or calling-software vendors, which the rules don't separate yet.
- Fetching took about 2 seconds per site, so 1,000 sites would take around 35 minutes. That supports the background job.

## 2026-11-05: Choices in the scoring design

- **Rules and disqualifiers live in `scoring-rules.ts`,** so the company's answer on disqualifiers changes data, not logic.
- **Companies are stored per search,** with their reasons and sources as columns. A separate sources table wasn't needed.
- **Only role-based emails are kept,** like `info@` or `sales@`, because a name in an address could be a person's.
- **Page text is stored, not HTML,** capped at 20 KB per page, at most 3 pages per domain, to stay well inside the free database size. The database is 13 MB so far.

## 2026-11-05: Corrections after the third measurement

- **Phone numbers.** US numbers on company sites were being read as the selected country, for example 888-766-4482 as a Pakistani number. That showed wrong details and gave US vendors points for being in the country. Numbers with no country prefix are now read as US when they are toll-free, or when the country's local numbers start with 0. Colombian mobiles stay Colombian.
- **Disqualifiers for software vendors, lead sellers and listing sites.** These are checked against page titles. Tests include real call center titles that must not be flagged.
- **Empty results aren't fully explained.** The earlier test retried three empty queries with a shorter exclude list and all three returned results, but it changed two things at once, the list and the retry. Empty results still appear with the short list. They do use a credit, because the 33 credits on the dashboard included 7 empty responses. The short list stays because it is simpler.

## 2026-11-05: Background job runs inside the server

`POST /api/searches` saves a row and starts `runSearch` without waiting, and the results page polls for progress. This needs no queue service, but it needs a long-running server, so serverless hosting would need a small separate worker that calls `runSearch(id)`. One search runs at a time, which protects the credit budget. On startup, any search still marked as running is set to `interrupted`.

## 2026-11-05: Results read directly on the server

The results page reads companies from the database in a server component and paginates with `?page=`. Only the progress panel runs in the browser, so there is less client code to explain.

## 2026-11-05: CSV cells are protected from formulas

Company names and addresses come from public websites, so a cell starting with `=`, `+`, `-` or `@` gets a leading apostrophe to stop a spreadsheet running it. Phone numbers start with `+`, so they show the apostrophe too.

## 2026-11-05: Types that work on a fresh clone

Next's generated `PageProps` and `LayoutProps` only exist after a build, which made type checking fail on a fresh clone. Pages use explicit types instead.

## 2026-11-05: Stored search results no longer belong to a search

`search_queries.search_id` was written but never read, and it stopped old searches from being deleted. Stored results are shared across searches through their query key, so the column was removed.

## 2026-11-05: Making searches faster

Measured on a 0-credit rerun with 50 stored queries and 89 websites. Before these changes, reading websites took about 174 seconds when uncached, and handling stored queries took about 10 seconds, one database round trip per query.

- **A small `runWithLimit` helper instead of a library.** It's about 20 lines. Fixed batches made every batch wait for its slowest site, while a pool starts the next site as soon as any finishes. Each website is handled by one worker, one page at a time, so a site is never hit twice at once. The limit is in Settings, from 1 to 20.
- **Stored queries are handled in one pass,** then saved once.
- **Three Tavily queries at a time.** Each takes a credit through a short transaction: take a lock, check the search cap and the monthly budget, record the credit, release. The Tavily call happens only after that, so parallel calls can't overshoot. On real Postgres, 30 racing reservations against a cap of 5 granted exactly 5. Without the lock, the same race granted all 30.
- **A parallel search can pass the early-stop point slightly.** Up to two queries already running still finish, and stay within the cap.
- **Progressive results rebuild the whole ranking** from what's known so far and replace it in one transaction, at most every 3 seconds. Preliminary and final rows use the same dedupe and scoring code. This is simple, but rewrites every row each time, which would need revisiting for much larger result lists.
- **Tavily's usage endpoint is skipped when nothing can be spent,** because it allows only 10 calls per 10 minutes.

## 2026-11-05: Text is cleaned where it enters the app or gets cut

A saved search failed with `invalid input syntax for type json`. Evidence quotes are cut at fixed positions, and a cut through an emoji leaves half of it, which Postgres `jsonb` rejects. One bad row rolled back the whole save. `cleanText` now removes half-emoji and null characters when evidence or page text is cut, and when a Tavily response is parsed, so a paid result can't fail to save for this reason.

Failed searches now store the database's own message instead of the full query text, and the complete error goes to the terminal.

## 2026-11-05: Country lists don't count as a location

Any site with a phone country dropdown or country picker was earning "names the selected country". A mention now counts only if the text around it has fewer than 6 country names and fewer than 3 `Name +code` pairs, and later mentions on the page are still checked. Across stored searches this removed 19 of 123 country reasons. The cost is that large companies whose real location menu lists many countries also lose these points, which seems the better error to make for finding offshore partners.

## 2026-11-05: Search button disabled until the page is ready

Clicking before the page's JavaScript runs used to reload the page with the filters in the URL and start nothing. The button is now sent disabled from the server and enabled once JavaScript takes over. `useSyncExternalStore` is used because it takes a separate server value, without setting state in an effect.

## 2026-11-05: Simplified for reading, with no change in behaviour

Long functions were split into named steps, so each can be read on its own, and duplicate lookups, an alias, an unused field and a function-returning-a-function were removed. The terminal search script was deleted because the app does the same job.

Behaviour was checked after every commit by running the real pipeline with no credits across 3 stored searches and comparing all 266 companies with a baseline, including scores, reasons and evidence. Because those runs read cached pages, extraction was also compared old against new on 44 real pages, and 6 sites were read for real.

Left as they are, because they're short and each has a clear reason: `useSyncExternalStore` on the search button, `globalThis` in `db/index.ts`, the advisory lock, `Intl.DisplayNames` for country names, and `cleanText`.

## 2026-11-06: Interface redesign with shadcn/ui

shadcn/ui copies its components into `src/components/ui`, so there is no hosted service and the code stays in the repo. Only the components in use were added.

- **Native dropdowns for filters.** The form reads values with `FormData`, and native controls work well on phones.
- **Dark mode follows the system setting,** in CSS only. A manual toggle would need more code and client state.
- **A table with an expandable row replaced the cards.** Open rows keep their state during live refreshes because each row is keyed by its domain.
- **On phones the fit moves under the company name,** and the detail columns move into the expandable panel, so nothing scrolls sideways.
- **The progress bar shows websites read.** During the search stage the total depends on the credit cap and early stop, so it shows an animated placeholder instead of a misleading percentage.

Only the interface changed. No pipeline, database, filter, CSV or route file was touched, and all 266 companies in the baseline comparison stayed identical.
