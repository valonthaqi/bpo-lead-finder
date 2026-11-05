import { getSettings, listRecentSearches } from "@/lib/searches";
import { RecentSearches } from "./recent-searches";
import { SearchForm } from "./search-form";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [settings, recentSearches] = await Promise.all([
    getSettings(),
    listRecentSearches(),
  ]);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="min-w-0 space-y-6">
        <SearchForm />
        <RecentSearches searches={recentSearches} />
      </div>
      <SettingsForm initialSettings={settings} />
    </div>
  );
}
