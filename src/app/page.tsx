import { redirect } from "next/navigation";
import { getSettings, listRecentSearches } from "@/lib/searches";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/supabase/server";
import { RecentSearches } from "./recent-searches";
import { SearchForm } from "./search-form";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

async function listUserEmails() {
  const { data, error } =
    await createSupabaseAdminClient().auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return new Map(data.users.map((user) => [user.id, user.email ?? ""]));
}

export default async function Home() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const isOwner = viewer.role === "owner";

  const [settings, recentSearches, emailsById] = await Promise.all([
    getSettings(),
    listRecentSearches(viewer),
    isOwner ? listUserEmails() : null,
  ]);

  const searches = recentSearches.map((search) => ({
    ...search,
    ranBy: search.userId ? (emailsById?.get(search.userId) ?? null) : null,
  }));

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
      <div className="min-w-0 space-y-8">
        <SearchForm />
        <RecentSearches searches={searches} showRanBy={isOwner} />
      </div>
      <SettingsForm initialSettings={settings} />
    </div>
  );
}
