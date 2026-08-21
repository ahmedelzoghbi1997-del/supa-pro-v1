import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  padding?: 'p-4' | 'p-6' | 'p-8';
}

const Card: React.FC<CardProps> = ({ children, className = '', padding = 'p-6', ...props }) => {
  const baseClasses = `
    bg-neutral-0 dark:bg-neutral-800 
    rounded-xl shadow-soft 
    border border-neutral-200 dark:border-neutral-700
    transition-all duration-300
  `;

  return (
    <div className={`${baseClasses} ${padding} ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Card;