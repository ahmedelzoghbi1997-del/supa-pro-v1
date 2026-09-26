import {
  Droplet,
  Sprout,
  Shield,
  Wrench,
  ShieldAlert,
  ShoppingBag,
  Users,
  Lightbulb,
} from 'lucide-react';
import type { DailyLogTask } from '../../types';

// Constants for Quick Auto-completes
export const COMMON_PESTS = [
  'عنكبوت أحمر',
  'بياض زغبي',
  'ذبابة بيضاء',
  'صانعة أنفاق',
  'تربس',
  'توتا أبسلوتا',
  'ديدان ثمار',
  'أعفان جذور',
];

export const COMMON_COMPOUNDS_SPRAY = [
  'بوتاسيوم',
  'فسفور',
  'أحماض أمينية',
  'مبيد فطري نحاسي',
  'مبيد عناكبي',
  'مبيد حشري',
  'كالسيوم وبورون',
];

export const COMMON_COMPOUNDS_FERT = [
  'نترات نشادر',
  'سلفات نشادر',
  'حامض فسفوريك',
  'سلفات بوتاسيوم',
  'سلفات ماغنسيوم',
  'حامض نيتريك',
  'هيوميك أسيد',
  'عناصر صغرى',
];

export const COMMON_AGRI_OPS = [
  'تقليم وتوريق',
  'ترقيع شتلات',
  'عزيق وتنقية حشائش',
  'شد وتوجيه خيوط',
  'تهوية وصيانة شبكة',
  'تعفير كبريت',
  'رش وقائي',
  'تسليك نقاطات',
];

// --- Serialization & Deserialization Helpers for Rich Dynamic Fields ---
export const serializeCompounds = (
  compounds: Array<{ name: string; amount: string }>,
  detailsText: string,
) => {
  const validCompounds = compounds.filter(
    (c) => c.name.trim() !== '' || c.amount.trim() !== '',
  );
  const compoundsStr = validCompounds
    .map((c) => `${c.name.trim()}${c.amount ? ` - ${c.amount.trim()}` : ''}`)
    .join(' + ');
  return `المركبات: ${compoundsStr || 'لا يوجد'} \nتفاصيل: ${detailsText.trim()}`;
};

export const deserializeCompounds = (
  detailsStr: string,
): {
  compounds: Array<{ name: string; amount: string }>;
  detailsText: string;
} => {
  if (!detailsStr || !detailsStr.startsWith('المركبات: ')) {
    return {
      compounds: [{ name: '', amount: '' }],
      detailsText: detailsStr || '',
    };
  }
  try {
    const parts = detailsStr.split('\nتفاصيل: ');
    const compoundsPart = parts[0].replace('المركبات: ', '').trim();
    const detailsText = parts[1] || '';

    if (compoundsPart === 'لا يوجد') {
      return { compounds: [{ name: '', amount: '' }], detailsText };
    }

    const compounds = compoundsPart.split(' + ').map((item) => {
      const cleaned = item.trim();
      const splitIdx = cleaned.indexOf(' - ');
      if (splitIdx !== -1) {
        return {
          name: cleaned.slice(0, splitIdx).trim(),
          amount: cleaned.slice(splitIdx + 3).trim(),
        };
      }
      return { name: cleaned.trim(), amount: '' };
    });

    if (compounds.length === 0) {
      return { compounds: [{ name: '', amount: '' }], detailsText };
    }
    return { compounds, detailsText };
  } catch {
    return { compounds: [{ name: '', amount: '' }], detailsText: detailsStr };
  }
};

export const serializePest = (
  pestName: string,
  severity: string,
  status: string,
  details: string,
) => {
  return `الإصابة: ${pestName} \nالشدة: ${severity} \nالحالة: ${status} \nتفاصيل: ${details}`;
};

