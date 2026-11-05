"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CAMPAIGNS, COUNTRIES, MARKETS } from "@/lib/filters";

const FIELDS = [
  { name: "countryId", label: "Country", options: COUNTRIES },
  { name: "marketId", label: "Language or market", options: MARKETS },
  { name: "campaignId", label: "Campaign", options: CAMPAIGNS },
];

export function SearchForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsStarting(true);
    setError(null);

    const filters = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/searches", {
      method: "POST",
      body: JSON.stringify(filters),
    });
    const body = await response.json();

    if (!response.ok) {
      setError(body.error);
      setIsStarting(false);
      return;
    }
    router.push(`/searches/${body.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {FIELDS.map((field) => (
          <label key={field.name} className="block text-sm font-medium">
            {field.label}
            <select
              name={field.name}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-2 font-normal"
            >
              {field.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <button
        type="submit"
        disabled={isStarting}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {isStarting ? "Starting..." : "Start search"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
