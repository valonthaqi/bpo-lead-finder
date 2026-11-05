import { HistoryIcon } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { describeFilters } from "@/lib/filters";

type RecentSearch = {
  id: number;
  countryId: string;
  marketId: string;
  campaignId: string;
  status: string;
  companiesFound: number;
};

export function RecentSearches({ searches }: { searches: RecentSearch[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent searches</CardTitle>
      </CardHeader>
      <CardContent>
        {searches.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <HistoryIcon
              className="size-6 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="font-medium">No searches yet.</p>
            <p className="text-sm text-muted-foreground">
              Choose your filters above to find your first call centers.
            </p>
          </div>
        ) : (
          <ul className="-my-1 divide-y">
            {searches.map((search) => (
              <li key={search.id}>
                <Link
                  href={`/searches/${search.id}`}
                  className="-mx-2 flex flex-wrap items-center justify-between gap-2 rounded-md px-2 py-3 text-sm hover:bg-muted"
                >
                  <span className="font-medium">{describeFilters(search)}</span>
                  <span className="flex items-center gap-3 text-muted-foreground">
                    {search.companiesFound} companies
                    <StatusBadge status={search.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
