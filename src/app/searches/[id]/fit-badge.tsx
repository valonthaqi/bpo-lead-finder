import { Badge } from "@/components/ui/badge";

const FIT_STYLES: Record<string, string> = {
  "Strong fit":
    "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200",
  "Possible fit":
    "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  "Low fit": "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
};

export function FitBadge({ label, score }: { label: string; score: number }) {
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <span className="w-7 text-right text-base font-semibold tabular-nums">
        {score}
      </span>
      <Badge variant="secondary" className={FIT_STYLES[label]}>
        {label}
      </Badge>
    </span>
  );
}
