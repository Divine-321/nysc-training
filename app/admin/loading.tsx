import { Skeleton } from "@/app/components/ui";

/**
 * Shown while an admin route's code and data are on the way.
 *
 * Beyond filling the gap, this is what lets Next prefetch these routes at all:
 * dynamic routes are only partially prefetched when a loading file is present,
 * and most admin screens sit behind an [id] segment.
 */
export default function AdminLoading() {
  return (
    <div className="p-6">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-2 h-4 w-80" />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24 rounded-2xl" />
        ))}
      </div>

      <div className="mt-6 space-y-3 rounded-2xl border border-gray-100 bg-white p-5">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-12" />
        ))}
      </div>
    </div>
  );
}
