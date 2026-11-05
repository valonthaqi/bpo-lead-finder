import { HeadsetIcon } from "lucide-react";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <HeadsetIcon className="size-5" aria-hidden="true" />
        </span>
        <div>
          <Link href="/" className="block font-semibold leading-tight">
            BPO Lead Finder
          </Link>
          <p className="text-xs text-muted-foreground">
            Offshore call centers for US insurance campaigns
          </p>
        </div>
      </div>
    </header>
  );
}
