import React, { useState } from 'react';
import { formatNumber } from '../../../utils/helpers';
import { PencilIcon, TrashIcon, InfoIcon } from '../../Icons';

export const getCycleBadgeStyles = (cycleId: string, cycleName: string) => {
  const colors = [
    { bg: 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border border-indigo-100/50 dark:border-indigo-900/30' },
    { bg: 'bg-cyan-50/80 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-300 border border-cyan-100/50 dark:border-cyan-900/30' },
    { bg: 'bg-amber-50/80 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border border-amber-100/50 dark:border-amber-900/30' },
    { bg: 'bg-purple-50/80 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 border border-purple-100/50 dark:border-purple-900/30' },
    { bg: 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border border-emerald-100/50 dark:border-emerald-900/30' },
    { bg: 'bg-sky-50/80 dark:bg-sky-950/40 text-sky-600 dark:text-sky-300 border border-sky-100/50 dark:border-sky-900/30' },
    { bg: 'bg-rose-50/80 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-100/50 dark:border-rose-900/30' },
    { bg: 'bg-teal-50/80 dark:bg-teal-950/40 text-teal-600 dark:text-teal-300 border border-teal-100/50 dark:border-teal-900/30' },
  ];
  let hash = 0;
  const str = cycleId + cycleName;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index].bg;
};

export const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

export const ChevronUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
  </svg>
);

export interface LedgerGroup {
  key: string;
  cycleName: string;
  count: number;
  totalAmount: number;
  logs: any[];
}

export interface LedgerTabProps {
  partnerLogs: any[];
  groupedLogs: LedgerGroup[];
  isViewer: boolean;
  onEditDraw?: (draw: any) => void;
  onDeleteDraw?: (drawId: string, draw: any) => void;
  expandedCycles?: Record<string, boolean>;
  onToggleCycle?: (cycleKey: string) => void;
}

