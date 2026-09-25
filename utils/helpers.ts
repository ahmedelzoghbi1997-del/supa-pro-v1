import type React from 'react';

export const toWesternNumerals = (value: string | number): string => {
  const stringValue = String(value);
  const arabicNumerals = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  let result = stringValue;
  for (let i = 0; i < 10; i++) {
    result = result.replace(arabicNumerals[i], String(i));
  }
  return result;
};

export const formatCurrency = (amount: number): string => {
  const roundedAmount = Math.round(amount * 100) / 100;
  const isEffectivelyInteger = roundedAmount % 1 === 0;

  const formattedVal = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: isEffectivelyInteger ? 0 : 2,
    maximumFractionDigits: isEffectivelyInteger ? 0 : 2,
  }).format(amount);
  return `${formattedVal} ج.م`;
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US', {
    useGrouping: true,
  }).format(num);
};

export const formatDateShort = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const day = date.getDate();
  const month = date.getMonth() + 1;
  return `${day}/${month}`;
};

export const formatDateFull = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const arDateStr = date.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
  return toWesternNumerals(arDateStr);
};

export const formatWeekdayShort = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('ar-EG', { weekday: 'short' });
};

export const formatNumberWithCommas = (value: string | number): string => {
  const stringValue = String(value || '');
  if (stringValue === '') return '';
  const parts = stringValue.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

export const parseFormattedNumber = (value: string): string => {
  return toWesternNumerals(String(value || '')).replace(/,/g, '');
};

/**
 * الحصول على التاريخ المحلي بصيغة YYYY-MM-DD
 * يتجنب مشاكل توقيت UTC في الساعات الأولى من الصباح
 */
export const getLocalDateString = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * تنسيق التاريخ القصير (شهر-يوم)
 * مثال: 2026-03-25 -> 03-25
 */
export const formatShortDate = (dateString?: string): string => {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[1]}-${parts[2]}`;
  }
  return dateString;
};

/**
 * تنسيق الوقت من صيغة ISO
 * مثال: 14:30
 */
export const formatTime = (dateString?: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  return timeStr.replace('AM', 'ص').replace('PM', 'م');
};

export const formatTimeAgo = (dateString: string | null | undefined): string => {
  if (!dateString) {
    return "غير معروف";
  }
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 5) return "الآن";
  if (seconds < 60) return `منذ ${seconds} ثوانٍ`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    if (minutes === 1) return "منذ دقيقة";
    if (minutes === 2) return "منذ دقيقتين";
    if (minutes >= 3 && minutes <= 10) return `منذ ${minutes} دقائق`;
    return `منذ ${minutes} دقيقة`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    if (hours === 1) return "منذ ساعة";
    if (hours === 2) return "منذ ساعتين";
    if (hours >= 3 && hours <= 10) return `منذ ${hours} ساعات`;
    return `منذ ${hours} ساعة`;
  }

  const days = Math.floor(hours / 24);
  if (days === 1) return "أمس";
  if (days === 2) return "منذ يومين";
  if (days >= 3 && days <= 10) return `منذ ${days} أيام`;
  return `منذ ${days} يوم`;
};

export const calculateInvoiceTotal = (
  priceItems?: { quantity: number; price_per_kg: number }[] | null,
  deductions?: { name: string; amount: number }[] | null
): number => {
  const itemsTotal = (priceItems || []).reduce((acc, item) => {
    const quantity = item?.quantity || 0;
    const price = item?.price_per_kg || 0;
    return acc + quantity * price;
  }, 0);
  const deductionsTotal = (deductions || []).reduce((acc, item) => {
    return acc + (item?.amount || 0);
  }, 0);
  return Math.round((itemsTotal - deductionsTotal) * 100) / 100;
};

export const isUpdateAvailable = (latest: string, current: string): boolean => {
  const latestParts = latest.split('.').map(Number);
  const currentParts = current.split('.').map(Number);
  
  for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
      const l = latestParts[i] || 0;
      const c = currentParts[i] || 0;
      if (l > c) return true;
      if (l < c) return false;
  }
  return false;
};

export const createRipple = (event: React.MouseEvent<HTMLElement>) => {
  const element = event.currentTarget;
  const circle = document.createElement("span");
  const diameter = Math.max(element.clientWidth, element.clientHeight);
  const radius = diameter / 2;

  const rect = element.getBoundingClientRect();
  const rippleX = event.clientX - rect.left - radius;
  const rippleY = event.clientY - rect.top - radius;

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${rippleX}px`;
  circle.style.top = `${rippleY}px`;
  circle.classList.add("ripple");
  
  const oldRipple = element.querySelector(".ripple");
  if (oldRipple) {
    oldRipple.remove();
  }

  element.appendChild(circle);

  circle.addEventListener('animationend', () => {
    if (circle.parentElement) {
      circle.remove();
    }
  });
};

export interface RetainedInvoiceDetails {
  isRetained: boolean;
  retainedAmount: number;
  surplus: number;
}

export const getInvoiceRetainedDetails = (
  invoiceDescription?: string,
  isRetainedFlag?: boolean,
  invoiceTotal?: number
): RetainedInvoiceDetails => {
  const isRetained = Boolean(isRetainedFlag) || 
                     invoiceDescription?.includes('[RETAINED_DEBT]') || 
                     invoiceDescription?.includes('[مرصودة]') || false;

  if (!isRetained) {
    return { isRetained: false, retainedAmount: 0, surplus: 0 };
  }

  const match = invoiceDescription?.match(/\[RETAINED_DEBT:([^\]]*)\]/);
  let retainedAmount = 0;
  let parsedSurplus: number | null = null;

  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed && typeof parsed === 'object') {
        if ('surplus' in parsed && typeof parsed.surplus === 'number') {
          parsedSurplus = parsed.surplus;
        }
        if ('retainedTotal' in parsed && typeof parsed.retainedTotal === 'number') {
          retainedAmount = parsed.retainedTotal;
        } else if ('items' in parsed && typeof (parsed as Record<string, unknown>).items === 'object') {
          const items = (parsed as Record<string, unknown>).items as Record<string, unknown>;
          Object.values(items).forEach((item: unknown) => {
            if (item && typeof item === 'object' && 'allocations' in item) {
              const allocs = (item as Record<string, unknown>).allocations as Record<string, unknown>;
              Object.values(allocs).forEach((v: unknown) => {
                retainedAmount += (parseFloat(String(v)) || 0);
              });
            }
          });
        } else if ('allocations' in parsed) {
          const allocs = (parsed as Record<string, unknown>).allocations as Record<string, unknown>;
          Object.values(allocs).forEach((v: unknown) => {
            retainedAmount += (parseFloat(String(v)) || 0);
          });
        } else {
          Object.values(parsed as Record<string, unknown>).forEach((v: unknown) => {
            retainedAmount += (parseFloat(String(v)) || 0);
          });
        }
      }
    } catch (e) {
      console.error("Failed to parse retained debt payload in helper:", e);
    }
  }

  const total = invoiceTotal ?? 0;
  if (retainedAmount <= 0) {
    retainedAmount = total;
  }
  if (total > 0 && retainedAmount > total) {
    retainedAmount = total;
  }

  const surplus = parsedSurplus !== null ? parsedSurplus : Math.max(0, Math.round((total - retainedAmount) * 100) / 100);
  return { isRetained: true, retainedAmount, surplus };
};
