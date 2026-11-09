import { HeadsetIcon, LogOutIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getSignedInUser } from "@/lib/supabase/server";

export async function SiteHeader() {
  const user = await getSignedInUser();

  return (
    <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HeadsetIcon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <Link href="/" className="block font-semibold leading-tight">
              BPO Lead Finder
            </Link>
            <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
              Offshore call centers for US insurance campaigns
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <>
              <span className="hidden text-sm text-muted-foreground md:inline">
                {user.email}
              </span>
              {user.role === "admin" && (
                <Button variant="outline" asChild>
                  <Link href="/users">
                    <UsersIcon aria-hidden="true" />
                    Users
                  </Link>
                </Button>
              )}
              <form action={signOut}>
                <Button type="submit" variant="outline">
                  <LogOutIcon aria-hidden="true" />
                  Sign out
                </Button>
              </form>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