export const LedgerTab: React.FC<LedgerTabProps> = ({
  partnerLogs,
  groupedLogs,
  isViewer,
  onEditDraw,
  onDeleteDraw,
  expandedCycles: externalExpanded,
  onToggleCycle: externalToggle,
}) => {
  const [internalExpanded, setInternalExpanded] = useState<Record<string, boolean>>({});

  const expanded = externalExpanded ?? internalExpanded;
  const handleToggle = (key: string) => {
    if (externalToggle) {
      externalToggle(key);
    } else {
      setInternalExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center pb-2 border-b border-neutral-100 dark:border-neutral-850">
        <h4 className="text-xs font-black text-neutral-800 dark:text-neutral-200">
          سجل حركات السحب
        </h4>
        <span className="text-[9.5px] bg-neutral-100 dark:bg-neutral-850 text-neutral-600 dark:text-neutral-400 font-extrabold px-2 py-0.5 rounded-lg">
          {partnerLogs.length} حركة مسجلة
        </span>
      </div>

      <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
        {partnerLogs.length === 0 ? (
          <div className="text-center py-10 text-neutral-400 bg-neutral-50/50 dark:bg-neutral-900/10 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800">
            <InfoIcon className="w-5 h-5 mx-auto mb-1.5 text-neutral-300" />
            <p className="text-xs font-bold">
              لا توجد حركات سحب أو ترحيل أرباح مسجلة بعد لهذا الشريك.
            </p>
          </div>
        ) : (
          groupedLogs.map((g) => {
            const isOpen = !!expanded[g.key];
            const badgeStyles =
              g.key !== 'general'
                ? getCycleBadgeStyles(g.key, g.cycleName)
                : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-350 border border-neutral-150 dark:border-neutral-800';

            return (
              <div key={g.key} className="space-y-1.5">
                {/* Accordion Group Header - Accordion Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggle(g.key)}
                  className={`w-full flex justify-between items-center p-3 rounded-lg transition-colors text-right cursor-pointer shadow-sm ${badgeStyles}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col text-right">
                      <span className="text-xs font-black">
                        🌿 {g.cycleName}
                      </span>
                      <span className="text-[9.5px] opacity-75 font-bold mt-0.5">
                        {g.count} حركات مسجلة
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span
                      dir="ltr"
                      className="font-black text-xs font-mono"
                    >
                      {g.totalAmount > 0 ? '+' : ''}
                      {formatNumber(g.totalAmount)} ج.م
                    </span>
                    {isOpen ? (
                      <ChevronUpIcon className="w-4 h-4 opacity-70" />
                    ) : (
                      <ChevronDownIcon className="w-4 h-4 opacity-70" />
                    )}
                  </div>
                </button>

                {/* Accordion Content (Expanded State) */}
                {isOpen && (
                  <div className="mr-2 pl-1 border-r-2 border-neutral-150 dark:border-neutral-800 divide-y divide-gray-100 dark:divide-neutral-800 bg-neutral-50/20 dark:bg-neutral-950/25 rounded-md p-1">
                    {g.logs.map((draw) => {
                      const isDraw = draw.amount > 0;
                      const isTransfer =
                        draw.reason?.includes('ترحيل أرباح') ||
                        draw.reason?.includes('[TRANSFERRED]') ||
                        draw.reason?.includes('[AUTO_PROFIT]');
                      const isExternalDebt =
                        draw.funding_source === 'external_debt' ||
                        draw.reason?.includes('[EXTERNAL_DEBT]');
                      const isAutoProfit =
                        draw.reason?.includes('[AUTO_PROFIT]');
                      const absoluteAmount = Math.abs(draw.amount);

                      return (
                        <div
                          key={draw.id}
                          className="py-2 flex justify-between items-center text-xs hover:bg-neutral-50/40 dark:hover:bg-neutral-900/30 px-1 transition-colors"
                        >
                          <div className="flex items-center gap-2 text-right">
                            <span
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors ${
                                isTransfer
                                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600'
                                  : isExternalDebt
                                    ? 'bg-purple-50 dark:bg-purple-950/30 text-purple-650'
                                    : isDraw
                                      ? 'bg-rose-50 dark:bg-rose-955/30 text-rose-500'
                                      : 'bg-amber-50 dark:bg-amber-955/30 text-amber-600'
                              }`}
                            >
                              {isTransfer
                                ? '💸'
                                : isExternalDebt
                                  ? '🏮'
                                  : isDraw
                                    ? '📤'
                                    : '📥'}
                            </span>
                            <div className="space-y-0.5 text-right">
                              <div className="flex items-center gap-1.5 flex-wrap font-bold text-neutral-800 dark:text-neutral-200">
                                <span>
                                  {isTransfer
                                    ? isAutoProfit
                                      ? 'مستحق أرباح عروة'
                                      : 'إضافة أرباح للمحفظة'
                                    : isExternalDebt
                                      ? draw.amount < 0
                                        ? 'سداد دين جهة خارجية'
                                        : 'دين جهة خارجية'
                                      : isDraw
                                        ? 'سحب كاش شخصي'
                                        : 'إيداع كاش للمحفظة'}
                                </span>
                                <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-normal">
                                  ({draw.date})
                                </span>
                              </div>
                              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">
                                {draw.reason?.replace(' [AUTO_PROFIT]', '') ||
                                  'حركة مالية جارية'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              dir="ltr"
                              className={`font-black font-mono text-xs ${
                                isTransfer
                                  ? 'text-emerald-500'
                                  : isExternalDebt
                                    ? 'text-purple-600 dark:text-purple-400'
                                    : isDraw
                                      ? 'text-rose-500'
                                      : 'text-emerald-500'
                              } inline-flex items-center gap-0.5`}
                            >
                              <span>{isDraw ? '-' : '+'}</span>
                              <span>{formatNumber(absoluteAmount)}</span>
                              <span
                                className="text-[9px] font-sans ml-1"
                                dir="rtl"
                              >
                                ج.م
                              </span>
                            </span>
                            {!isViewer && onEditDraw && onDeleteDraw && (
                              <div className="flex gap-0.5">
                                <button
                                  onClick={() => onEditDraw(draw)}
                                  className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                                  title="تعديل"
                                  type="button"
                                >
                                  <PencilIcon className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onDeleteDraw(draw.id, draw)}
                                  className="p-1 text-rose-455 hover:text-rose-600 hover:bg-rose-50/50 dark:hover:bg-rose-955/20 rounded transition-colors"
                                  title="حذف"
                                  type="button"
                                >
                                  <TrashIcon className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default LedgerTab;
