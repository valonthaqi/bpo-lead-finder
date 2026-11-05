import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Pagination({
  searchId,
  page,
  pageCount,
}: {
  searchId: number;
  page: number;
  pageCount: number;
}) {
  return (
    <nav className="flex items-center justify-between gap-2 text-sm">
      {page > 1 ? (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/searches/${searchId}?page=${page - 1}`}>
            ← Previous
          </Link>
        </Button>
      ) : (
        <span />
      )}
      <span className="text-muted-foreground">
        Page {page} of {pageCount}
      </span>
      {page < pageCount ? (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/searches/${searchId}?page=${page + 1}`}>Next →</Link>
        </Button>
      ) : (
        <span />
      )}
    </nav>
  );
}