export const deserializePest = (text: string) => {
  if (!text || !text.startsWith('الإصابة: ')) {
    return {
      pestName: text || '',
      severity: 'خفيفة',
      status: 'نشطة وتحت العلاج',
      details: text || '',
    };
  }
  try {
    const lines = text.split('\n');
    let pestName = '';
    let severity = 'خفيفة';
    let status = 'نشطة وتحت العلاج';
    let details = '';
    lines.forEach((line) => {
      if (line.startsWith('الإصابة: '))
        pestName = line.replace('الإصابة: ', '').trim();
      else if (line.startsWith('الشدة: '))
        severity = line.replace('الشدة: ', '').trim();
      else if (line.startsWith('الحالة: '))
        status = line.replace('الحالة: ', '').trim();
      else if (line.startsWith('تفاصيل: '))
        details = line.replace('تفاصيل: ', '').trim();
    });
    return { pestName, severity, status, details };
  } catch {
    return {
      pestName: '',
      severity: 'خفيفة',
      status: 'نشطة وتحت العلاج',
      details: text,
    };
  }
};

export const serializeIrrigation = (
  morning: boolean,
  morningMin: number | '',
  evening: boolean,
  eveningMin: number | '',
  notes: string,
) => {
  return `ري صباحي: ${morning ? `${morningMin || 0} دقيقة` : 'لا يوجد'} | ري مسائي: ${evening ? `${eveningMin || 0} دقيقة` : 'لا يوجد'} \nالملاحظات: ${notes.trim()}`;
};

export const deserializeIrrigation = (text: string) => {
  if (!text || !text.startsWith('ري صباحي: ')) {
    return {
      morning: false,
      morningMin: '',
      evening: false,
      eveningMin: '',
      notes: text || '',
    };
  }
  try {
    const morningPart = text.split(' | ')[0].replace('ري صباحي: ', '').trim();
    const eveningPart = text
      .split(' | ')[1]
      .split('\n')[0]
      .replace('ري مسائي: ', '')
      .trim();
    const notesPart = text.includes('\nالملاحظات: ')
      ? text.split('\nالملاحظات: ')[1].trim()
      : '';
    const morning = morningPart !== 'لا يوجد';
    const morningMin = morning
      ? parseInt(morningPart.replace(' دقيقة', '')) || ''
      : '';
    const evening = eveningPart !== 'لا يوجد';
    const eveningMin = evening
      ? parseInt(eveningPart.replace(' دقيقة', '')) || ''
      : '';
    return { morning, morningMin, evening, eveningMin, notes: notesPart };
  } catch {
    return {
      morning: false,
      morningMin: '',
      evening: false,
      eveningMin: '',
      notes: text,
    };
  }
};

export const serializePlanting = (
  plantType: string,
  quantity: number | '',
  unit: string,
  notes: string,
) => {
  return `المحصول: ${plantType.trim()} | الكمية: ${quantity !== '' ? `${quantity} ${unit}` : 'غير محدد'} \nتفاصيل: ${notes.trim()}`;
};

export const deserializePlanting = (text: string) => {
  if (!text || !text.startsWith('المحصول: ')) {
    return { plantType: '', quantity: '', unit: 'شتلة', notes: text || '' };
  }
  try {
    const plantTypePart = text.split(' | ')[0].replace('المحصول: ', '').trim();
    const qtyPart = text
      .split(' | ')[1]
      .split('\n')[0]
      .replace('الكمية: ', '')
      .trim();
    const notesPart = text.includes('\nتفاصيل: ')
      ? text.split('\nتفاصيل: ')[1].trim()
      : '';
    let quantity: number | '' = '';
    let unit = 'شتلة';
    if (qtyPart !== 'غير محدد') {
      const spaceIdx = qtyPart.indexOf(' ');
      if (spaceIdx !== -1) {
        quantity = parseInt(qtyPart.slice(0, spaceIdx)) || '';
        unit = qtyPart.slice(spaceIdx + 1).trim();
      }
    }
    return { plantType: plantTypePart, quantity, unit, notes: notesPart };
  } catch {
    return { plantType: '', quantity: '', unit: 'شتلة', notes: text };
  }
};

