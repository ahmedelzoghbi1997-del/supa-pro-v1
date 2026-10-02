import React from "react";
import type { Cycle } from "../../../types";
import type { AppNotification, ReportTabId } from "./types";
import {
  LogoIcon,
  InvoicesIcon,
  TrendingDownIcon,
  TypeIcon,
  ChartBarIcon,
  WalletIcon,
  CreditCardIcon,
  AssetIcon,
  LeafIcon,
} from "../../Icons";
import Button from "../Button";

export interface ReportHeaderProps {
  cycle: Cycle;
  assetName: string;
  notifications: AppNotification[];
  isNotificationOpen: boolean;
  setIsNotificationOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isFontMenuOpen: boolean;
  setIsFontMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  fontSizeLevel: number;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  activeTab: ReportTabId;
  setActiveTab: (tab: ReportTabId) => void;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  cycle,
  assetName,
  notifications,
  isNotificationOpen,
  setIsNotificationOpen,
  isFontMenuOpen,
  setIsFontMenuOpen,
  fontSizeLevel,
  increaseFontSize,
  decreaseFontSize,
  activeTab,
  setActiveTab,
}) => {
  return (
    <>
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-accent-success p-2 rounded-xl">
              <LogoIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-neutral-900 dark:text-white leading-none">
                المحاسب الزراعي
              </h1>
              <p className="text-2xs font-bold text-neutral-400 mt-1">
                تقرير أداء العروة (للقراءة فقط)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className={`!p-2 !rounded-xl transition-all duration-500 ${
                  notifications.length > 0
                    ? "animate-[pulse-glow_2s_ease-in-out_infinite] !bg-white !text-accent-success shadow-md"
                    : isNotificationOpen
                      ? "!bg-accent-success/10 !text-accent-success dark:!bg-accent-success/20 dark:!text-accent-success"
                      : "!bg-neutral-100 dark:!bg-neutral-800 !text-neutral-600 dark:!text-neutral-400 hover:!bg-neutral-200 dark:hover:!bg-neutral-700"
                }`}
                title="آخر التحديثات"
                aria-label="آخر التحديثات"
              >
                <div className="relative">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-bell"
                  >
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                </div>
              </Button>

              {isNotificationOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsNotificationOpen(false)}
                  ></div>
                  <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-100 dark:border-neutral-800 z-50 overflow-hidden animate-enter">
                    <div className="p-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50">
                      <h3 className="text-xs font-black text-neutral-800 dark:text-white">
                        آخر التحديثات
                      </h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((activity) => (
                          <div
                            key={activity.id}
                            className="p-3 border-b border-neutral-100 dark:border-neutral-800 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`p-2 rounded-full shrink-0 ${activity.type === "invoice" ? "bg-accent-success/10 text-accent-success dark:bg-accent-success/20 dark:text-accent-success" : "bg-accent-danger/10 text-accent-danger dark:bg-accent-danger/20 dark:text-accent-danger"}`}
                              >
                                {activity.type === "invoice" ? (
                                  <InvoicesIcon className="w-3 h-3" />
                                ) : (
                                  <TrendingDownIcon className="w-3 h-3" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-2xs font-bold text-neutral-800 dark:text-neutral-200 leading-relaxed">
                                  {activity.label}
                                </p>
                                <div className="flex justify-between items-center mt-1">
                                  <span className="text-2xs text-neutral-400">
                                    {activity.date.toLocaleDateString("ar-EG", {
                                      numberingSystem: "latn",
                                    })}{" "}
                                    {activity.date.toLocaleTimeString("ar-EG", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      numberingSystem: "latn",
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-neutral-400 text-xs italic">
                          لا توجد تحديثات حديثة
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFontMenuOpen(!isFontMenuOpen)}
                className={`!p-2 !rounded-xl transition-colors ${isFontMenuOpen ? "!bg-primary !text-white" : "!bg-neutral-100 dark:!bg-neutral-800 !text-neutral-600 dark:!text-neutral-400 hover:!bg-neutral-200 dark:hover:!bg-neutral-700"}`}
                title="تغيير حجم الخط"
                aria-label="تغيير حجم الخط"
              >
                <TypeIcon className="w-5 h-5" />
              </Button>

              {isFontMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsFontMenuOpen(false)}
                  ></div>
                  <div className="absolute top-full left-0 mt-2 p-2 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-100 dark:border-neutral-800 z-50 flex items-center gap-3 animate-enter min-w-[120px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={increaseFontSize}
                      disabled={fontSizeLevel === 10}
                      className="!w-8 !h-8 !p-0 !rounded-lg !bg-neutral-100 dark:!bg-neutral-800 flex items-center justify-center !text-neutral-600 dark:!text-neutral-300 hover:!bg-neutral-200 dark:hover:!bg-neutral-700 disabled:!opacity-30"
                    >
                      +
                    </Button>
                    <span className="font-bold text-sm text-neutral-800 dark:text-neutral-200 min-w-[20px] text-center">
                      {fontSizeLevel}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={decreaseFontSize}
                      disabled={fontSizeLevel === 1}
                      className="!w-8 !h-8 !p-0 !rounded-lg !bg-neutral-100 dark:!bg-neutral-800 flex items-center justify-center !text-neutral-600 dark:!text-neutral-300 hover:!bg-neutral-200 dark:hover:!bg-neutral-700 disabled:!opacity-30"
                    >
                      -
                    </Button>
                  </div>
                </>
              )}
            </div>
            <div
              className={`px-3 py-1 rounded-full text-2xs font-black uppercase tracking-wider ${cycle.status === "active" ? "bg-accent-success/10 text-accent-success" : "bg-neutral-100 text-neutral-500"}`}
            >
              {cycle.status === "active" ? "نشطة" : "مغلقة"}
            </div>
          </div>
        </div>
        {/* Floating Navigation Pill */}
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md"
          style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 24px))" }}
        >
          <div className="flex items-center justify-between p-1.5 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm border-2 border-accent-success/20 dark:border-accent-success/30 rounded-full shadow-[0_8px_30px_-5px_rgba(16,185,129,0.25)] dark:shadow-[0_8px_30px_-5px_rgba(16,185,129,0.15)]">
            {[
              { id: "overview", label: "نظرة عامة", icon: ChartBarIcon },
              { id: "invoices", label: "الفواتير", icon: InvoicesIcon },
              { id: "treasury", label: "الخزنة", icon: WalletIcon },
              { id: "expenses", label: "المصروفات", icon: CreditCardIcon },
            ].map((tab) => (
              <Button
                key={tab.id}
                variant="ghost"
                onClick={() => setActiveTab(tab.id as ReportTabId)}
                className={`!relative !flex-1 !flex !flex-col !items-center !justify-center !py-2 !px-3 !rounded-full transition-all duration-300 ${
                  activeTab === tab.id
                    ? "!text-accent-success !bg-emerald-200 dark:!bg-accent-success/30 dark:!text-accent-success shadow-sm scale-105"
                    : "!text-neutral-500 hover:!text-neutral-900 dark:hover:!text-white hover:!bg-neutral-100 dark:hover:!bg-neutral-800"
                }`}
              >
                <tab.icon
                  className={`w-5 h-5 mb-1 ${activeTab === tab.id ? "scale-110" : ""} transition-transform duration-300`}
                />
                <span
                  className={`text-2xs ${activeTab === tab.id ? "font-black" : "font-bold"}`}
                >
                  {tab.label}
                </span>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Title Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-neutral-900 dark:text-white mb-2">
            {cycle.name}
          </h2>
          <div className="flex items-center gap-4 text-sm font-bold text-neutral-500">
            <span className="flex items-center gap-1.5">
              <AssetIcon className="w-4 h-4 opacity-60" /> {assetName}
            </span>
            <span className="w-1 h-1 bg-neutral-300 rounded-full"></span>
            <span className="flex items-center gap-1.5">
              <LeafIcon className="w-4 h-4 opacity-60" /> {cycle.seed_type}
            </span>
          </div>
        </div>
        <div className="text-center pl-4 border-r-2 border-neutral-200 dark:border-neutral-800 pr-6 hidden md:block">
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">
            التقييم العام
          </p>
          <p className="text-5xl font-black text-accent-success leading-none">
            {Math.round(cycle.health || 0)}%
          </p>
        </div>
      </div>
    </>
  );
};

export default ReportHeader;
