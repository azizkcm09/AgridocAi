'use client';

type SkeletonProps = {
  className?: string;
  style?: React.CSSProperties;
};

export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div className={`bg-slate-200/60 dark:bg-slate-700/50 rounded animate-pulse ${className}`} style={style} />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm ring-1 ring-slate-900/5 dark:ring-slate-800 p-5">
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className="h-7 w-14 mb-2" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-slate-100 dark:border-slate-800">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className={`h-4 ${i === 0 ? 'w-40' : 'w-20'}`} />
        </td>
      ))}
    </tr>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm ring-1 ring-slate-900/5 dark:ring-slate-800 p-5">
      <Skeleton className="h-4 w-32 mb-4" />
      <div className="flex items-end gap-2 h-48">
        {[40, 65, 45, 80, 55, 70, 50].map((h, i) => (
          <Skeleton key={i} className="flex-1 rounded-t" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

export function DetailPanelSkeleton() {
  return (
    <div className="grid grid-cols-5 gap-4" style={{ height: 'calc(100vh - 220px)' }}>
      <div className="col-span-3 bg-white dark:bg-slate-900 rounded-lg shadow-sm ring-1 ring-slate-900/5 dark:ring-slate-800 flex flex-col overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-4 w-48 mb-1.5" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="flex-1 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          <Skeleton className="w-3/4 h-3/4 rounded-lg" />
        </div>
      </div>
      <div className="col-span-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm ring-1 ring-slate-900/5 dark:ring-slate-800 flex flex-col overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
          <Skeleton className="h-4 w-28 mb-1.5" />
          <Skeleton className="h-3 w-44" />
        </div>
        <div className="flex-1 px-5 py-4 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
