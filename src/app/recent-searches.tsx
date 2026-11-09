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
  ranBy?: string | null;
};

export function RecentSearches({
  searches,
  showRanBy = false,
}: {
  searches: RecentSearch[];
  showRanBy?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {showRanBy ? "Everyone's recent searches" : "Your recent searches"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {searches.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
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
          <ul className="-my-2 divide-y">
            {searches.map((search) => (
              <li key={search.id}>
                <Link
                  href={`/searches/${search.id}`}
                  className="-mx-3 flex flex-wrap items-center justify-between gap-3 rounded-lg px-3 py-4 text-sm hover:bg-muted"
                >
                  <span className="min-w-0">
                    <span className="block font-medium">
                      {describeFilters(search)}
                    </span>
                    {showRanBy && (
                      <span className="mt-0.5 block wrap-anywhere text-xs text-muted-foreground">
                        {search.ranBy ?? "Run before accounts existed"}
                      </span>
                    )}
                  </span>
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
