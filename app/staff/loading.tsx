import { Skeleton } from "@/app/components/ui";

/** Staff-side counterpart to the admin loading file. */
export default function StaffLoading() {
  return (
    <div className="p-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-2 h-4 w-72" />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-40 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
