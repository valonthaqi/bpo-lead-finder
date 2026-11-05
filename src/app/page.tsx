import Link from "next/link";
import { describeFilters } from "@/lib/filters";
import { STATUS_LABELS } from "@/lib/search-status";
import { getPerSearchCreditCap, listRecentSearches } from "@/lib/searches";
import { SearchForm } from "./search-form";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [creditCap, recentSearches] = await Promise.all([
    getPerSearchCreditCap(),
    listRecentSearches(),
  ]);

  return (
    <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
      <div className="space-y-8">
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h1 className="text-xl font-semibold">Find call centers</h1>
          <p className="mt-1 text-sm text-slate-600">
            Searches public sources for offshore call centers running US
            insurance campaigns. Only company-level details are collected.
          </p>
          <SearchForm />
        </section>

        <section>
          <h2 className="font-semibold">Recent searches</h2>
          {recentSearches.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">No searches yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
              {recentSearches.map((search) => (
                <li key={search.id}>
                  <Link
                    href={`/searches/${search.id}`}
                    className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm hover:bg-slate-50"
                  >
                    <span className="font-medium">
                      {describeFilters(search)}
                    </span>
                    <span className="text-slate-600">
                      {STATUS_LABELS[search.status]} · {search.companiesFound}{" "}
                      companies
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside>
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="font-semibold">Settings</h2>
          <SettingsForm initialCreditCap={creditCap} />
        </section>
      </aside>
    </div>
  );
}
