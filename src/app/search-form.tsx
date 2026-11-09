"use client";

import { SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { CAMPAIGNS, COUNTRIES, MARKETS } from "@/lib/filters";

const FIELDS = [
  { name: "countryId", label: "Country", options: COUNTRIES },
  { name: "marketId", label: "Language or market", options: MARKETS },
  { name: "campaignId", label: "Campaign", options: CAMPAIGNS },
];

function subscribeToNothing() {
  return () => {};
}

export function SearchForm() {
  const isJavaScriptReady = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
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
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl">Find call centers</h1>
        </CardTitle>
        <CardDescription>
          Searches public sources for offshore call centers running US insurance
          campaigns. Only company-level details are collected.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-3">
            {FIELDS.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>{field.label}</Label>
                <NativeSelect
                  id={field.name}
                  name={field.name}
                  size="lg"
                  className="w-full"
                >
                  {field.options.map((option) => (
                    <NativeSelectOption key={option.id} value={option.id}>
                      {option.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            ))}
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={!isJavaScriptReady || isStarting}
          >
            <SearchIcon aria-hidden="true" />
            {isStarting ? "Starting..." : "Start search"}
          </Button>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
