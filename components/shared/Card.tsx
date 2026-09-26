import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = 'p-6', ...props }) => {
  const baseClasses = `
    bg-neutral-0 dark:bg-neutral-800 
    rounded-card shadow-elevation-1 hover:shadow-elevation-2
    border border-neutral-200 dark:border-neutral-700
    transition-all duration-200 active:scale-[0.985] cursor-pointer
  `;

  return (
    <div className={`${baseClasses} ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Card;