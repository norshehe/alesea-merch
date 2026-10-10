import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors `users/page.tsx`: header with an action, then two titled tables. */
export default function AdminUsersLoading() {
  return (
    <div className="grid gap-6">
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-2">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>
      <div className="grid gap-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
      <div className="mt-4 grid gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-28 w-full rounded-lg" />
      </div>
    </div>
  );
}
