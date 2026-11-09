"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Settings</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <NumberField
            id="credit-cap"
            label="Credit cap per search"
            help="Each new search query uses one credit, out of 1,000 free credits a month. Stored queries are free."
            min={0}
            max={1000}
            value={creditCap}
            onChange={setCreditCap}
          />
          <NumberField
            id="fetch-concurrency"
            label="Websites to read at once"
            help="Higher is faster. Each website is still read one page at a time."
            min={1}
            max={20}
            value={fetchConcurrency}
            onChange={setFetchConcurrency}
          />
          <Button type="submit" variant="outline">
            Save
          </Button>
          {message && (
            <p role="status" className="text-sm text-muted-foreground">
              {message}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function NumberField({
  id,
  label,
  help,
  min,
  max,
  value,
  onChange,
}: {
  id: string;
  label: string;
  help: string;
  min: number;
  max: number;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <p className="text-xs leading-relaxed text-muted-foreground">{help}</p>
    </div>
  );
}
