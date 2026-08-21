import React from 'react';
import { Squares2x2Icon, TableCellsIcon } from '../Icons';

interface ViewToggleProps {
  viewMode: 'card' | 'table';
  setViewMode: (mode: 'card' | 'table') => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ viewMode, setViewMode }) => {
  const baseClasses = "p-2 rounded-md transition-colors duration-200";
  const activeClasses = "bg-primary text-white";
  const inactiveClasses = "bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-300 dark:hover:bg-neutral-600";

  return (
    <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
      <button
        onClick={() => setViewMode('card')}
        className={`${baseClasses} ${viewMode === 'card' ? activeClasses : inactiveClasses}`}
        aria-pressed={viewMode === 'card'}
        aria-label="عرض كبطاقات"
      >
        <Squares2x2Icon className="h-5 w-5" />
      </button>
      <button
        onClick={() => setViewMode('table')}
        className={`${baseClasses} ${viewMode === 'table' ? activeClasses : inactiveClasses}`}
        aria-pressed={viewMode === 'table'}
        aria-label="عرض كجدول"
      >
        <TableCellsIcon className="h-5 w-5" />
      </button>
    </div>
  );
};

export default ViewToggle;