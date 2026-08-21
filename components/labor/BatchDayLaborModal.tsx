import React, { useState, useMemo, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { useSettings } from '../../contexts/SettingsContext';
import { CheckIcon, PlusIcon, SparklesIcon, CalendarIcon } from '../Icons';
import type { Expense } from '../../types';
import { formatNumber } from '../../utils/helpers';
import { renderShiftBadge, renderEntryIcon } from './LaborLedger';
import { triggerSaveHaptic } from '../../lib/haptics';

interface BatchDayLaborModalProps {
    date: string;
    expenses: Expense[];
    onClose: () => void;
}

interface ParsedExpenseState {
    id: string;
    originalExpense: Expense;
    workerName: string;
    greenhousePrefix: string;
    isOperational: boolean;
    operationalDesc: string;
    isCredit: boolean;
    isAdvanceOrSettlement: boolean;
    suffix: string;
    additionalNotes: string;
    selectedActivities: string[];
    shiftType: 'morning' | 'evening' | 'full_day';
    amount: number;
    isModified: boolean;
}

interface LaborRowItemProps {
    row: ParsedExpenseState;
    isChecked: boolean;
    laborActivities: string[];
    onToggleSelect: (id: string) => void;
    onToggleActivity: (id: string, activity: string) => void;
    onRemoveActivity: (id: string, activity: string) => void;
}

const LaborRowItem = React.memo<LaborRowItemProps>(({
    row,
    isChecked,
    laborActivities,
    onToggleSelect,
    onToggleActivity,
    onRemoveActivity
}) => {
    const isWage = !row.isOperational && !row.isAdvanceOrSettlement;

    return (
        <div
            className={`p-3 rounded-2xl border transition-all ${
                row.isModified
                    ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80 shadow-xs'
                    : row.isOperational
                    ? 'bg-neutral-50/80 dark:bg-neutral-900/40 border-neutral-200/80 dark:border-neutral-800'
                    : isChecked
                    ? 'bg-white dark:bg-neutral-900 border-indigo-200 dark:border-indigo-900/60 shadow-2xs'
                    : 'bg-white dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-800 opacity-80'
            }`}
        >
            <div className="flex items-start justify-between gap-2.5">
                {/* Checkbox / Lock Icon and Details */}
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    {isWage ? (
                        <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => onToggleSelect(row.id)}
                            className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600 shrink-0"
                        />
                    ) : (
                        <div 
                            className="mt-0.5 w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 dark:text-neutral-500 shrink-0 text-[10px]"
                            title="منصرف إضافي / تشغيلي مستقل غير مرتبط بأنشطة العمالة"
                        >
                            🔒
                        </div>
                    )}

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <div className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-xs shrink-0">
                                {renderEntryIcon(row.workerName, row.selectedActivities.join(' '), row.originalExpense.description)}
                            </div>
                            <span className="text-xs font-black text-neutral-900 dark:text-neutral-100">
                                {row.workerName}
                            </span>
                            {isWage && renderShiftBadge(row.shiftType)}
                            
                            {row.isOperational && (
                                <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                                    منصرف تشغيلي / إضافي
                                </span>
                            )}

                            {row.isAdvanceOrSettlement && (
                                <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                                    دفعة / سداد مالي
                                </span>
                            )}

                            {row.isModified && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500 text-white">
                                    مُعدّل
                                </span>
                            )}
                        </div>

                        {/* Activity Selector for Wage Workers */}
                        {isWage ? (
                            <div className="mt-2 space-y-1.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400">الأنشطة المحددة:</span>
                                    {row.selectedActivities.map(act => (
                                        <span
                                            key={act}
                                            className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md font-black text-[11px] border border-indigo-200 dark:border-indigo-800 shadow-2xs"
                                        >
                                            <span>{act}</span>
                                            {row.selectedActivities.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onRemoveActivity(row.id, act);
                                                    }}
                                                    className="text-indigo-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer font-bold ml-0.5 text-xs"
                                                    title="حذف هذا النشاط"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </span>
                                    ))}
                                </div>

                                {/* Mini fast activity picker */}
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                    {/* Any custom or legacy activity not in laborActivities */}
                                    {row.selectedActivities
                                        .filter(act => !laborActivities.includes(act))
                                        .map(customAct => (
                                            <button
                                                key={customAct}
                                                type="button"
                                                onClick={() => onRemoveActivity(row.id, customAct)}
                                                className="text-[11px] px-2 py-0.5 rounded-md border transition-all cursor-pointer font-black bg-amber-500 border-amber-500 text-white shadow-2xs flex items-center gap-1"
                                                title="نشاط مخصص/قديم - اضغط للحذف"
                                            >
                                                <span>{customAct}</span>
                                                <span className="text-[10px]">✕</span>
                                            </button>
                                        ))
                                    }

                                    {laborActivities.map(act => {
                                        const isSelected = row.selectedActivities.includes(act);
                                        return (
                                            <button
                                                key={act}
                                                type="button"
                                                onClick={() => onToggleActivity(row.id, act)}
                                                className={`text-[11px] px-2 py-0.5 rounded-md border transition-all cursor-pointer font-bold ${
                                                    isSelected
                                                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs font-black'
                                                        : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                                }`}
                                            >
                                                {act} {isSelected ? '✓' : ''}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-300 font-bold flex items-center gap-1.5 bg-neutral-100/70 dark:bg-neutral-800/60 p-1.5 rounded-lg">
                                <span className="text-[10px] text-neutral-400">تفاصيل المنصرف:</span>
                                <span>{row.operationalDesc || row.originalExpense.description}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Amount and Payment method */}
                <div className="text-left shrink-0">
                    <div className="flex items-center gap-1 justify-end font-mono font-black text-xs text-neutral-900 dark:text-neutral-100">
                        <span className="text-[9px] text-neutral-400">ج.م</span>
                        <span>{formatNumber(row.amount)}</span>
                    </div>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded mt-1 inline-block ${
                        row.isCredit 
                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' 
                            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                    }`}>
                        {row.isCredit ? 'آجل' : 'نقداً'}
                    </span>
                </div>
            </div>
        </div>
    );
});
LaborRowItem.displayName = 'LaborRowItem';

const BatchDayLaborModal: React.FC<BatchDayLaborModalProps> = ({ date, expenses, onClose }) => {
    const { updateExpense } = useData();
    const { settings, updateSettings } = useSettings();
    const [isSaving, setIsSaving] = useState(false);
    const [saveProgress, setSaveProgress] = useState<{ current: number; total: number } | null>(null);

    const defaultStandardActivities = [
        "جمع وحصاد",
        "رش ووقاية",
        "تسميد وري",
        "تقليم وتربيط",
        "عزيق ونظافة وحشائش",
        "تعبئة وتغليف",
        "تحميل وتنزيل",
        "صيانة وشبك",
        "تجهيز شتلات وزراعة",
    ];

    const laborActivities = useMemo(() => {
        const list = settings?.laborActivities || [];
        return list.length > 0 ? list : defaultStandardActivities;
    }, [settings?.laborActivities]);

    const greenhouses = useMemo(() => {
        return settings?.greenhouses || [
            { id: 'mine', name: 'الصوبة الخاصة بي', type: 'mine', is_default: true },
            { id: 'father', name: 'صوبة أبي وأخي', type: 'external' }
        ];
    }, [settings?.greenhouses]);

    // Parse all expenses into editable states
    const [rows, setRows] = useState<ParsedExpenseState[]>(() => {
        return expenses.map(exp => {
            const desc = exp.description || '';
            let greenhousePrefix = '';
            
            // Detect Greenhouse prefix
            const foundGh = greenhouses.find(gh => desc.includes(gh.name));
            if (foundGh) {
                if (foundGh.type === 'mine') {
                    greenhousePrefix = `🌿 ${foundGh.name} | `;
                } else {
                    greenhousePrefix = `🏠 ${foundGh.name} | `;
                }
            }

            const cleanDesc = desc
                .replace(/^🌿\s*[^|]+\|\s*/, '')
                .replace(/^🏠\s*[^|]+\|\s*/, '')
                .trim();

            const isOperational = cleanDesc.includes('منصرف عمالة:') || 
                                  cleanDesc.includes('فطار') ||
                                  cleanDesc.includes('مواصلات') ||
                                  cleanDesc.includes('إكرامية') ||
                                  cleanDesc.includes('إكرام') ||
                                  cleanDesc.includes('شاي') ||
                                  cleanDesc.includes('أكل') ||
                                  cleanDesc.includes('طعام') ||
                                  cleanDesc.includes('وجبة') ||
                                  cleanDesc.includes('ضيافة') ||
                                  cleanDesc.includes('نثريات') ||
                                  cleanDesc.includes('بنزين') ||
                                  cleanDesc.includes('سفر') ||
                                  cleanDesc.includes('منصرف إضافي') ||
                                  cleanDesc.includes('منصرف تشغيلي') ||
                                  cleanDesc.startsWith('منصرف:');

            const isAdvanceOrSettlement = exp.amount < 0 || 
                cleanDesc.includes('سداد') || 
                cleanDesc.includes('تصفية') || 
                cleanDesc.includes('سلفة') || 
                cleanDesc.includes('سلفية') || 
                cleanDesc.includes('تسديد') ||
                cleanDesc.includes('دفعة');

            let workerName = 'يومية بدون اسم';
            let rawActivity = 'جمع وحصاد';
            let operationalDesc = '';
            let additionalNotes = '';
            let suffix = '';

            if (isOperational) {
                const match = cleanDesc.match(/منصرف عمالة:\s*([^|]+)/);
                operationalDesc = match ? match[1].trim() : cleanDesc.replace(/^منصرف:\s*/, '').trim();
                workerName = 'منصرف تشغيلي / إضافي';
            } else if (cleanDesc.includes('عامل:')) {
                const parts = cleanDesc.split('|').map(p => p.trim());
                const workerPart = parts.find(p => p.startsWith('عامل:'));
                if (workerPart) {
                    workerName = workerPart.replace('عامل:', '').trim();
                }
                const otherParts = parts.filter(p => p !== workerPart);
                if (otherParts.length > 0) {
                    rawActivity = otherParts[0].replace(/\(يومية عمل.*?\)/, '').trim();
                    additionalNotes = otherParts.slice(1).join(' | ');
                }
                if (cleanDesc.includes('(يومية عمل آجل)')) {
                    suffix = ' (يومية عمل آجل)';
                }
            } else if (cleanDesc.includes('يومية بدون اسم')) {
                workerName = 'يومية بدون اسم';
                const parts = cleanDesc.split('|').map(p => p.trim());
                const firstPart = parts[0];
                const dashMatch = firstPart.indexOf('-');
                if (dashMatch !== -1) {
                    rawActivity = firstPart.substring(dashMatch + 1).replace(/\(يومية عمل.*?\)/, '').trim();
                    additionalNotes = parts.slice(1).join(' | ');
                } else if (parts.length > 1) {
                    rawActivity = parts[1].replace(/\(يومية عمل.*?\)/, '').trim();
                    additionalNotes = parts.slice(2).join(' | ');
                }
                if (cleanDesc.includes('(يومية عمل آجل)')) {
                    suffix = ' (يومية عمل آجل)';
                }
            } else {
                rawActivity = cleanDesc;
            }

            const rawTokens = rawActivity
                .split(/\s*(?:\+|\،|\,|\/|\|)\s*/)
                .map(s => s.trim())
                .filter(Boolean);

            const refinedTokens: string[] = [];
            for (const token of rawTokens) {
                if (laborActivities.includes(token)) {
                    refinedTokens.push(token);
                    continue;
                }

                if (token.includes(' و ')) {
                    const subTokens = token.split(/\s+و\s+/).map(s => s.trim()).filter(Boolean);
                    refinedTokens.push(...subTokens);
                    continue;
                }

                // Check compound without space (e.g. "لف وبرعمه")
                let matched = false;
                for (const act of laborActivities) {
                    if (token.startsWith(act + 'و') || token.startsWith(act + ' و')) {
                        const rest = token.substring(act.length).replace(/^[\sو]+/, '').trim();
                        if (rest) {
                            refinedTokens.push(act, rest);
                            matched = true;
                            break;
                        }
                    }
                }
                if (!matched) {
                    refinedTokens.push(token);
                }
            }

            const parsedActivities = Array.from(new Set(refinedTokens.map(s => s.trim()).filter(Boolean)));

            return {
                id: exp.id,
                originalExpense: exp,
                workerName,
                greenhousePrefix,
                isOperational,
                operationalDesc,
                isCredit: exp.payment_method === 'credit',
                isAdvanceOrSettlement,
                suffix,
                additionalNotes,
                selectedActivities: isOperational ? [] : (parsedActivities.length > 0 ? parsedActivities : ['جمع وحصاد']),
                shiftType: (exp.shift_type as 'morning' | 'evening' | 'full_day') || 'morning',
                amount: exp.amount,
                isModified: false
            };
        });
    });

    // Wage rows only (excluding operational & settlements)
    const wageRows = useMemo(() => {
        return rows.filter(r => !r.isOperational && !r.isAdvanceOrSettlement);
    }, [rows]);

    const operationalRowsCount = useMemo(() => {
        return rows.filter(r => r.isOperational || r.isAdvanceOrSettlement).length;
    }, [rows]);

    // Checkbox selections for batch actions: STRICTLY only wage rows by default!
    const [selectedIds, setSelectedIds] = useState<string[]>(() => {
        return rows.filter(r => !r.isOperational && !r.isAdvanceOrSettlement).map(r => r.id);
    });
    
    const [bulkMode, setBulkMode] = useState<'multi' | 'replace'>('multi');

    // Selected wage rows
    const selectedWageRows = useMemo(() => {
        return rows.filter(r => selectedIds.includes(r.id) && !r.isOperational && !r.isAdvanceOrSettlement);
    }, [rows, selectedIds]);

    // Activities present in ALL selected wage workers
    const commonActivities = useMemo(() => {
        if (selectedWageRows.length === 0) return [];
        const firstRowActivities = selectedWageRows[0].selectedActivities;
        return firstRowActivities.filter(act => 
            selectedWageRows.every(row => row.selectedActivities.includes(act))
        );
    }, [selectedWageRows]);

    // Activities present in AT LEAST ONE selected wage worker
    const anyActivities = useMemo(() => {
        const set = new Set<string>();
        selectedWageRows.forEach(row => {
            row.selectedActivities.forEach(act => set.add(act));
        });
        return Array.from(set);
    }, [selectedWageRows]);

    // Inline add new activity
    const [isCreatingNewActivity, setIsCreatingNewActivity] = useState(false);
    const [newActivityInput, setNewActivityInput] = useState('');

    const toggleSelectAll = () => {
        if (selectedIds.length === wageRows.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(wageRows.map(r => r.id));
        }
    };

    const toggleSelectRow = useCallback((id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    }, []);

    const handleApplyBulkActivity = (activityToApply: string) => {
        if (!activityToApply || selectedIds.length === 0) return;

        if (bulkMode === 'replace') {
            // Single replace mode: set ONLY this activity for all selected
            setRows(prev => prev.map(row => {
                if (!selectedIds.includes(row.id) || row.isOperational || row.isAdvanceOrSettlement) {
                    return row;
                }
                return {
                    ...row,
                    selectedActivities: [activityToApply],
                    isModified: true
                };
            }));
            return;
        }

        // Multi-select / Toggle mode (Default):
        const isCommon = commonActivities.includes(activityToApply);

        setRows(prev => prev.map(row => {
            if (!selectedIds.includes(row.id) || row.isOperational || row.isAdvanceOrSettlement) {
                return row;
            }

            let updatedActivities: string[];
            if (isCommon) {
                if (row.selectedActivities.length <= 1) {
                    updatedActivities = row.selectedActivities;
                } else {
                    updatedActivities = row.selectedActivities.filter(a => a !== activityToApply);
                }
            } else {
                // When adding, clean out placeholders or any compound legacy strings containing activityToApply
                const cleaned = row.selectedActivities.filter(a => {
                    if (a === 'عمل عام' || a === 'جمع وحصاد' || a === 'غير محدد') return false;
                    if (a.includes(activityToApply) && a !== activityToApply) return false;
                    return true;
                });
                updatedActivities = Array.from(new Set([...cleaned, activityToApply]));
            }

            return {
                ...row,
                selectedActivities: updatedActivities.length > 0 ? updatedActivities : [activityToApply],
                isModified: true
            };
        }));
    };

    const handleRemoveBulkActivity = (activityToRemove: string) => {
        if (!activityToRemove || selectedIds.length === 0) return;

        setRows(prev => prev.map(row => {
            if (!selectedIds.includes(row.id) || row.isOperational || row.isAdvanceOrSettlement) {
                return row;
            }
            if (row.selectedActivities.length <= 1) return row;

            return {
                ...row,
                selectedActivities: row.selectedActivities.filter(a => a !== activityToRemove),
                isModified: true
            };
        }));
    };

    const removeRowActivity = useCallback((rowId: string, activityToRemove: string) => {
        setRows(prev => prev.map(row => {
            if (row.id !== rowId || row.isOperational || row.isAdvanceOrSettlement) return row;
            const updated = row.selectedActivities.filter(a => a !== activityToRemove);
            return {
                ...row,
                selectedActivities: updated.length > 0 ? updated : ['عمل عام'],
                isModified: true
            };
        }));
    }, []);

    const toggleRowActivity = useCallback((rowId: string, activity: string) => {
        setRows(prev => prev.map(row => {
            if (row.id !== rowId || row.isOperational || row.isAdvanceOrSettlement) return row;
            
            const exists = row.selectedActivities.includes(activity);
            let updatedActivities: string[];
            if (exists) {
                if (row.selectedActivities.length <= 1) {
                    return row; // Don't allow empty activity list
                }
                updatedActivities = row.selectedActivities.filter(a => a !== activity);
            } else {
                // Clean out placeholders or legacy compounds containing this activity
                const cleaned = row.selectedActivities.filter(a => {
                    if (a === 'عمل عام' || a === 'جمع وحصاد' || a === 'غير محدد') return false;
                    if (a.includes(activity) && a !== activity) return false;
                    return true;
                });
                updatedActivities = Array.from(new Set([...cleaned, activity]));
            }

            return {
                ...row,
                selectedActivities: updatedActivities.length > 0 ? updatedActivities : [activity],
                isModified: true
            };
        }));
    }, []);

    const handleCreateNewActivity = () => {
        const trimmed = newActivityInput.trim();
        if (!trimmed) return;

        if (!laborActivities.includes(trimmed)) {
            updateSettings({ laborActivities: [...laborActivities, trimmed] });
        }

        handleApplyBulkActivity(trimmed);
        setNewActivityInput('');
        setIsCreatingNewActivity(false);
    };

    const modifiedCount = rows.filter(r => r.isModified && !r.isOperational && !r.isAdvanceOrSettlement).length;

    const handleSaveAll = async () => {
        triggerSaveHaptic();
        const modifiedRows = rows.filter(r => r.isModified && !r.isOperational && !r.isAdvanceOrSettlement);
        if (modifiedRows.length === 0) {
            onClose();
            return;
        }

        setIsSaving(true);
        setSaveProgress({ current: 0, total: modifiedRows.length });

        try {
            for (let i = 0; i < modifiedRows.length; i++) {
                const row = modifiedRows[i];
                const workerStr = row.workerName.trim() ? `عامل: ${row.workerName.trim()}` : 'يومية بدون اسم';
                const uniqueActs = Array.from(new Set(row.selectedActivities.map(a => a.trim()).filter(Boolean)));
                const actStr = uniqueActs.join(' + ') || 'عمل عام';
                const noteStr = row.additionalNotes.trim() ? ` | ${row.additionalNotes.trim()}` : '';
                const suffixStr = row.isCredit ? ' (يومية عمل آجل)' : '';

                const finalDescription = `${row.greenhousePrefix}${workerStr} | ${actStr}${suffixStr}${noteStr}`;

                await updateExpense(row.id, {
                    description: finalDescription,
                    shift_type: row.shiftType,
                });

                setSaveProgress({ current: i + 1, total: modifiedRows.length });
            }
            onClose();
        } catch (err) {
            console.error('Error saving batch day changes:', err);
        } finally {
            setIsSaving(false);
        }
    };

    // Format human readable date
    const dateFormatted = useMemo(() => {
        const d = new Date(date);
        return d.toLocaleDateString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }, [date]);

    return (
        <div className="space-y-4 text-right max-h-[85vh] flex flex-col" dir="rtl">
            {/* Header Banner */}
            <div className="bg-indigo-50 dark:bg-indigo-950/40 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between flex-wrap gap-2 shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                        <CalendarIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-indigo-950 dark:text-indigo-200">{dateFormatted}</h3>
                        <p className="text-xs font-bold text-indigo-700/80 dark:text-indigo-400">
                            {wageRows.length} يومية عمالة {operationalRowsCount > 0 ? `• ${operationalRowsCount} منصرف تشغيلي` : ''} • إجمالي {formatNumber(rows.reduce((s, r) => s + r.amount, 0))} ج.م
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {modifiedCount > 0 && (
                        <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-amber-500 text-white shadow-2xs animate-pulse">
                            {modifiedCount} يومية تم تعديلها
                        </span>
                    )}
                </div>
            </div>

            {/* Quick Bulk Action Control Panel (Only for Wage Records) */}
            {wageRows.length > 0 && (
                <div className="bg-neutral-50 dark:bg-neutral-900/70 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-2.5 shrink-0">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={toggleSelectAll}
                                className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                                <CheckIcon className="w-4 h-4" />
                                <span>{selectedIds.length === wageRows.length ? 'إلغاء تحديد الكل' : `تحديد جميع العمال (${wageRows.length})`}</span>
                            </button>
                            <span className="text-[11px] font-bold text-neutral-400">
                                ({selectedIds.length} عامل محدد من أصل {wageRows.length})
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5 bg-white dark:bg-neutral-800 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-[10px] font-bold">
                            <button
                                type="button"
                                onClick={() => setBulkMode('multi')}
                                className={`px-2 py-1 rounded-md transition-all cursor-pointer ${bulkMode === 'multi' ? 'bg-indigo-600 text-white font-black shadow-2xs' : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'}`}
                            >
                                تحديد متعدد وتوحيد
                            </button>
                            <button
                                type="button"
                                onClick={() => setBulkMode('replace')}
                                className={`px-2 py-1 rounded-md transition-all cursor-pointer ${bulkMode === 'replace' ? 'bg-indigo-600 text-white font-black shadow-2xs' : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'}`}
                            >
                                استبدال بنشاط واحد
                            </button>
                        </div>
                    </div>

                    {/* Bulk Activity Quick Chips */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-black text-neutral-700 dark:text-neutral-300">
                            <span className="flex items-center gap-1">
                                <SparklesIcon className="w-3.5 h-3.5 text-amber-500" />
                                <span>
                                    {bulkMode === 'multi'
                                        ? `اضغط على أي نشاط لإضافته أو إزالته من العمال المحددين (${selectedWageRows.length}):`
                                        : `اضغط على أي نشاط لجعله النشاط الوحيد للعمال المحددين (${selectedWageRows.length}):`
                                    }
                                </span>
                            </span>
                            
                            <button
                                type="button"
                                onClick={() => setIsCreatingNewActivity(!isCreatingNewActivity)}
                                className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer text-[10px]"
                            >
                                <PlusIcon className="w-3 h-3" />
                                <span>إضافة نشاط جديد</span>
                            </button>
                        </div>

                        {isCreatingNewActivity && (
                            <div className="flex items-center gap-1.5 pt-1">
                                <input
                                    type="text"
                                    autoFocus
                                    value={newActivityInput}
                                    onChange={e => setNewActivityInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleCreateNewActivity();
                                        }
                                    }}
                                    placeholder="اسم النشاط الجديد..."
                                    className="flex-1 bg-white dark:bg-neutral-900 border border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none text-right"
                                />
                                <button
                                    type="button"
                                    onClick={handleCreateNewActivity}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black transition-colors cursor-pointer shrink-0"
                                >
                                    تطبيق وإضافة
                                </button>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-1.5">
                            {laborActivities.map(act => {
                                const isCommon = commonActivities.includes(act);
                                const isPartial = !isCommon && anyActivities.includes(act);

                                return (
                                    <button
                                        key={act}
                                        type="button"
                                        disabled={selectedIds.length === 0}
                                        onClick={() => handleApplyBulkActivity(act)}
                                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-bold select-none flex items-center gap-1 ${
                                            selectedIds.length === 0
                                                ? 'opacity-40 cursor-not-allowed bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-400'
                                                : isCommon
                                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs font-black ring-2 ring-emerald-500/30'
                                                : isPartial
                                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-dashed border-emerald-500 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                                                : 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-neutral-700 active:scale-95 shadow-2xs'
                                        }`}
                                    >
                                        <span>{act}</span>
                                        {isCommon && <span className="text-[11px]">✓</span>}
                                        {isPartial && <span className="text-[10px] opacity-75">(جزئي)</span>}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Live active shared activities banner */}
                        {commonActivities.length > 0 && selectedWageRows.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap pt-1 bg-white/80 dark:bg-neutral-800/80 px-2.5 py-1.5 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 text-[11px]">
                                <span className="font-black text-neutral-600 dark:text-neutral-300 shrink-0">
                                    الأنشطة المشتركة المطبقة ({commonActivities.length}):
                                </span>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {commonActivities.map(act => (
                                        <span
                                            key={act}
                                            className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-700 font-black text-[10.5px]"
                                        >
                                            <span>{act}</span>
                                            {commonActivities.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveBulkActivity(act);
                                                    }}
                                                    className="w-3.5 h-3.5 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-800 flex items-center justify-center text-[9px] cursor-pointer"
                                                    title="إزالة هذا النشاط من المحددين"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* List of Rows for the Day */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[220px]">
                {rows.map(row => {
                    const isWage = !row.isOperational && !row.isAdvanceOrSettlement;
                    const isChecked = isWage && selectedIds.includes(row.id);

                    return (
                        <LaborRowItem
                            key={row.id}
                            row={row}
                            isChecked={isChecked}
                            laborActivities={laborActivities}
                            onToggleSelect={toggleSelectRow}
                            onToggleActivity={toggleRowActivity}
                            onRemoveActivity={removeRowActivity}
                        />
                    );
                })}
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3 shrink-0">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={isSaving}
                    className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl text-xs font-black transition-all cursor-pointer"
                >
                    إلغاء
                </button>

                <button
                    type="button"
                    onClick={handleSaveAll}
                    disabled={isSaving || modifiedCount === 0}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm ${
                        modifiedCount === 0
                            ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                    }`}
                >
                    {isSaving ? (
                        <span>
                            جاري حفظ التعديلات ({saveProgress?.current}/{saveProgress?.total})...
                        </span>
                    ) : (
                        <span>
                            {modifiedCount > 0 ? `حفظ التعديلات على (${modifiedCount}) يومية` : 'لا توجد تعديلات للحفظ'}
                        </span>
                    )}
                </button>
            </div>
        </div>
    );
};

export default BatchDayLaborModal;
