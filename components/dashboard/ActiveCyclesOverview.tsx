import React from 'react';
import Card from '../shared/Card';
import { formatCurrency } from '../../utils/helpers';
import { ChartPieIcon, ClockIcon } from '../Icons';
import { Rocket } from 'lucide-react';
import { useCycles } from '../../hooks/useCycles';
import { useSettings, terminology } from '../../contexts/SettingsContext';

const ActiveCyclesOverview: React.FC = () => {
  const { cyclesWithCalculations } = useCycles();
  const { settings } = useSettings();
  const term = terminology[settings.primaryTerm];
  const activeCycles = cyclesWithCalculations.filter(c => c.status === 'active');

  return (
    <Card className="h-full">
      <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-50 mb-4">{term.plural} النشطة</h3>
      <div className="space-y-4">
        {activeCycles.length > 0 ? activeCycles.map(cycle => {
          const cycleDuration = 120; // Assume a 120-day cycle for progress calculation
          const startDate = new Date(cycle.start_date);
          const today = new Date();
          const daysPassed = (today.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
          
          const progress = Math.min(Math.round((daysPassed / cycleDuration) * 100), 100);
          const daysLeft = Math.max(0, Math.round(cycleDuration - daysPassed));

          return (
            <div key={cycle.id} className="bg-neutral-100 dark:bg-neutral-800/50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-neutral-800 dark:text-neutral-100">{cycle.name}</p>
                  {cycle.profit > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-black bg-accent-success/10 text-accent-success dark:bg-accent-success/20 dark:text-accent-success border border-accent-success/20 dark:border-accent-success/30">
                      <Rocket className="w-3 h-3" />
                      {term.singular} رابحة
                    </span>
                  )}
                </div>
                <span className="text-sm font-bold text-accent-info">{formatCurrency(cycle.profit)}</span>
              </div>
              <div className="mt-3">
                  <div className="flex justify-between items-center text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                      <span>تقدم {term.singular}</span>
                      <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5">
                      <div className="bg-accent-info h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                  </div>
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                  <div className="flex items-center gap-1">
                      <ChartPieIcon className="w-3.5 h-3.5" />
                      <span>الربح الحالي</span>
                  </div>
                  <div className="flex items-center gap-1">
                      <ClockIcon className="w-3.5 h-3.5" />
                      <span>{daysLeft} يوم متبقي</span>
                  </div>
              </div>
            </div>
          );
        }) : (
          <p className="text-center text-neutral-500 dark:text-neutral-400 py-4">لا توجد {term.plural} نشطة حاليًا.</p>
        )}
      </div>
    </Card>
  );
};

export default ActiveCyclesOverview;