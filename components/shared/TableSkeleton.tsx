import React from 'react';
import Skeleton from './Skeleton';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 6, columns = 5 }) => {
  return (
    <div className="w-full bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-none animate-page-enter">
      {/* Mobile Card Skeleton View */}
      <div className="md:hidden p-3 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="p-3.5 rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/20 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28 rounded-lg" />
              <Skeleton className="h-5 w-20 rounded-lg" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-6 w-16 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table Skeleton View */}
      <div className="hidden md:block p-4 overflow-x-auto">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800 px-2">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton key={colIdx} className="h-3.5 w-20 rounded" />
          ))}
        </div>
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <div key={rowIdx} className="py-3.5 flex items-center justify-between px-2 gap-4">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TableSkeleton;
