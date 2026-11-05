"use client";

import { useState, type FormEvent } from "react";
import type { Settings } from "@/lib/searches";

export function SettingsForm({
  initialSettings,
}: {
  initialSettings: Settings;
}) {
  const [creditCap, setCreditCap] = useState(
    String(initialSettings.perSearchCreditCap),
  );
  const [fetchConcurrency, setFetchConcurrency] = useState(
    String(initialSettings.fetchConcurrency),
  );
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/settings", {
      method: "PUT",
      body: JSON.stringify({
        perSearchCreditCap: Number(creditCap),
        fetchConcurrency: Number(fetchConcurrency),
      }),
    });
    const body = await response.json();
    setMessage(response.ok ? "Saved." : body.error);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3">
      <NumberField
        label="Credit cap per search"
        help="Each new search query uses one credit, out of 1,000 free credits a month. Stored queries are free."
        min={0}
        max={1000}
        value={creditCap}
        onChange={setCreditCap}
      />
      <NumberField
        label="Websites to read at once"
        help="Higher is faster. Each website is still read one page at a time."
        min={1}
        max={20}
        value={fetchConcurrency}
        onChange={setFetchConcurrency}
      />
      <button
        type="submit"
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
      >
        Save
      </button>
      {message && (
        <p role="status" className="text-sm text-slate-700">
          {message}
        </p>
      )}
    </form>
  );
}

function NumberField({
  label,
  help,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  help: string;
  min: number;
  max: number;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <>
      <label className="block text-sm font-medium">
        {label}
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-2 font-normal"
        />
      </label>
      <p className="text-xs text-slate-600">{help}</p>
    </>
  );
}
