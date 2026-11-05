import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div
      className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]"
      aria-busy="true"
    >
      <div className="space-y-6">
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}
