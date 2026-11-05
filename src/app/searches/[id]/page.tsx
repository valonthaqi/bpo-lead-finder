import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { describeFilters } from "@/lib/filters";
import { isActive } from "@/lib/search-status";
import { getCompaniesPage, getSearch } from "@/lib/searches";
import { NoResults } from "./no-results";
import { ProgressPanel } from "./progress-panel";
import { ResultsTable } from "./results-table";

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
  const isRunning = isActive(search.status);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          New search
        </Link>
        <h1 className="mt-1 text-xl font-semibold">
          {describeFilters(search)}
        </h1>
      </div>

      <ProgressPanel initialSearch={search} />

      {total > 0 ? (
        <ResultsTable
          searchId={search.id}
          rows={rows}
          total={total}
          isRunning={isRunning}
          page={page}
          pageCount={pageCount}
        />
      ) : (
        <NoResults isRunning={isRunning} />
      )}
    </div>
  );
}
