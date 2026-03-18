import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-6 w-64" />
      </div>
      <div className="flex gap-3 flex-wrap">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-24 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="p-5 flex flex-col items-center">
            <Skeleton className="h-16 w-16 rounded-xl mb-4" />
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-5 w-32" />
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <Skeleton className="h-8 w-48 mb-4" />
        {[1, 2, 3].map(i => (
          <div key={i} className="flex justify-between py-3 border-b border-border last:border-0">
            <div><Skeleton className="h-6 w-36 mb-1" /><Skeleton className="h-5 w-24" /></div>
            <div className="text-right"><Skeleton className="h-6 w-16 mb-1" /><Skeleton className="h-5 w-20" /></div>
          </div>
        ))}
      </Card>
    </div>
  );
}

export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><Skeleton className="h-10 w-56 mb-2" /><Skeleton className="h-6 w-72" /></div>
        <Skeleton className="h-14 w-40 rounded-xl" />
      </div>
      <Skeleton className="h-14 w-full rounded-xl" />
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex gap-3 mb-3">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="flex-1"><Skeleton className="h-7 w-40 mb-1" /><Skeleton className="h-5 w-28" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
              <div><Skeleton className="h-5 w-24 mb-1" /><Skeleton className="h-7 w-20" /></div>
              <div><Skeleton className="h-5 w-28 mb-1" /><Skeleton className="h-7 w-20" /></div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><Skeleton className="h-10 w-48 mb-2" /><Skeleton className="h-6 w-64" /></div>
        <Skeleton className="h-14 w-40 rounded-xl" />
      </div>
      <Skeleton className="h-14 w-full rounded-xl" />
      <Card className="rounded-xl p-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 py-3 border-b border-border last:border-0">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-32 flex-1" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </Card>
    </div>
  );
}

export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><Skeleton className="h-10 w-48 mb-2" /><Skeleton className="h-6 w-64" /></div>
        <Skeleton className="h-14 w-40 rounded-xl" />
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} className="p-5">
            <div className="flex justify-between mb-3">
              <Skeleton className="h-14 w-14 rounded-xl" />
              <div className="flex gap-2"><Skeleton className="h-12 w-12" /><Skeleton className="h-12 w-12" /></div>
            </div>
            <Skeleton className="h-8 w-40 mb-2" />
            <Skeleton className="h-5 w-56 mb-3" />
            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex justify-between"><Skeleton className="h-5 w-20" /><Skeleton className="h-7 w-16" /></div>
              <div className="flex justify-between"><Skeleton className="h-5 w-16" /><Skeleton className="h-7 w-10" /></div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
