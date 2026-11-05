import { SearchXIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function NoResults({ isRunning }: { isRunning: boolean }) {
  if (isRunning) {
    return (
      <Card>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Looking for call centers. Results appear here as they&apos;re found.
          </p>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
        <SearchXIcon
          className="size-6 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="font-medium">No companies found.</p>
        <p className="text-sm text-muted-foreground">
          Try another country or campaign, or raise the credit cap in Settings.
        </p>
      </CardContent>
    </Card>
  );
}
