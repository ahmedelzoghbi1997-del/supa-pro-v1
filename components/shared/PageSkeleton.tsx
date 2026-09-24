import React from 'react';
import Skeleton from './Skeleton';

interface PageSkeletonProps {
  cardsCount?: number;
  rowsCount?: number;
}

export const PageSkeleton: React.FC<PageSkeletonProps> = ({ cardsCount = 3, rowsCount = 5 }) => {
  return (
    <div className="w-full space-y-6 animate-page-enter py-2">
      {/* Top Header Placeholder */}
      <div className="flex items-center justify-between gap-4 px-1">
        <div className="space-y-2">
          <Skeleton className="h-6 w-36 sm:w-48 rounded-xl" />
          <Skeleton className="h-3.5 w-24 sm:w-32 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-28 sm:w-32 rounded-xl shrink-0" />
      </div>

      {/* Summary Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {Array.from({ length: cardsCount }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-neutral-850 p-4 sm:p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-soft space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="h-7 w-7 rounded-xl" />
            </div>
            <Skeleton className="h-7 w-28 rounded-lg" />
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/60 flex items-center justify-between">
              <Skeleton className="h-2.5 w-16 rounded" />
              <Skeleton className="h-2.5 w-12 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Table / List Filter Bar Placeholder */}
      <div className="bg-white dark:bg-neutral-850 p-3 sm:p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-soft flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-40 sm:w-64 rounded-xl" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20 rounded-xl" />
          <Skeleton className="h-9 w-20 rounded-xl hidden sm:block" />
        </div>
      </div>

      {/* Rows Placeholder - Cards on Mobile, Table Rows on Desktop */}
      <div className="bg-white dark:bg-neutral-850 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-soft p-3 sm:p-5 space-y-3">
        {Array.from({ length: rowsCount }).map((_, i) => (
          <div
            key={i}
            className="p-3.5 rounded-xl border border-neutral-100/80 dark:border-neutral-800/80 flex items-center justify-between gap-4 bg-neutral-50/50 dark:bg-neutral-900/30"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
              <div className="space-y-1.5 min-w-0">
                <Skeleton className="h-3.5 w-28 sm:w-44 rounded-md" />
                <Skeleton className="h-2.5 w-20 sm:w-28 rounded-md" />
              </div>
            </div>
            <div className="text-left shrink-0 space-y-1.5">
              <Skeleton className="h-4 w-20 sm:w-24 rounded-md" />
              <Skeleton className="h-2.5 w-12 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PageSkeleton;
