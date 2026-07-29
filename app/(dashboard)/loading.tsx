import { Skeleton } from "@/components/ui/skeleton";

export default function RootDashboardLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/40">
        <div className="space-y-3">
          <Skeleton className="h-5 w-32 rounded-full bg-copper/10" />
          <Skeleton className="h-10 w-64 rounded-2xl" />
          <Skeleton className="h-4 w-80 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-36 rounded-full" />
      </div>

      {/* Dark glass card skeleton */}
      <div className="border border-border/40 p-8 rounded-3xl bg-card/40 backdrop-blur-xl space-y-6 shadow-xl">
        <div className="flex justify-between items-center">
          <Skeleton className="h-7 w-48 rounded-xl" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <Skeleton className="h-44 w-full rounded-2xl" />
      </div>
    </div>
  );
}
