import Link from "next/link";
import { notFound } from "next/navigation";
import { describeFilters } from "@/lib/filters";
import { getCompaniesPage, getSearch } from "@/lib/searches";
import { CompanyRow } from "./company-row";
import { ProgressPanel } from "./progress-panel";

function readPageNumber(value: string | string[] | undefined) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { id } = await params;
  const search = await getSearch(Number(id));
  if (!search) notFound();

  const page = readPageNumber((await searchParams).page);
  const { rows, total, pageCount } = await getCompaniesPage(search.id, page);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-slate-600 hover:underline">
          ← New search
        </Link>
        <h1 className="mt-1 text-xl font-semibold">
          {describeFilters(search)}
        </h1>
      </div>

      <ProgressPanel
        initialSearch={{
          id: search.id,
          status: search.status,
          message: search.message,
          creditCap: search.creditCap,
          creditsUsed: search.creditsUsed,
          queriesPlanned: search.queriesPlanned,
          queriesDone: search.queriesDone,
          domainsFound: search.domainsFound,
          domainsToFetch: search.domainsToFetch,
          domainsFetched: search.domainsFetched,
          companiesFound: search.companiesFound,
        }}
        filters={{
          countryId: search.countryId,
          marketId: search.marketId,
          campaignId: search.campaignId,
        }}
      />

      {total > 0 && (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">{total} companies, best fit first</h2>
            <a
              href={`/api/searches/${search.id}/export`}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
            >
              Export CSV
            </a>
          </div>

          <ul className="mt-3 space-y-3">
            {rows.map((company) => (
              <CompanyRow key={company.id} company={company} />
            ))}
          </ul>

          <nav className="mt-4 flex items-center justify-between text-sm">
            {page > 1 ? (
              <Link
                href={`/searches/${search.id}?page=${page - 1}`}
                className="font-medium hover:underline"
              >
                ← Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="text-slate-600">
              Page {page} of {pageCount}
            </span>
            {page < pageCount ? (
              <Link
                href={`/searches/${search.id}?page=${page + 1}`}
                className="font-medium hover:underline"
              >
                Next →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </section>
      )}
    </div>
  );
}
