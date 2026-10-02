import React from 'react';
import { UserIcon, UsersIcon } from '../Icons';

export const renderShiftBadge = (shift: string | null | undefined) => {
  const s = shift || 'morning';
  if (s === 'morning') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-2xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30">
        🌅 صباحية
      </span>
    );
  }
  if (s === 'evening') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-2xs font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/30">
        🌇 مسائية
      </span>
    );
  }
  if (s === 'full_day') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-2xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30">
        ☀️ يوم كامل
      </span>
    );
  }
  return null;
};

export const renderEntryIcon = (workerName: string, activity: string, description?: string) => {
  const text = `${workerName || ""} ${activity || ""} ${description || ""}`.toLowerCase();

  if (
    text.includes("فطار") ||
    text.includes("فطور") ||
    text.includes("أكل") ||
    text.includes("طعام") ||
    text.includes("غداء") ||
    text.includes("عشاء") ||
    text.includes("وجبة") ||
    text.includes("وجبات")
  ) {
    return <span className="text-xs select-none">🍞</span>;
  }

  if (
    text.includes("مواصلات") ||
    text.includes("سفر") ||
    text.includes("عربية") ||
    text.includes("نقل") ||
    text.includes("ركوب") ||
    text.includes("تاكسي") ||
    text.includes("بنزين") ||
    text.includes("سولار") ||
    text.includes("وقود")
  ) {
    return <span className="text-xs select-none">🚌</span>;
  }

  if (
    text.includes("شاي") ||
    text.includes("قهوة") ||
    text.includes("مشروبات") ||
    text.includes("ضيافة") ||
    text.includes("سكر") ||
    text.includes("مياه")
  ) {
    return <span className="text-xs select-none">☕</span>;
  }

  if (
    text.includes("أدوات") ||
    text.includes("معدات") ||
    text.includes("صيانة") ||
    text.includes("قطع غيار") ||
    text.includes("عده") ||
    text.includes("عدة")
  ) {
    return <span className="text-xs select-none">🛠️</span>;
  }

  if (
    workerName === "منصرف إضافي" ||
    text.includes("منصرف") ||
    text.includes("مصاريف") ||
    text.includes("مستلزمات") ||
    text.includes("شراء")
  ) {
    return <span className="text-xs select-none">💸</span>;
  }

  if (
    workerName === "عمالة يومية" ||
    workerName === "مجموعة / بدون اسم" ||
    text.includes("مجموعة") ||
    text.includes("طقم") ||
    text.includes("عمال")
  ) {
    return <UsersIcon className="w-3.5 h-3.5" />;
  }

  return <UserIcon className="w-3.5 h-3.5" />;
};
