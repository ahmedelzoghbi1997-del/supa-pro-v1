import React from 'react';
import { formatNumber } from '../../../utils/helpers';
import { WalletIcon } from '../../Icons';

export interface DetailsTabProps {
  partner: {
    id: string;
    label: string;
    percentage: number;
    totalProfitsEarned: number;
    totalCashWithdrawn: number;
    outstandingDebts: number;
    totalPersonalFunding: number;
    finalBalance: number;
    [key: string]: any;
  };
}

export const DetailsTab: React.FC<DetailsTabProps> = ({ partner }) => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-neutral-150 dark:border-neutral-800 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-primary/10 text-primary dark:text-primary">
            <WalletIcon className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base font-black text-neutral-900 dark:text-white">
              كشف الحساب والتقارير: {partner.label}
            </h3>
            <p className="text-[11px] text-slate-455 dark:text-neutral-440 font-extrabold">
              الحصة الشريكة الحالية: {partner.percentage}%
            </p>
          </div>
        </div>
      </div>

      {/* Calculation Methodology Card - Detailed Breakdown */}
      <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/80 dark:border-neutral-800 space-y-3">
        <div className="flex items-center justify-between border-b border-neutral-200/60 dark:border-neutral-800 pb-2">
          <span className="text-xs font-black text-neutral-900 dark:text-white">
            المنهجية المحاسبية المعتمدة للذمة
          </span>
          <span className="text-2xs text-neutral-400 font-bold">
            وفق النظام المحاسبي الزراعي
          </span>
        </div>

        <div className="space-y-2.5 divide-y divide-neutral-200/50 dark:divide-neutral-800/60">
          {/* Line 1: Profits Earned */}
          <div className="space-y-1 pt-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-neutral-800 dark:text-neutral-200">
                إجمالي الأرباح المستحقة من العروات المقفلة
              </span>
              <span
                dir="ltr"
                className="font-black text-accent-success dark:text-accent-success tracking-tight inline-flex items-center gap-0.5"
              >
                <span>+</span>
                <span>{formatNumber(partner.totalProfitsEarned)}</span>
                <span className="text-2xs text-neutral-450 ml-1 font-sans" dir="rtl">
                  ج.م
                </span>
              </span>
            </div>
            <p className="text-2xs text-slate-455 dark:text-neutral-440">
              حصتك المعتمدة الصافية من أرباح العروات المنتهية
            </p>
          </div>

          {/* Line 2: Cash Withdrawn */}
          <div className="space-y-1 pt-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-neutral-800 dark:text-neutral-200">
                إجمالي السحب النقدي المباشر
              </span>
              <span
                dir="ltr"
                className="font-bold text-accent-danger tracking-tight inline-flex items-center gap-0.5"
              >
                <span>-</span>
                <span>{formatNumber(partner.totalCashWithdrawn)}</span>
                <span className="text-2xs text-neutral-450 ml-1 font-sans" dir="rtl">
                  ج.م
                </span>
              </span>
            </div>
            <p className="text-2xs text-slate-455 dark:text-neutral-440">
              التمويلات والسلف النقدية المسحوبة من الخزينة لحسابك
            </p>
          </div>

          {/* Line 3: Outstanding Debts */}
          {partner.outstandingDebts > 0 && (
            <div className="space-y-1 pt-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-neutral-800 dark:text-neutral-200">
                  التزامات وديون مشتركة متبقية
                </span>
                <span
                  dir="ltr"
                  className="font-black text-rose-550 tracking-tight inline-flex items-center gap-0.5"
                >
                  <span>-</span>
                  <span>{formatNumber(partner.outstandingDebts)}</span>
                  <span className="text-2xs text-neutral-450 ml-1 font-sans" dir="rtl">
                    ج.م
                  </span>
                </span>
              </div>
              <p className="text-2xs text-slate-455 dark:text-neutral-440">
                صافي المتبقي من الديون والالتزامات المشتركة المخصصة لحسابك
              </p>
            </div>
          )}

          {/* Line 4: Personal Funding / Deposits */}
          {partner.totalPersonalFunding > 0 && (
            <div className="space-y-1 pt-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-neutral-800 dark:text-neutral-200">
                  إيداعات كاش وتمويل شخصي للخزنة
                </span>
                <span
                  dir="ltr"
                  className="font-black text-accent-success tracking-tight inline-flex items-center gap-0.5"
                >
                  <span>+</span>
                  <span>{formatNumber(partner.totalPersonalFunding)}</span>
                  <span className="text-2xs text-neutral-450 ml-1 font-sans" dir="rtl">
                    ج.م
                  </span>
                </span>
              </div>
              <p className="text-2xs text-slate-450 dark:text-neutral-450">
                تسويات نقدية أو تمويل شخصي تم إيداعه بالخزنة لتعزيز رصيدك
              </p>
            </div>
          )}
        </div>

        {/* Divider dotted before total */}
        <div className="border-t border-dashed border-neutral-300 dark:border-neutral-700 my-2" />

        {/* Highlighted Total Hero Row */}
        <div className="bg-white dark:bg-neutral-950 p-4 rounded-xl border border-neutral-150 dark:border-neutral-800 shadow-sm flex justify-between items-center">
          <div>
            <p className="text-xs font-black text-neutral-900 dark:text-white">
              صافي مستحقات الذمة النهائية
            </p>
            <span
              className={`inline-block text-2xs font-black px-2 py-0.5 rounded-md mt-1 ${
                partner.finalBalance >= 0
                  ? 'bg-accent-success/10 dark:bg-emerald-955/20 text-accent-success'
                  : 'bg-accent-danger/10 dark:bg-rose-955/20 text-accent-danger'
              }`}
            >
              {partner.finalBalance >= 0
                ? 'دائن (لك مستحقات تصفية جارية)'
                : 'مدين (مستوجب سداد العجز للخزنة)'}
            </span>
          </div>
          <div dir="ltr" className="text-right">
            <span
              className={`text-2xl font-black ${
                partner.finalBalance >= 0 ? 'text-accent-success' : 'text-rose-550'
              }`}
            >
              {partner.finalBalance >= 0 ? '+' : '-'}
              {formatNumber(Math.abs(partner.finalBalance))}
            </span>
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 ml-1" dir="rtl">
              ج.م
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailsTab;
