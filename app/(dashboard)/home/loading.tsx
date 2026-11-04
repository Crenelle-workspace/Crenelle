import { Skeleton } from '@/components/ui/skeleton'

export default function HomeLoading() {
  return (
    <div className="w-full space-y-6 pb-8 animate-pulse">
      {/* Greeting Banner Skeleton */}
      <div className="rounded-3xl border border-border/50 bg-card/45 p-6 sm:p-8 flex items-center justify-between gap-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-36 rounded-full bg-copper/15" />
          <Skeleton className="h-10 w-72 sm:w-96 rounded-2xl" />
          <Skeleton className="h-4 w-64 sm:w-80 rounded-lg" />
        </div>
        <Skeleton className="hidden sm:block h-24 w-28 rounded-2xl" />
      </div>

      {/* Spotlight + Needs Attention Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Skeleton className="lg:col-span-7 h-96 rounded-3xl" />
        <Skeleton className="lg:col-span-5 h-96 rounded-3xl" />
      </div>

      {/* Pulse + Activity Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Skeleton className="lg:col-span-7 h-72 rounded-3xl" />
        <Skeleton className="lg:col-span-5 h-72 rounded-3xl" />
      </div>
    </div>
  )
}

