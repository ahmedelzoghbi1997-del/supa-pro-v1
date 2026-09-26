import React from 'react';
import { PlusIcon } from '../Icons';

interface EmptyStateProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
  iconClassName?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, message, actionText, onAction, iconClassName = 'h-24 w-24' }) => {
  return (
    <div className="text-center py-16 px-6 bg-neutral-50 dark:bg-neutral-900/50 rounded-card border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex flex-col items-center">
      <Icon className={`${iconClassName} text-neutral-300 dark:text-neutral-600 mb-4`} />
      <h3 className="mt-4 text-xl font-semibold text-neutral-800 dark:text-neutral-100">{title}</h3>
      <p className="mt-2 text-base text-neutral-500 dark:text-neutral-400 max-w-sm">{message}</p>
      {actionText && onAction && (
        <div className="mt-6">
          <button
            onClick={onAction}
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-dark transition-colors"
          >
            <PlusIcon className="-ml-0.5 h-5 w-5" />
            {actionText}
          </button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
