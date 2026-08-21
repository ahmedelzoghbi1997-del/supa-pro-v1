import React from 'react';

// Common style for the illustrations to make them feel part of a set
// FIX: Added 'as const' to ensure property types like 'aria-hidden' are literal values compatible with Booleanish.
const commonProps = {
    "aria-hidden": "true",
    "xmlns": "http://www.w3.org/2000/svg",
    "viewBox": "0 0 160 120",
    "fill": "none",
} as const;

const IllustrationWrapper: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className }) => (
    <svg {...commonProps} className={className}>
        {children}
    </svg>
);


export const EmptyInvoicesIllustration: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <IllustrationWrapper {...props}>
        {/* Simplified clipboard and empty paper */}
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M85 40h25a2 2 0 0 1 2 2v66a2 2 0 0 1-2 2H50a2 2 0 0 1-2-2V42a2 2 0 0 1 2-2h10" className="text-neutral-300 dark:text-neutral-600 opacity-80" />
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M70 30h20a5 5 0 0 1 5 5v5H65v-5a5 5 0 0 1 5-5z" className="text-neutral-400 dark:text-neutral-50" />
        <rect width="50" height="4" x="55" y="55" fill="currentColor" rx="2" className="text-neutral-200 dark:text-neutral-700" />
        <rect width="30" height="4" x="55" y="65" fill="currentColor" rx="2" className="text-neutral-200 dark:text-neutral-700" />
        <circle cx="95" cy="85" r="18" stroke="currentColor" strokeWidth="2" className="text-neutral-400 dark:text-neutral-50" />
        <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="m108 98 8 8" className="text-neutral-400 dark:text-neutral-50" />
    </IllustrationWrapper>
);

export const EmptyExpensesIllustration = EmptyInvoicesIllustration;

export const EmptyCyclesIllustration: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <IllustrationWrapper {...props}>
        {/* Farmer silhouette */}
        <g className="text-neutral-300 dark:text-neutral-600 opacity-80">
            <circle cx="80" cy="45" r="8" fill="currentColor" />
            <path d="M70 53c0 10 20 10 20 0z" fill="currentColor" />
            <path d="M72 60 h16 v20 H72z" fill="currentColor" />
        </g>
        {/* Field */}
        <path d="M10 110 C 40 100, 120 100, 150 110" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" className="text-neutral-300 dark:text-neutral-700" />
        
        {/* Sprout */}
        <g className="text-green-500 dark:text-green-400">
            <path d="M120 100 C 122 95, 128 95, 130 100" stroke="currentColor" strokeWidth="2" />
            <path d="M125 95 C 130 90, 130 90, 135 95" stroke="currentColor" strokeWidth="2" />
        </g>
    </IllustrationWrapper>
);

export const EmptySuppliersIllustration: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <IllustrationWrapper {...props}>
         {/* Road */}
        <path d="M10 110 Q 80 80, 150 110" stroke="currentColor" strokeWidth="12" className="text-neutral-200 dark:text-neutral-700" />
        <path d="M10 110 Q 80 80, 150 110" stroke="currentColor" strokeWidth="1" strokeDasharray="6 8" className="text-neutral-400 dark:text-neutral-50" />
        {/* Truck */}
        <g className="text-neutral-400 dark:text-neutral-600">
            <rect x="40" y="60" width="30" height="20" rx="3" fill="currentColor" />
            <rect x="65" y="70" width="10" height="10" fill="currentColor" />
            <circle cx="48" cy="85" r="4" fill="currentColor" className="text-neutral-500 dark:text-neutral-400"/>
            <circle cx="68" cy="85" r="4" fill="currentColor" className="text-neutral-500 dark:text-neutral-400"/>
        </g>
    </IllustrationWrapper>
);

export const EmptyFarmersIllustration: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
     <IllustrationWrapper {...props}>
        <g className="text-neutral-400 dark:text-neutral-500 opacity-80">
            <circle cx="80" cy="55" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M70 70 a 1,1 0 0,1 20,0 v20 a 1,1 0 0,1 -20,0 z" stroke="currentColor" strokeWidth="2" />
        </g>
        {/* Sprout */}
         <g className="text-green-500 dark:text-green-400">
            <path d="M95 80 C 97 75, 103 75, 105 80" stroke="currentColor" strokeWidth="2" />
            <path d="M100 75 C 105 70, 105 70, 110 75" stroke="currentColor" strokeWidth="2" />
        </g>
    </IllustrationWrapper>
);