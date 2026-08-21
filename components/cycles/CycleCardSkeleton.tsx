import React from 'react';
import Skeleton from '../shared/Skeleton';

const CycleCardSkeleton: React.FC = () => {
    return (
        <div className="bg-white dark:bg-neutral-800 p-5 rounded-xl shadow-soft border border-neutral-200 dark:border-neutral-700 flex flex-col justify-between gap-4">
            <div>
                {/* Card Header */}
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <Skeleton className="h-4 w-16 mb-2" />
                        <Skeleton className="h-6 w-40" />
                    </div>
                    <Skeleton className="h-12 w-12 rounded-full" />
                </div>
                
                {/* Details */}
                <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4 rounded-full flex-shrink-0" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4 rounded-full flex-shrink-0" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4 rounded-full flex-shrink-0" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                </div>

                {/* Financials */}
                <div className="space-y-3 bg-neutral-50 dark:bg-neutral-900/50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <Skeleton className="h-4 w-4 rounded-full" />
                           <Skeleton className="h-4 w-12" />
                        </div>
                        <Skeleton className="h-4 w-20" />
                    </div>
                    <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <Skeleton className="h-4 w-4 rounded-full" />
                           <Skeleton className="h-4 w-12" />
                        </div>
                        <Skeleton className="h-4 w-20" />
                    </div>
                    <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <Skeleton className="h-4 w-4 rounded-full" />
                           <Skeleton className="h-4 w-12" />
                        </div>
                        <Skeleton className="h-4 w-20" />
                    </div>
                </div>
            </div>

            {/* Footer Action */}
            <div className="flex items-center gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                <Skeleton className="h-10 flex-grow rounded-md" />
                <Skeleton className="h-10 w-10 rounded-md" />
            </div>
        </div>
    );
};

export default CycleCardSkeleton;