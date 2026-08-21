import React from 'react';
import { ChevronLeftIcon } from '../Icons';

export interface BreadcrumbItem {
    label: string;
    onClick?: () => void;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
    return (
        <nav className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-500 dark:text-neutral-400">
            {items.map((item, index) => (
                <React.Fragment key={index}>
                    {item.onClick ? (
                        <button onClick={item.onClick} className="hover:text-neutral-800 dark:hover:text-white transition-colors">
                            {item.label}
                        </button>
                    ) : (
                        <span className="font-semibold text-neutral-800 dark:text-white">
                            {item.label}
                        </span>
                    )}
                    {index < items.length - 1 && (
                        <ChevronLeftIcon className="w-4 h-4" />
                    )}
                </React.Fragment>
            ))}
        </nav>
    );
};

export default Breadcrumbs;