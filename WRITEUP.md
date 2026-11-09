# BPO Lead Finder: write-up

## 1. Sources and limits

I search with Tavily's free API. It finds company websites and four directories: Clutch, GoodFirms, Sortlist and Outsource Accelerator. For each company I read the home page and up to two contact or about pages. I follow robots.txt, wait 1 to 10 seconds between pages, and send an honest User-Agent.

I left out LinkedIn, Facebook and Instagram. Their terms don't allow scraping and they have no free API for this. They're in `sources.ts`, switched off, ready if you approve them.

What limited me:

- My first plan was Google's Custom Search API, but it's closed to new customers.
- Tavily's free plan gives 1,000 credits a month and 20 results per query. So I cache every query and result, cap credits per search, and stop after 15 queries in a row that find nothing new.
- Tavily's usage numbers lagged behind its dashboard, so the app counts credits itself.
- A search returns fewer than the 500 to 1,000 results as I hoped for.

## 2. Duplicates and real fit

**Duplicates.** I group results by root domain and keep only groups that mention call-center words. Then I merge companies that share a domain or a phone number, or whose names overlap by 80% or more once accents, punctuation and words like "Ltd" are removed.

**Fit.** Scoring is plain rules in `scoring-rules.ts`. Every point shows the quote and link it came from, so you can check why a company scored what it did.

- Campaign (Medicare, ACA...) on their own site: +30, or +15 if only in a search snippet
- Calls itself a call center or BPO: +20 (+10 snippet only)
- US clients, the right country or city, a local phone number: +10 each
- Bilingual agents +10, English-speaking +5
- Licensed agents, inbound/outbound, live transfers: +5 each
- Mentioned on other sites: +5 each, up to +10

Penalties remove things that look right but aren't: software vendors and directories (−50), lead sellers, job posts and unrelated businesses (−40), insurers (−30). Scores stay between 0 and 100. 60+ is a strong fit, 35+ a possible fit.

## 3. With another month

- Sit with your team, label a few hundred results, and tune the weights on real data.
- Add social sources once approved.
- Find company names hidden in job posts and directory listings.
- Run searches as background jobs with retries.
- Let users mark leads as contacted or rejected, and feed that back into scoring.

## 4. Where AI helped and where it got things wrong

I built this with Claude Code.

**Helped:**

- It found that Google's Custom Search API was closing before I built on it (`999402b`).
- It tested my credit limits against an in-memory database, including many searches racing for the same budget, without spending real credits (`63ca039`, `2e299a9`).
- It caught setup mistakes, like an ignore rule that hid `.env.example` (`89a768e`, `1e554f4`).

**Got wrong:**

- It pushed code after a failing check. I made the script stop on any failure (`61a63ee`).
- It read US phone numbers as Pakistani. The tests passed, and I only caught it in real output (`5364efd`).
- Its first rules rated lead sellers and software vendors as strong fits, and treated a phone-country dropdown as a location (`4f06231`, `0c5dccc`).

The lesson: AI is fast at building, but I had to check real results myself.
