import React from "react";
import type { Invoice } from "../../../types";
import {
  CalendarIcon,
  TruckIcon,
  ScaleIcon,
  BoxIcon,
} from "../../Icons";
import {
  formatNumber,
  formatCurrency,
  formatShortDate,
} from "../../../utils/helpers";

export interface ReportInvoicesTableProps {
  invoices: Invoice[];
  hydratedInvoices: Invoice[];
  onSelectInvoice: (invoice: any) => void;
}

export const ReportInvoicesTable: React.FC<ReportInvoicesTableProps> = ({
  invoices,
  hydratedInvoices,
  onSelectInvoice,
}) => {
  return (
    <div className="space-y-6 animate-enter">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {hydratedInvoices.map((inv, index) => {
          const totalAmount = (inv as any).totalAmount;
          const totalWeight = (inv as any).totalWeight;
          const animationClass = "animate-stagger-in";
          const delay = `${Math.min(index * 30, 600)}ms`;

          return (
            <div
              key={inv.id}
              onClick={() => onSelectInvoice(inv)}
              className={`
                relative w-full bg-white dark:bg-neutral-800 rounded-[16px] p-3
                shadow-[0_1px_8px_-3px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-5px_rgba(0,0,0,0.1)]
                border border-neutral-100 dark:border-neutral-700/60
                border-r-[2px] border-r-emerald-400/50 dark:border-r-emerald-400/40
                transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-r-emerald-400/80
                cursor-pointer active:scale-[0.99] group
                ${animationClass}
              `}
              style={{
                animationDelay: delay,
              }}
            >
              <div className="flex flex-col gap-1.5">
                {/* Header: Description & Amount */}
                <div className="flex justify-between items-start gap-3">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <p className="font-black text-xs sm:text-sm text-neutral-800 dark:text-neutral-100 break-words line-clamp-1 leading-snug">
                      {inv.description || "فاتورة توريد محصول"}
                    </p>
                    <div className="flex items-center gap-x-3 mt-1 overflow-x-auto scrollbar-hide w-full pb-0.5">
                      <div className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400 text-[10px] sm:text-[11px] shrink-0">
                        <CalendarIcon className="h-3 w-3 flex-shrink-0 opacity-70" />
                        <span className="font-bold whitespace-nowrap text-neutral-600 dark:text-neutral-300">
                          {formatShortDate(inv.date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400 text-[10px] sm:text-[11px] shrink-0">
                        <TruckIcon className="h-3 w-3 flex-shrink-0 opacity-70" />
                        <span className="font-bold whitespace-nowrap text-neutral-600 dark:text-neutral-300">
                          {inv.market}
                        </span>
                      </div>
                      <div className="flex items-center gap-x-2">
                        <div className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400 text-[10px] sm:text-[11px] shrink-0">
                          <ScaleIcon className="h-3 w-3 flex-shrink-0 opacity-70" />
                          <span className="font-bold whitespace-nowrap text-neutral-600 dark:text-neutral-300">
                            {formatNumber(totalWeight)}ك
                          </span>
                        </div>
                        {inv.packaging_count && inv.packaging_count > 0 && (
                          <>
                            <div className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400 text-[10px] sm:text-[11px] shrink-0">
                              <BoxIcon className="h-3 w-3 flex-shrink-0 opacity-70" />
                              <span className="font-bold whitespace-nowrap text-neutral-600 dark:text-neutral-300">
                                {formatNumber(inv.packaging_count)}{" "}
                                {inv.packaging_type === "carton"
                                  ? "كرتونة"
                                  : "قفص"}
                              </span>
                            </div>
                            {totalWeight > 0 && (
                              <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded text-[9px] font-black border border-amber-200/50 dark:border-amber-500/20 shrink-0">
                                <span>⚖️</span>
                                <span>
                                  {(totalWeight / inv.packaging_count).toFixed(
                                    1,
                                  )}{" "}
                                  كج/عبوة
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0 pl-1">
                    <p className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-400 tabular-nums leading-none">
                      {formatCurrency(totalAmount).replace("EGP", "")}
                      <span className="text-[9px] mr-0.5 opacity-50 font-bold text-neutral-500 dark:text-neutral-400">
                        ج.م
                      </span>
                    </p>
                  </div>
                </div>

                {/* Footer: Prices */}
                <div className="flex justify-between items-center pt-1.5 border-t border-neutral-50 dark:border-neutral-700/50 mt-0.5">
                  <div className="flex items-center gap-1 flex-wrap overflow-hidden h-5">
                    {(inv.price_items || []).map((item, idx) => (
                      <div
                        key={idx}
                        className={`text-[9px] font-bold px-1.5 py-px rounded border flex items-center gap-0.5 ${
                          idx === 0
                            ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/30"
                            : "text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700"
                        }`}
                      >
                        <span>{formatNumber(item.price_per_kg)}ج</span>
                        {item.quantity > 0 && (
                          <span className="opacity-60 font-normal">
                            ({formatNumber(item.quantity)})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {invoices.length === 0 && (
        <div className="p-12 text-center text-neutral-400 font-bold bg-white dark:bg-neutral-900 rounded-[2rem] border border-neutral-200 dark:border-neutral-800">
          لا توجد فواتير مسجلة
        </div>
      )}
    </div>
  );
};

export default ReportInvoicesTable;
