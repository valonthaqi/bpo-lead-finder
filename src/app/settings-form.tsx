"use client";

import { useState, type FormEvent } from "react";

export function SettingsForm({
  initialCreditCap,
}: {
  initialCreditCap: number;
}) {
  const [creditCap, setCreditCap] = useState(String(initialCreditCap));
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/settings", {
      method: "PUT",
      body: JSON.stringify({ perSearchCreditCap: Number(creditCap) }),
    });
    const body = await response.json();
    setMessage(response.ok ? "Saved." : body.error);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3">
      <label className="block text-sm font-medium">
        Credit cap per search
        <input
          type="number"
          min={0}
          max={1000}
          value={creditCap}
          onChange={(event) => setCreditCap(event.target.value)}
          className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-2 font-normal"
        />
      </label>
      <p className="text-xs text-slate-600">
        Each new search query uses one credit, out of 1,000 free credits a
        month. Stored queries are free.
      </p>
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
