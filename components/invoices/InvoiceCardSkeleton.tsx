
import React from 'react';
import Skeleton from '../shared/Skeleton';

const InvoiceCardSkeleton: React.FC = () => {
    return (
        <div className="relative bg-neutral-0 dark:bg-neutral-800 rounded-xl shadow-soft border border-neutral-200 dark:border-neutral-700 py-1.5 px-4 overflow-hidden">
            <div className="space-y-1">
                {/* Top Row */}
                <div className="flex justify-between items-center gap-4">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-4 w-16" />
                </div>

                {/* Bottom Row */}
                <div className="flex justify-between items-center border-t border-neutral-100/50 dark:border-neutral-700/30 pt-1">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-2.5 w-12" />
                        <Skeleton className="h-2.5 w-12" />
                        <Skeleton className="h-2.5 w-12" />
                    </div>
                    <div className="flex items-center gap-1">
                        <Skeleton className="h-5 w-5 rounded-md" />
                        <Skeleton className="h-5 w-5 rounded-md" />
                    </div>
                </div>
            </div>
        </div>
    );
};
export default InvoiceCardSkeleton;
