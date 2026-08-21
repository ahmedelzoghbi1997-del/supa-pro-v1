import React from 'react';
import Skeleton from '../shared/Skeleton';

const ExpenseCardSkeleton: React.FC = () => {
    return (
        <div className="relative bg-neutral-0 dark:bg-neutral-800 rounded-lg shadow-soft border border-neutral-200 dark:border-neutral-700 p-3 pr-5 overflow-hidden">
             <div className="absolute top-0 bottom-0 right-0 w-1.5 bg-neutral-200 dark:bg-neutral-700"></div>
            <div className="flex items-center justify-between gap-4">
                {/* Left Side */}
                <div className="flex-grow min-w-0">
                    <Skeleton className="h-5 w-32 mb-1.5" />
                    <Skeleton className="h-3 w-20" />
                </div>
                
                {/* Middle */}
                <div className="hidden lg:flex items-center gap-4">
                   <Skeleton className="h-4 w-20" />
                   <Skeleton className="h-4 w-16" />
                   <Skeleton className="h-4 w-24" />
                </div>
                
                {/* Right Side */}
                <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-28" />
                    <div className="flex items-center gap-0">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExpenseCardSkeleton;