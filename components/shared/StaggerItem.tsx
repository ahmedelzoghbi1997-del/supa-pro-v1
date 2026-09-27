import React from 'react';

interface StaggerItemProps {
  index: number;
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const StaggerItem: React.FC<StaggerItemProps> = ({ index, className = '', children, style }) => (
  <div
    className={`animate-stagger-in ${className}`}
    style={{ animationDelay: `${Math.min(index * 30, 600)}ms`, ...style }}
  >
    {children}
  </div>
);

export default React.memo(StaggerItem);
