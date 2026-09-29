import React, { useState, useMemo } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { useData } from '../../contexts/DataContext';
import { PlusIcon, TrashIcon, PencilIcon, CheckIcon, XMarkIcon, SparklesIcon } from '../Icons';

interface LaborActivitiesSettingsProps {
    onClose: () => void;
}

const LaborActivitiesSettings: React.FC<LaborActivitiesSettingsProps> = ({ onClose }) => {
    const { settings, updateSettings } = useSettings();
    const { rawExpenses: expenses, expenseCategories, deleteExpense, updateExpense } = useData();
    const [newActivity, setNewActivity] = useState('');
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingValue, setEditingValue] = useState('');

    const defaultStandardActivities = [
        'جمع وحصاد',
        'رش ووقاية',
        'تسميد وري',
        'تقليم وتربيط',
        'عزيق ونظافة وحشائش',
        'تعبئة وتغليف',
        'تحميل وتنزيل',
        'صيانة وشبك',
        'تجهيز شتلات وزراعة',
    ];

    const activities = useMemo(() => {
        const list = settings?.laborActivities || [];
        return list.length > 0 ? list : defaultStandardActivities;
    }, [settings?.laborActivities]);

    const handleRestoreDefaults = () => {
        const merged = Array.from(new Set([...defaultStandardActivities, ...activities]));
        updateSettings({ laborActivities: merged });
    };

    const handleAdd = () => {
        if (!newActivity.trim()) return;
        if (activities.includes(newActivity.trim())) return;
        
        updateSettings({
            laborActivities: [...activities, newActivity.trim()]
        });
        setNewActivity('');
    };

    const handleDelete = (index: number) => {
        const updated = activities.filter((_, i) => i !== index);
        updateSettings({ laborActivities: updated });
    };

    const startEditing = (index: number) => {
        setEditingIndex(index);
        setEditingValue(activities[index]);
    };

    const saveEdit = () => {
        if (!editingValue.trim() || editingIndex === null) return;
        const updated = [...activities];
        updated[editingIndex] = editingValue.trim();
        updateSettings({ laborActivities: updated });
        setEditingIndex(null);
    };

    // Greenhouse management logic
    const greenhouses = settings.greenhouses || [
        { id: 'mine', name: 'الصوبة الخاصة بي', type: 'mine', is_default: true },
        { id: 'father', name: 'صوبة أبي وأخي', type: 'external' }
    ];
    const [newGhName, setNewGhName] = useState('');
    const [newGhType, setNewGhType] = useState<'mine' | 'external'>('external');
    const [editingGhId, setEditingGhId] = useState<string | null>(null);
    const [editingGhValue, setEditingGhValue] = useState('');
    const [deletingGhId, setDeletingGhId] = useState<string | null>(null);
    const [confirmText, setConfirmText] = useState('');

    const handleAddGh = () => {
        if (!newGhName.trim()) return;
        if (greenhouses.some(g => g.name === newGhName.trim())) return;
        
        const newGh = {
            id: `gh-${Math.random().toString(36).substr(2, 9)}`,
            name: newGhName.trim(),
            type: newGhType
        };
        updateSettings({
            greenhouses: [...greenhouses, newGh]
        });
        setNewGhName('');
    };

    const confirmDeleteGh = async (id: string) => {
        if (confirmText !== 'حذف') return;
        
        const targetGh = greenhouses.find(g => g.id === id);
        if (!targetGh) return;

        // Find all labor category IDs
        const laborCategoryIds = expenseCategories
            .filter(c => c.name.includes('عمالة') || c.name.includes('عماله') || c.name.includes('يومية') || c.name.includes('عامل') || c.name.includes('مزارع') || c.name.includes('فطار') || c.name.includes('نثريات') || c.name.includes('إكرامية') || c.name.includes('ضيافة'))
            .map(c => c.id);

        // Filter and delete all associated labor expenses
        const expensesToDelete = expenses.filter(e => {
            if (!laborCategoryIds.includes(e.category_id)) return false;
            if (!e.description) return false;

            if (id === 'father' && (e.description.includes('صوبة أبي وأخي') || e.description.includes('[صوبة أبي وأخي]'))) {
                return true;
            }
            return e.description.includes(targetGh.name) || e.description.includes(`🏠 ${targetGh.name}`);
        });

        try {
            await Promise.all(expensesToDelete.map(exp => deleteExpense(exp.id)));
        } catch (err) {
            console.error("Error deleting greenhouse expenses:", err);
        }

        // Filter out greenhouse and update settings
        const updated = greenhouses.filter(g => g.id !== id);
        updateSettings({ greenhouses: updated });

        // Reset state
        setDeletingGhId(null);
        setConfirmText('');
    };

    const startEditingGh = (id: string, currentVal: string) => {
        setEditingGhId(id);
        setEditingGhValue(currentVal);
    };

    const saveGhEdit = () => {
        if (!editingGhValue.trim() || editingGhId === null) return;
        const updated = greenhouses.map(g => g.id === editingGhId ? { ...g, name: editingGhValue.trim() } : g);
        updateSettings({ greenhouses: updated });
        setEditingGhId(null);
    };

    // Find & Replace Migration Logic for Past Labor Expenses
    const laborExpensesList = useMemo(() => {
        const laborCategoryIds = expenseCategories
            .filter(c => c.name.includes('عمالة') || c.name.includes('عماله') || c.name.includes('يومية') || c.name.includes('عامل') || c.name.includes('مزارع') || c.name.includes('فطار') || c.name.includes('نثريات') || c.name.includes('إكرامية') || c.name.includes('ضيافة'))
            .map(c => c.id);

        return expenses.filter(e => {
            if (!e.description) return false;
            if (laborCategoryIds.includes(e.category_id)) return true;
            return e.description.includes('عامل:') || 
                   e.description.includes('يومية بدون اسم') || 
                   e.description.includes('منصرف عمالة:');
        });
    }, [expenses, expenseCategories]);

    const detectedActivitiesWithCount = useMemo(() => {
        const counts: Record<string, number> = {};
        laborExpensesList.forEach(exp => {
            const desc = exp.description || '';
            if (desc.includes('منصرف عمالة:')) return;
            
            let raw = '';
            if (desc.includes('عامل:')) {
                const parts = desc.split('|').map(p => p.trim());
                const workerPart = parts.find(p => p.startsWith('عامل:'));
                const otherParts = parts.filter(p => p !== workerPart);
                if (otherParts.length > 0) {
                    raw = otherParts[0].replace(/\(يومية عمل.*?\)/, '').trim();
                }
            } else if (desc.includes('يومية بدون اسم')) {
                const parts = desc.split('|').map(p => p.trim());
                const firstPart = parts[0];
                const dashMatch = firstPart.indexOf('-');
                if (dashMatch !== -1) {
                    raw = firstPart.substring(dashMatch + 1).replace(/\(يومية عمل.*?\)/, '').trim();
                } else if (parts.length > 1) {
                    raw = parts[1].replace(/\(يومية عمل.*?\)/, '').trim();
                }
            }
            
            if (raw) {
                const items = raw.split(/\s*(?:\+|\،|\,|\/)\s*/).map(s => s.trim()).filter(Boolean);
                items.forEach(act => {
                    counts[act] = (counts[act] || 0) + 1;
                });
            }
        });
        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [laborExpensesList]);

    const [sourceOldActivity, setSourceOldActivity] = useState('');
    const [targetNewActivity, setTargetNewActivity] = useState(defaultStandardActivities[0]);
    const [isReplacing, setIsReplacing] = useState(false);
    const [replaceProgress, setReplaceProgress] = useState<{ current: number; total: number } | null>(null);
    const [replaceSuccessMsg, setReplaceSuccessMsg] = useState<string | null>(null);

    // Duplicate activity detector & cleaner
    const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);
    const [cleanDuplicatesMsg, setCleanDuplicatesMsg] = useState<string | null>(null);

    const expensesWithDuplicates = useMemo(() => {
        return laborExpensesList.filter(exp => {
            const desc = exp.description || '';
            if (!desc || desc.includes('منصرف عمالة:') || desc.includes('(دفعة')) return false;

            let rawActivity = '';
            if (desc.includes('عامل:')) {
                const parts = desc.split('|').map(p => p.trim());
                const nonWorker = parts.filter(p => !p.startsWith('عامل:') && !p.includes('🏠') && !p.includes('🌿') && !p.startsWith('ملاحظة'));
                if (nonWorker.length > 0) {
                    rawActivity = nonWorker[0].replace(/\(يومية عمل.*?\)/, '').trim();
                }
            } else if (desc.includes('يومية بدون اسم')) {
                const parts = desc.split('|').map(p => p.trim());
                const firstPart = parts[0];
                const dashMatch = firstPart.indexOf('-');
                if (dashMatch !== -1) {
                    rawActivity = firstPart.substring(dashMatch + 1).replace(/\(يومية عمل.*?\)/, '').trim();
                } else if (parts.length > 1) {
                    rawActivity = parts[1].replace(/\(يومية عمل.*?\)/, '').trim();
                }
            }

            if (!rawActivity) return false;
            const rawTokens = rawActivity.split(/\s*(?:\+|\،|\,|\/|\|)\s*/).map(s => s.trim()).filter(Boolean);
            
            // Check raw duplicates
            if (rawTokens.length > new Set(rawTokens).size) return true;

            // Check if any compound overlap exists (e.g., "لف وبرعمه" together with "لف" or "برعمه")
            for (const t of rawTokens) {
                if (rawTokens.some(other => other !== t && (other.includes(t) || t.includes(other)))) {
                    return true;
                }
            }

            return false;
        });
    }, [laborExpensesList]);

    const handleExecuteCleanDuplicates = async () => {
        if (expensesWithDuplicates.length === 0) return;

        setIsCleaningDuplicates(true);
        setCleanDuplicatesMsg(null);

        try {
            let fixedCount = 0;
            for (const exp of expensesWithDuplicates) {
                const desc = exp.description || '';
                let newDesc = desc;

                const cleanTokens = (raw: string) => {
                    const baseTokens = raw.split(/\s*(?:\+|\،|\,|\/|\|)\s*/).map(s => s.trim()).filter(Boolean);
                    const refined: string[] = [];
                    for (const token of baseTokens) {
                        if (activities.includes(token)) {
                            refined.push(token);
                            continue;
                        }
                        if (token.includes(' و ')) {
                            refined.push(...token.split(/\s+و\s+/).map(s => s.trim()).filter(Boolean));
                            continue;
                        }
                        let matched = false;
                        for (const act of activities) {
                            if (token.startsWith(act + 'و') || token.startsWith(act + ' و')) {
                                const rest = token.substring(act.length).replace(/^[\sو]+/, '').trim();
                                if (rest) {
                                    refined.push(act, rest);
                                    matched = true;
                                    break;
                                }
                            }
                        }
                        if (!matched) {
                            refined.push(token);
                        }
                    }
                    return Array.from(new Set(refined.map(s => s.trim()).filter(Boolean)));
                };

                if (desc.includes('عامل:')) {
                    const parts = desc.split('|').map(p => p.trim());
                    const workerPart = parts.find(p => p.startsWith('عامل:'));
                    const ghPart = parts.find(p => p.includes('🏠') || p.includes('🌿'));
                    const noteParts = parts.filter(p => p.startsWith('ملاحظة') || p.startsWith('ملاحظات:'));
                    const actPart = parts.find(p => p !== workerPart && p !== ghPart && !noteParts.includes(p));

                    if (actPart) {
                        const isCredit = actPart.includes('(يومية عمل آجل)');
                        const raw = actPart.replace(/\(يومية عمل.*?\)/, '').trim();
                        const uniqueTokens = cleanTokens(raw);
                        const cleanActStr = uniqueTokens.join(' + ') + (isCredit ? ' (يومية عمل آجل)' : '');

                        const newParts = [
                            ghPart,
                            workerPart,
                            cleanActStr,
                            ...noteParts
                        ].filter(Boolean);

                        newDesc = newParts.join(' | ');
                    }
                } else if (desc.includes('يومية بدون اسم')) {
                    const parts = desc.split('|').map(p => p.trim());
                    const ghPart = parts.find(p => p.includes('🏠') || p.includes('🌿'));
                    const noteParts = parts.filter(p => p.startsWith('ملاحظة') || p.startsWith('ملاحظات:'));
                    const firstPart = parts[0];
                    const dashMatch = firstPart.indexOf('-');
                    if (dashMatch !== -1) {
                        const raw = firstPart.substring(dashMatch + 1).replace(/\(يومية عمل.*?\)/, '').trim();
                        const isCredit = firstPart.includes('(يومية عمل آجل)');
                        const uniqueTokens = cleanTokens(raw);
                        const cleanActStr = uniqueTokens.join(' + ') + (isCredit ? ' (يومية عمل آجل)' : '');
                        const newFirstPart = `يومية بدون اسم - ${cleanActStr}`;
                        newDesc = [ghPart, newFirstPart, ...noteParts].filter(Boolean).join(' | ');
                    }
                }

                if (newDesc !== desc) {
                    await updateExpense(exp.id, { description: newDesc });
                    fixedCount++;
                }
            }

            setCleanDuplicatesMsg(`تم فحص وتنظيف التكرار بنجاح في (${fixedCount}) يومية!`);
        } catch (err) {
            console.error('Error cleaning duplicates:', err);
        } finally {
            setIsCleaningDuplicates(false);
        }
    };

    const matchingExpensesForReplace = useMemo(() => {
        if (!sourceOldActivity.trim()) return [];
        return laborExpensesList.filter(e => {
            const desc = e.description || '';
            return desc.includes(sourceOldActivity.trim()) && !desc.includes('منصرف عمالة:');
        });
    }, [laborExpensesList, sourceOldActivity]);

    const handleExecuteReplace = async () => {
        if (!sourceOldActivity.trim() || !targetNewActivity.trim() || matchingExpensesForReplace.length === 0) return;

        setIsReplacing(true);
        setReplaceSuccessMsg(null);
        setReplaceProgress({ current: 0, total: matchingExpensesForReplace.length });

        try {
            for (let i = 0; i < matchingExpensesForReplace.length; i++) {
                const exp = matchingExpensesForReplace[i];
                const desc = exp.description || '';
                
                // Smart replacement of old activity token
                const newDesc = desc.split(sourceOldActivity.trim()).join(targetNewActivity.trim());
                
                await updateExpense(exp.id, {
                    description: newDesc
                });

                setReplaceProgress({ current: i + 1, total: matchingExpensesForReplace.length });
            }

            setReplaceSuccessMsg(`تم استبدال نشاط "${sourceOldActivity}" بنجاح في (${matchingExpensesForReplace.length}) يومية!`);
            setSourceOldActivity('');
        } catch (err) {
            console.error('Error replacing activity across expenses:', err);
        } finally {
            setIsReplacing(false);
        }
    };

    return (
        <div className="space-y-5 text-right max-h-[85vh] overflow-y-auto pr-1">
            {/* Greenhouse Management Section */}
            <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-neutral-200 dark:border-neutral-700/60"></div>
                <span className="flex-shrink mx-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">إدارة وتسمية الصُوَب الزراعية</span>
                <div className="flex-grow border-t border-neutral-200 dark:border-neutral-700/60"></div>
            </div>

            <div className="space-y-3 bg-neutral-50 dark:bg-neutral-900/35 p-3.5 rounded-2xl border border-neutral-200/60 dark:border-neutral-800">
                <div className="space-y-2">
                    <input
                        type="text"
                        value={newGhName}
                        onChange={(e) => setNewGhName(e.target.value)}
                        placeholder="اسم الصوبة الجديد..."
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-indigo-500/25 outline-none text-right"
                    />
                    <div className="flex items-center justify-between gap-3 text-right">
                        <span className="text-[10px] font-black text-neutral-400">نوع الصيبة ومحاسبتها:</span>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setNewGhType('mine')}
                                className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all ${
                                    newGhType === 'mine' 
                                        ? 'bg-emerald-500 text-white shadow-xs' 
                                        : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500'
                                }`}
                            >
                                تابعة لإنتاجي 🌿
                            </button>
                            <button
                                type="button"
                                onClick={() => setNewGhType('external')}
                                className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all ${
                                    newGhType === 'external' 
                                        ? 'bg-indigo-600 text-white shadow-xs' 
                                        : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500'
                                }`}
                            >
                                صوبة منفصلة (خزنة فقط) 🏠
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={handleAddGh}
                        className="w-full py-2 bg-indigo-600 text-white font-black text-xs rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5"
                    >
                        <PlusIcon className="w-3.5 h-3.5" />
                        <span>إضافة صوبة جديدة ➕</span>
                    </button>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-neutral-200/50 dark:border-neutral-800/60">
                    {greenhouses.map((gh) => (
                        <div key={gh.id} className="flex flex-col gap-2 p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800/85">
                            {deletingGhId === gh.id ? (
                                <div className="flex-1 flex flex-col gap-2 p-2.5 bg-rose-500/5 dark:bg-rose-500/10 rounded-xl border border-rose-500/30">
                                    <span className="text-[10px] font-black text-rose-600 dark:text-rose-450 leading-tight">
                                        ⚠️ تحذير: سيتم حذف هذه الصوبة ونهائياً جميع بيانات العمالة واليوميات والمنصرفات والمسحوبات المسجلة تحت اسمها!
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={confirmText}
                                            onChange={(e) => setConfirmText(e.target.value)}
                                            placeholder="اكتب كلمة 'حذف' للتأكيد..."
                                            className="flex-1 bg-white dark:bg-neutral-900 border border-rose-500/40 focus:border-rose-500/90 rounded-lg px-2 py-1 text-xs font-bold text-right outline-none text-rose-700 dark:text-rose-400 placeholder-rose-300 dark:placeholder-rose-800/60"
                                        />
                                        <button 
                                            onClick={() => confirmDeleteGh(gh.id)}
                                            disabled={confirmText !== 'حذف'}
                                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-neutral-200 dark:disabled:bg-neutral-800 text-white text-[10px] font-black rounded-lg transition-colors cursor-pointer"
                                        >
                                            تأكيد وحذف البيانات
                                        </button>
                                        <button 
                                            onClick={() => { setDeletingGhId(null); setConfirmText(''); }} 
                                            className="p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
                                        >
                                            <XMarkIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ) : editingGhId === gh.id ? (
                                <div className="flex-1 flex gap-2">
                                    <input
                                        type="text"
                                        autoFocus
                                        value={editingGhValue}
                                        onChange={(e) => setEditingGhValue(e.target.value)}
                                        className="flex-1 bg-white dark:bg-neutral-900 border border-indigo-500 rounded-lg px-2 py-1 text-xs font-bold text-right"
                                    />
                                    <button onClick={saveGhEdit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                                        <CheckIcon className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setEditingGhId(null)} className="p-1 text-rose-600 hover:bg-rose-50 rounded">
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${
                                            gh.type === 'mine' 
                                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/10' 
                                                : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/10'
                                        }`}>
                                            {gh.type === 'mine' ? 'تابعة للمزرعة' : 'صوبة مستقلة'}
                                        </span>
                                        <span className="text-xs font-black text-neutral-700 dark:text-neutral-200">{gh.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => startEditingGh(gh.id, gh.name)} className="p-1 text-neutral-400 hover:text-indigo-650 rounded">
                                            <PencilIcon className="w-3.5 h-3.5" />
                                        </button>
                                        {!gh.is_default && (
                                            <button onClick={() => { setDeletingGhId(gh.id); setConfirmText(''); }} className="p-1 text-neutral-400 hover:text-rose-600 rounded">
                                                <TrashIcon className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Activities Management Section */}
            <div className="relative flex py-2 items-center justify-between">
                <div className="flex-grow border-t border-neutral-200 dark:border-neutral-700/60"></div>
                <span className="flex-shrink mx-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">تعديل قائمة الأنشطة واليوميات</span>
                <div className="flex-grow border-t border-neutral-200 dark:border-neutral-700/60"></div>
            </div>

            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">الأنشطة المسجلة ({activities.length})</span>
                <button
                    type="button"
                    onClick={handleRestoreDefaults}
                    className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                    <span>🔄 استعادة الأنشطة النموذجية</span>
                </button>
            </div>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={newActivity}
                    onChange={(e) => setNewActivity(e.target.value)}
                    placeholder="اسم النشاط الجديد..."
                    className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-amber-500/20 text-right outline-none"
                />
                <button
                    onClick={handleAdd}
                    className="p-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors cursor-pointer"
                >
                    <PlusIcon className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activities.length === 0 ? (
                    <p className="text-xs text-neutral-500 text-center py-4">لا توجد أنشطة مضافة.</p>
                ) : (
                    activities.map((activity, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-700/50 group">
                            {editingIndex === index ? (
                                <div className="flex-1 flex gap-2">
                                    <input
                                        type="text"
                                        autoFocus
                                        value={editingValue}
                                        onChange={(e) => setEditingValue(e.target.value)}
                                        className="flex-1 bg-white dark:bg-neutral-900 border border-amber-500 rounded-lg px-2 py-1 text-xs font-bold text-right outline-none"
                                    />
                                    <button onClick={saveEdit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                                        <CheckIcon className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setEditingIndex(null)} className="p-1 text-rose-600 hover:bg-rose-50 rounded">
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300">{activity}</span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => startEditing(index)} className="p-1.5 text-neutral-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors cursor-pointer">
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(index)} className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors cursor-pointer">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Smart Bulk Find & Replace Section */}
            {detectedActivitiesWithCount.length > 0 && (
                <div className="space-y-3 pt-2">
                    <div className="relative flex py-2 items-center justify-between">
                        <div className="flex-grow border-t border-neutral-200 dark:border-neutral-700/60"></div>
                        <span className="flex-shrink mx-4 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                            <SparklesIcon className="w-3 h-3" />
                            <span>أداة الاستبدال والتوحيد الشامل للأنشطة القديمة</span>
                        </span>
                        <div className="flex-grow border-t border-neutral-200 dark:border-neutral-700/60"></div>
                    </div>

                    <div className="bg-indigo-50/50 dark:bg-indigo-950/30 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 space-y-3">
                        <p className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 leading-relaxed">
                            اختر أي مسمى نشاط مسجل في السجلات السابقة لتحويله فوراً إلى مسمى جديد معتمد بضغطة زر واحدة:
                        </p>

                        {replaceSuccessMsg && (
                            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold animate-fade-in">
                                {replaceSuccessMsg}
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {/* Old Source Activity Dropdown */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-neutral-500 dark:text-neutral-400">
                                    النشاط القديم الموجود بالسجلات:
                                </label>
                                <select
                                    value={sourceOldActivity}
                                    onChange={e => setSourceOldActivity(e.target.value)}
                                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-2.5 py-2 text-xs font-bold outline-none text-right"
                                >
                                    <option value="">-- اختر نشاطاً قديماً للاستبدال --</option>
                                    {detectedActivitiesWithCount.map(item => (
                                        <option key={item.name} value={item.name}>
                                            {item.name} ({item.count} يومية)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Target Standardized Activity */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-neutral-500 dark:text-neutral-400">
                                    النشاط الجديد المراد التطبيق عليه:
                                </label>
                                <select
                                    value={targetNewActivity}
                                    onChange={e => setTargetNewActivity(e.target.value)}
                                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-2.5 py-2 text-xs font-bold outline-none text-right"
                                >
                                    {activities.map(act => (
                                        <option key={act} value={act}>
                                            {act}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleExecuteReplace}
                            disabled={isReplacing || !sourceOldActivity || matchingExpensesForReplace.length === 0}
                            className={`w-full py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                !sourceOldActivity || matchingExpensesForReplace.length === 0
                                    ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                            }`}
                        >
                            {isReplacing ? (
                                <span>جاري الاستبدال ({replaceProgress?.current}/{replaceProgress?.total})...</span>
                            ) : (
                                <span>
                                    {sourceOldActivity 
                                        ? `استبدال "${sourceOldActivity}" ⬅️ "${targetNewActivity}" في (${matchingExpensesForReplace.length}) يومية`
                                        : 'اختر نشاطاً قديماً للبدء'
                                    }
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Auto Deduplication & Cleanup Tool */}
                    <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3.5 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                                <span>🧹</span>
                                <span>أداة تنظيف وتصحيح الأنشطة المكررة في السجلات</span>
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                                {expensesWithDuplicates.length} سجلات بها تكرار
                            </span>
                        </div>
                        <p className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 leading-relaxed">
                            تقوم هذه الأداة بفحص كافة اليوميات القديمة وإزالة أي أنشطة مكررة لنفس العامل تلقائياً.
                        </p>

                        {cleanDuplicatesMsg && (
                            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold">
                                {cleanDuplicatesMsg}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleExecuteCleanDuplicates}
                            disabled={isCleaningDuplicates || expensesWithDuplicates.length === 0}
                            className={`w-full py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                expensesWithDuplicates.length === 0
                                    ? 'bg-neutral-100 dark:bg-neutral-800/60 text-neutral-400 cursor-not-allowed border border-neutral-200 dark:border-neutral-700'
                                    : 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                            }`}
                        >
                            {isCleaningDuplicates ? (
                                <span>جاري التنظيف والإصلاح...</span>
                            ) : (
                                <span>
                                    {expensesWithDuplicates.length > 0 
                                        ? `إصلاح وحذف التكرارات الآن (${expensesWithDuplicates.length} يومية)`
                                        : '✅ جميع اليوميات نظيفة وسليمة ولا يوجد تكرار'
                                    }
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            )}

            <div className="pt-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2.5 bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 rounded-xl text-sm font-bold transition-all cursor-pointer"
                >
                    إغلاق
                </button>
            </div>
        </div>
    );
};

export default LaborActivitiesSettings;
