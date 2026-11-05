"use client";

import { RotateCwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getProgressPercent,
  isActive,
  type SearchProgress,
} from "@/lib/search-status";

const POLL_INTERVAL_MS = 2_500;

export function ProgressPanel({
  initialSearch,
}: {
  initialSearch: SearchProgress;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [error, setError] = useState<string | null>(null);
  const isRunning = isActive(search.status);

  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(async () => {
      const response = await fetch(`/api/searches/${search.id}`);
      if (!response.ok) return;
      const latest: SearchProgress = await response.json();
      setSearch(latest);
      router.refresh();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isRunning, search.id, router]);

  async function runAgain() {
    setError(null);
    const response = await fetch("/api/searches", {
      method: "POST",
      body: JSON.stringify({
        countryId: search.countryId,
        marketId: search.marketId,
        campaignId: search.campaignId,
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error);
      return;
    }
    router.push(`/searches/${body.id}`);
  }

  const percent = getProgressPercent(search);

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusBadge status={search.status} />
          {!isRunning && (
            <Button variant="outline" size="sm" onClick={runAgain}>
              <RotateCwIcon aria-hidden="true" />
              Run again
            </Button>
          )}
        </div>
        {isRunning &&
          (percent === null ? (
            <Skeleton className="h-2 w-full" />
          ) : (
            <Progress value={percent} className="h-2" />
          ))}
        {search.message && <p className="text-sm">{search.message}</p>}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Stat
            label="Queries"
            value={`${search.queriesDone} of ${search.queriesPlanned}`}
          />
          <Stat
            label="New credits"
            value={`${search.creditsUsed} of ${search.creditCap}`}
          />
          <Stat
            label="Websites read"
            value={`${search.domainsFetched} of ${search.domainsToFetch}`}
          />
          <Stat label="Companies" value={String(search.companiesFound)} />
        </dl>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
