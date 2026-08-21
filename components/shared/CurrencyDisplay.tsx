import React from 'react';

interface CurrencyDisplayProps {
  amount: number;
  className?: string; // classes for the numeric part
  containerClassName?: string; // classes for the container flex element
  currencyClassName?: string; // classes for the "ج.م" symbol
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  className = 'font-bold',
  containerClassName = 'inline-flex items-center gap-1 cursor-text',
  currencyClassName = 'text-[10px] text-neutral-450 dark:text-neutral-500 font-semibold select-none'
}) => {
  const formattedVal = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);

  return (
    <span className={containerClassName}>
      <span className={currencyClassName}>ج.م</span>
      <span dir="ltr" className={`font-mono ${className}`}>
        {formattedVal}
      </span>
    </span>
  );
};

export default CurrencyDisplay;
