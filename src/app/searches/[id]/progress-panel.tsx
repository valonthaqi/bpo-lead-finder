"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  isActive,
  STATUS_LABELS,
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

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-medium">{STATUS_LABELS[search.status]}</p>
        {!isRunning && (
          <button
            type="button"
            onClick={runAgain}
            className="rounded-md border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50"
          >
            Run again
          </button>
        )}
      </div>
      {search.message && (
        <p className="mt-1 text-slate-700">{search.message}</p>
      )}
      {error && (
        <p role="alert" className="mt-1 text-red-700">
          {error}
        </p>
      )}
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-600">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
