
import React, { useState, useEffect, useMemo } from 'react';
import type { Cycle, CycleStatus } from '../../types';
import CycleCard from './CycleCard';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import CycleCardSkeleton from './CycleCardSkeleton';
import EmptyState from '../shared/EmptyState';
import { EmptyCyclesIllustration } from '../Illustrations';
import { useSettings, terminology } from '../../contexts/SettingsContext';
import useLocalStorage from '../../hooks/useLocalStorage';
import ViewToggle from '../shared/ViewToggle';
import CyclesTable from './CyclesTable';

import ExtendedFAB from '../shared/ExtendedFAB';

interface CyclesListProps {
  cycles: Cycle[];
  onAddNew: () => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onViewReport: (id: string) => void;
  onToggleStatus: (cycle: Cycle) => void;
  lastAddedId: string | null;
  onAnimationEnd: () => void;
}

const CyclesList: React.FC<CyclesListProps> = ({ cycles, onAddNew, onDelete, onEdit, onViewReport, onToggleStatus, lastAddedId, onAnimationEnd }) => {
  const [activeTab, setActiveTab] = useState<CycleStatus>('active');
  const { profile } = useData();
  const { loading } = useUI();
  const { settings } = useSettings();
  const term = terminology[settings.primaryTerm];
  const [viewMode, setViewMode] = useLocalStorage<'card' | 'table'>('cycles-view-mode', 'card');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const isViewer = profile?.role === 'viewer' || !!profile?.parent_id;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const currentView = isMobile ? 'card' : viewMode;
  const filteredCycles = useMemo(() => cycles
      .filter(cycle => cycle.status === activeTab)
      .sort((a, b) => {
          const dateComparison = new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
          if (dateComparison !== 0) return dateComparison;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }), 
  [cycles, activeTab]);

  const renderTab = (status: CycleStatus, label: string) => (
    <button
      onClick={() => setActiveTab(status)}
      className={`pb-2 px-1 font-extrabold transition-colors duration-200 text-sm tracking-tight ${
        activeTab === status
          ? 'text-primary dark:text-white border-b-2 border-primary'
          : 'text-neutral-500 hover:text-slate-800 dark:hover:text-gray-300 border-b-2 border-transparent'
      }`}
    >
      {label}
    </button>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8">
          {Array.from({ length: 3 }).map((_, index) => <CycleCardSkeleton key={index} />)}
        </div>
      );
    }
    
    if (filteredCycles.length > 0) {
        if (currentView === 'table') {
            return <CyclesTable cycles={filteredCycles} onEdit={isViewer ? undefined : onEdit} onDelete={isViewer ? undefined : onDelete} onViewReport={onViewReport} onToggleStatus={isViewer ? undefined : onToggleStatus} />;
        }
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8">
            {filteredCycles.map((cycle, index) => (
              <CycleCard 
                  key={cycle.id} 
                  cycle={cycle} 
                  onDelete={isViewer ? undefined : onDelete} 
                  onEdit={isViewer ? undefined : onEdit} 
                  onViewReport={onViewReport}
                  onToggleStatus={isViewer ? undefined : onToggleStatus}
                  isNew={cycle.id === lastAddedId}
                  onAnimationEnd={onAnimationEnd}
                  index={index}
              />
            ))}
          </div>
        );
    }
    
    return (
      <EmptyState
        icon={EmptyCyclesIllustration}
        title={`لا توجد ${term.plural} في هذا القسم`}
        message={`يمكنك إضافة ${term.singular} جديد عبر زر الفعل السريع بالأسفل.`}
      />
    );
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-white">
      {/* Header and Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
            <h2 className="text-2xl font-black text-neutral-800 dark:text-neutral-100 tracking-tight">إدارة {term.plural}</h2>
            {!isMobile && <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex items-center gap-8">
          {renderTab('active', `${term.plural} نشطة`)}
          {renderTab('closed', `${term.plural} مغلقة`)}
          {renderTab('archived', `${term.plural} مؤرشفة`)}
        </nav>
      </div>

      {/* Cycles Grid */}
      <div>
        <div key={activeTab} className="animate-page-enter">
          {renderContent()}
        </div>
      </div>

      {!isViewer && <ExtendedFAB onClick={onAddNew} label={term.new} />}
    </div>
  );
};

export default CyclesList;