export const serializeAgriOps = (ops: string[], notes: string) => {
  return `العمليات: ${ops.join('، ') || 'لا يوجد'} \nملاحظات: ${notes.trim()}`;
};

export const deserializeAgriOps = (text: string) => {
  if (!text || !text.startsWith('العمليات: ')) {
    return { ops: [], notes: text || '' };
  }
  try {
    const parts = text.split('\nملاحظات: ');
    const opsStr = parts[0].replace('العمليات: ', '').trim();
    const notes = parts[1] || '';
    const ops =
      opsStr === 'لا يوجد' ? [] : opsStr.split('، ').map((o) => o.trim());
    return { ops, notes };
  } catch {
    return { ops: [], notes: text };
  }
};

export const deduplicateTasks = (
  taskList: DailyLogTask[],
): DailyLogTask[] => {
  const seen = new Set<string>();
  return taskList
    .map((t) => ({
      ...t,
      id: t.id || crypto.randomUUID(),
    }))
    .filter((t) => {
      if (seen.has(t.id)) {
        return false;
      }
      seen.add(t.id);
      return true;
    });
};

export const getCategoryStyles = (category: string) => {
  switch (category) {
    case 'ري':
      return {
        icon: Droplet,
        color: 'text-sky-500 dark:text-sky-400',
        bg: 'bg-sky-50 dark:bg-sky-900/10',
        border: 'border-sky-100 dark:border-sky-800/40',
        badge:
          'bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300',
      };
    case 'تسميد':
      return {
        icon: Sprout,
        color: 'text-emerald-500 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-900/10',
        border: 'border-emerald-100 dark:border-emerald-800/40',
        badge:
          'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300',
      };
    case 'رش':
      return {
        icon: Shield,
        color: 'text-indigo-500 dark:text-indigo-400',
        bg: 'bg-indigo-50 dark:bg-indigo-900/10',
        border: 'border-indigo-100 dark:border-indigo-800/40',
        badge:
          'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300',
      };
    case 'عمليات زراعية':
      return {
        icon: Wrench,
        color: 'text-orange-500 dark:text-orange-400',
        bg: 'bg-orange-50 dark:bg-orange-900/10',
        border: 'border-orange-100 dark:border-orange-800/40',
        badge:
          'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300',
      };
    case 'زراعة':
      return {
        icon: Sprout,
        color: 'text-teal-500 dark:text-teal-400',
        bg: 'bg-teal-50 dark:bg-teal-900/10',
        border: 'border-teal-100 dark:border-teal-800/40',
        badge:
          'bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300',
      };
    case 'الاصابات والآفات':
    case 'إصابات':
      return {
        icon: ShieldAlert,
        color: 'text-rose-500 dark:text-rose-400',
        bg: 'bg-rose-50 dark:bg-rose-900/10',
        border: 'border-rose-100 dark:border-rose-800/40',
        badge:
          'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300',
      };
    case 'حصاد':
      return {
        icon: ShoppingBag,
        color: 'text-amber-555 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-900/10',
        border: 'border-amber-100 dark:border-amber-800/40',
        badge:
          'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300',
      };
    case 'عمالة':
      return {
        icon: Users,
        color: 'text-blue-500 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-900/10',
        border: 'border-blue-100 dark:border-blue-800/40',
        badge:
          'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
      };
    default:
      return {
        icon: Lightbulb,
        color: 'text-purple-500 dark:text-purple-400',
        bg: 'bg-purple-50 dark:bg-purple-900/10',
        border: 'border-purple-100 dark:border-purple-800/40',
        badge:
          'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300',
      };
  }
};

export const getArabicDayAndMonth = (dateStr: string) => {
  const dateObj = new Date(dateStr);
  const dayOfMonth = dateObj.getDate();
  const monthName = dateObj.toLocaleDateString('ar-EG', { month: 'short' });
  const dayName = dateObj.toLocaleDateString('ar-EG', { weekday: 'long' });
  return { dayOfMonth, monthName, dayName };
};
