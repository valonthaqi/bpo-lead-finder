import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/search-status";

const ACTIVE_STYLE =
  "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200";

const STATUS_STYLES: Record<string, string> = {
  queued: ACTIVE_STYLE,
  discovering: ACTIVE_STYLE,
  fetching: ACTIVE_STYLE,
  scoring: ACTIVE_STYLE,
  completed:
    "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200",
  stopped_budget:
    "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  failed: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  interrupted: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="secondary" className={STATUS_STYLES[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
