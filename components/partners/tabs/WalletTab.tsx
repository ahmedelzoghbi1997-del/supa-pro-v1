import React from 'react';
import StaggerItem from '../../shared/StaggerItem';
import { formatNumber } from '../../../utils/helpers';
import type { Cycle } from '../../../types';

export interface PartnerFinancial {
  id: string;
  label: string;
  percentage: number;
  finalBalance: number;
  closedCyclesProfit: number;
  totalDrawings: number;
  nonCashRepayments: number;
  outstandingDebts: number;
  totalExternalDebt?: number;
  totalPersonalFunding: number;
  [key: string]: any;
}

export interface WalletTabProps {
  partnersFinancials: PartnerFinancial[];
  isViewer: boolean;
  cycles: Cycle[];
  activeCyclesNetProfit: number;
  onOpenConfig: () => void;
  onAddDraw: (partnerId: string, type: 'draw' | 'deposit') => void;
  onViewStatement: (partnerId: string) => void;
  onProfitTransfer: () => void;
  onSettleMerchant: (partnerId: string) => void;
}

export const WalletTab: React.FC<WalletTabProps> = ({
  partnersFinancials,
  isViewer,
  cycles,
  activeCyclesNetProfit,
  onOpenConfig,
  onAddDraw,
  onViewStatement,
  onProfitTransfer,
  onSettleMerchant,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {partnersFinancials.length === 0 && (
        <div className="col-span-full py-12 text-center rounded-[2rem] border-2 border-dashed border-neutral-300 dark:border-neutral-750 bg-neutral-50/50 dark:bg-neutral-900/20">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 font-bold mb-3">
            لا يوجد شركاء محددين لعرض ذممهم المالية
          </p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-6 max-w-md mx-auto leading-relaxed">
            لتفعيل حسابات الشركاء وإدارة أرصدتهم، يرجى التوجه إلى لوحة الإعدادات، ثم الأشخاص والمستخدمين، وإدخال نسبة كل شريك في المزارع.
          </p>
          {!isViewer && (
            <button
              onClick={onOpenConfig}
              className="bg-primary text-white text-xs font-bold px-6 py-2.5 rounded-xl hover:bg-primary-dark transition-colors shadow-sm"
            >
              تحديد نسب الشراكة الجارية
            </button>
          )}
        </div>
      )}

      {partnersFinancials.map((partner, index) => {
        const isOwed = partner.finalBalance >= 0;

        return (
          <StaggerItem key={partner.id} index={index}>
          <div
            className={`bg-white dark:bg-neutral-900 p-5 rounded-2xl border ${
              isOwed
                ? 'border-accent-success/20 dark:border-accent-success/30/60'
                : 'border-accent-danger/20 dark:border-accent-danger/30/60'
            } shadow-sm flex flex-col justify-between transition-all duration-200 relative`}
          >
            <div>
              {/* Header: Partner Label & Percentage */}
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    {partner.label}
                  </h3>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                    النسبة: {partner.percentage}%
                  </span>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    isOwed
                      ? 'bg-accent-success/10 dark:bg-accent-success/20 text-accent-success dark:text-accent-success border border-accent-success/20/60 dark:border-accent-success/30'
                      : 'bg-accent-danger/10 dark:bg-accent-danger/20 text-accent-danger dark:text-accent-danger border border-accent-danger/20/60 dark:border-accent-danger/30'
                  }`}
                >
                  {isOwed ? 'رصيد دائن' : 'رصيد مدين'}
                </span>
              </div>

              {/* Hero Balance */}
              <div className="text-center my-4 py-3 bg-neutral-50/60 dark:bg-neutral-850 rounded-xl border border-neutral-100 dark:border-neutral-800">
                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
                  {isOwed
                    ? 'الصافي المستحق للشريك (دائن)'
                    : 'إجمالي المديونية والمستحقات (مدين)'}
                </span>
                <div
                  className={`text-3xl sm:text-4xl font-black tracking-tight tabular-nums flex items-baseline justify-center gap-1.5 ${
                    isOwed
                      ? 'text-accent-success dark:text-accent-success'
                      : 'text-accent-danger dark:text-accent-danger'
                  }`}
                  dir="ltr"
                >
                  <span>
                    {isOwed ? '+' : '-'}
                    {formatNumber(Math.abs(partner.finalBalance))}
                  </span>
                  <span className="text-xs font-bold text-neutral-400" dir="rtl">
                    ج.م
                  </span>
                </div>
              </div>

              {/* Mini Ledger (List) */}
              <div className="bg-neutral-50 dark:bg-neutral-950/50 rounded-xl border border-neutral-200/60 dark:border-neutral-800 divide-y divide-neutral-200/60 dark:divide-neutral-800 text-xs text-neutral-700 dark:text-neutral-300">
                {/* أرباح عروات مقفلة */}
                <div className="flex justify-between items-center px-3.5 py-2.5">
                  <span className="font-medium text-neutral-600 dark:text-neutral-400">
                    أرباح عروات مقفلة
                  </span>
                  <span className="font-bold text-neutral-900 dark:text-white tabular-nums">
                    {formatNumber(partner.closedCyclesProfit)}{' '}
                    <span className="text-2xs text-neutral-400 font-normal">
                      ج.م
                    </span>
                  </span>
                </div>

                {/* إجمالي مسحوبات نقدية */}
                <div className="flex justify-between items-center px-3.5 py-2.5">
                  <span className="font-medium text-neutral-600 dark:text-neutral-400">
                    إجمالي مسحوبات نقدية
                  </span>
                  <span
                    className="font-bold text-accent-danger dark:text-accent-danger tabular-nums"
                    dir="ltr"
                  >
                    -{formatNumber(partner.totalDrawings)}{' '}
                    <span dir="rtl" className="text-2xs text-neutral-400 font-normal">
                      ج.م
                    </span>
                  </span>
                </div>

                {/* مسدد مرصود (Only if > 0) */}
                {partner.nonCashRepayments > 0 && (
                  <div className="flex justify-between items-center px-3.5 py-2.5">
                    <span className="font-medium text-neutral-600 dark:text-neutral-400">
                      مسدد مرصود
                    </span>
                    <span
                      className="font-bold text-accent-success dark:text-accent-success tabular-nums"
                      dir="ltr"
                    >
                      +{formatNumber(partner.nonCashRepayments)}{' '}
                      <span dir="rtl" className="text-2xs text-neutral-400 font-normal">
                        ج.م
                      </span>
                    </span>
                  </div>
                )}

                {/* التزامات وديون متبقية (Only if > 0) */}
                {partner.outstandingDebts > 0 && (
                  <div className="flex justify-between items-center px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-neutral-600 dark:text-neutral-400">
                        التزامات وديون متبقية
                      </span>
                      {((partner.totalExternalDebt ?? 0) > 0) && !isViewer && (
                        <button
                          type="button"
                          onClick={() => onSettleMerchant(partner.id)}
                          className="text-2xs font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 hover:bg-purple-200 dark:hover:bg-purple-900/60 transition-colors"
                        >
                          سداد جهة التمويل
                        </button>
                      )}
                    </div>
                    <span
                      className="font-bold text-accent-danger dark:text-accent-danger tabular-nums"
                      dir="ltr"
                    >
                      -{formatNumber(partner.outstandingDebts)}{' '}
                      <span dir="rtl" className="text-2xs text-neutral-400 font-normal">
                        ج.م
                      </span>
                    </span>
                  </div>
                )}

                {/* إيداع تمويل شخصي معتمد */}
                {partner.totalPersonalFunding > 0 && (
                  <div className="flex justify-between items-center px-3.5 py-2.5">
                    <span className="font-medium text-neutral-600 dark:text-neutral-400">
                      إيداع تمويل شخصي معتمَد
                    </span>
                    <span
                      className="font-bold text-accent-success dark:text-accent-success tabular-nums"
                      dir="ltr"
                    >
                      +{formatNumber(partner.totalPersonalFunding)}{' '}
                      <span dir="rtl" className="text-2xs text-neutral-400 font-normal">
                        ج.م
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Live Profit Tracker */}
            {(() => {
              const hasActiveCycle = cycles.some((c) => c.status === 'active');
              if (!hasActiveCycle) return null;

              const hasProfit = activeCyclesNetProfit > 0;
              const partnerActiveShare =
                activeCyclesNetProfit * ((partner.percentage || 50) / 100);

              return (
                <div className="mt-3 pt-2.5 border-t border-neutral-150 dark:border-neutral-800 flex justify-between items-center text-xs">
                  <span className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        hasProfit ? 'bg-accent-success animate-pulse' : 'bg-neutral-400'
                      }`}
                    />
                    <span>أرباح الموسم النشط</span>
                  </span>
                  {hasProfit ? (
                    <span
                      className="font-bold text-accent-success dark:text-accent-success tabular-nums"
                      dir="ltr"
                    >
                      +{formatNumber(partnerActiveShare)}{' '}
                      <span dir="rtl" className="text-2xs text-neutral-400 font-normal">
                        ج.م
                      </span>
                    </span>
                  ) : (
                    <span className="text-neutral-400 text-[11px]">قيد التغطية</span>
                  )}
                </div>
              );
            })()}

            {/* Action Buttons */}
            <div className="space-y-2 mt-4">
              {!isViewer && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onAddDraw(partner.id, 'draw')}
                    className="py-2 px-3 bg-accent-danger/10 hover:bg-accent-danger/10 dark:bg-accent-danger/20 dark:hover:bg-accent-danger/20 text-accent-danger dark:text-accent-danger font-bold text-xs rounded-xl border border-accent-danger/20/80 dark:border-accent-danger/30 flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>سحب نقدي</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddDraw(partner.id, 'deposit')}
                    className="py-2 px-3 bg-accent-success/10 hover:bg-accent-success/10 dark:bg-accent-success/20 dark:hover:bg-accent-success/20 text-accent-success dark:text-accent-success font-bold text-xs rounded-xl border border-accent-success/20/80 dark:border-accent-success/30 flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>إيداع / سداد</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => onViewStatement(partner.id)}
                className="w-full py-2 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-white text-white dark:text-neutral-900 font-bold text-xs rounded-xl transition-colors shadow-sm"
              >
                كشف الحساب
              </button>

              {!isViewer && (
                <div className="flex justify-center pt-0.5">
                  <button
                    type="button"
                    onClick={onProfitTransfer}
                    className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors underline underline-offset-2"
                  >
                    تسوية الأرباح
                  </button>
                </div>
              )}
            </div>
          </div>
          </StaggerItem>
        );
      })}
    </div>
  );
};

export default WalletTab;
