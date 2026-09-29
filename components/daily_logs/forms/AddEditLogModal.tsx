import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Droplet,
  Sprout,
  Shield,
  Wrench,
  ShoppingBag,
  Plus,
  PlusCircle,
  Info,
  X,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import type { DailyLog, DailyLogTask } from '../../../types';
import { getLocalDateString } from '../../../utils/helpers';
import {
  COMMON_PESTS,
  COMMON_COMPOUNDS_SPRAY,
  COMMON_COMPOUNDS_FERT,
  COMMON_AGRI_OPS,
  serializeCompounds,
  deserializeCompounds,
  serializePest,
  deserializePest,
  serializeIrrigation,
  deserializeIrrigation,
  serializePlanting,
  deserializePlanting,
  serializeAgriOps,
  deserializeAgriOps,
  deduplicateTasks,
} from '../dailyLogUtils';

// Modal Component for Add & Edit
export interface AddEditLogModalProps {
    onClose: () => void;
    activeCycles: any[];
    currentSelectedCycleId: string;
    editingRecord: DailyLog | null;
}

export const AddEditLogModal: React.FC<AddEditLogModalProps> = ({ onClose, activeCycles, currentSelectedCycleId, editingRecord }) => {
    const { addDailyLog, updateDailyLog, dailyLogs } = useData();
    const [date, setDate] = useState(getLocalDateString());
    const [cycleId, setCycleId] = useState('');

    // Accordion/collapsible cards toggle state
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        irrigation: true,
        fertilization: false,
        protection: false,
        operations: false,
        harvest: false,
        planting: false
    });

    // Main tasks IDs mapping to keep track of loaded tasks
    const [taskIds, setTaskIds] = useState<Record<string, string>>({});
    const [notes, setNotes] = useState('');

    // --- Unified Subform States ---
    
    // 1. Irrigation
    const [irrigationMorningMinutes, setIrrigationMorningMinutes] = useState<number | ''>('');
    const [irrigationEveningMinutes, setIrrigationEveningMinutes] = useState<number | ''>('');
    const [irrigationNotes, setIrrigationNotes] = useState('');

    // 2. Fertilization
    const [fertilizationCompounds, setFertilizationCompounds] = useState<Array<{ name: string; amount: string }>>([
        { name: '', amount: '' },
        { name: '', amount: '' }
    ]);
    const [fertilizationNotes, setFertilizationNotes] = useState('');

    // 3. Spraying & Pests (Protection)
    const [sprayingCompounds, setSprayingCompounds] = useState<Array<{ name: string; amount: string }>>([
        { name: '', amount: '' },
        { name: '', amount: '' }
    ]);
    const [sprayingNotes, setSprayingNotes] = useState('');
    const [pestName, setPestName] = useState('');
    const [pestSeverity, setPestSeverity] = useState('متوسطة');
    const [pestStatus, setPestStatus] = useState('نشطة وتحت العلاج');
    const [pestNotes, setPestNotes] = useState('');

    // 4. Agri Operations & Labor
    const [selectedAgriOps, setSelectedAgriOps] = useState<string[]>([]);
    const [opsNotes, setOpsNotes] = useState('');
    const [workersCount, setWorkersCount] = useState<number | ''>('');

    // 5. Harvest
    const [harvestQuantity, setHarvestQuantity] = useState<number | ''>('');
    const [harvestUnit, setHarvestUnit] = useState('قفص');
    const [harvestNotes, setHarvestNotes] = useState('');

    // 6. Planting
    const [plantType, setPlantType] = useState('');
    const [plantingQty, setPlantingQty] = useState<number | ''>('');
    const [plantingUnit, setPlantingUnit] = useState('شتلة');
    const [plantingNotes, setPlantingNotes] = useState('');

    // Helper functions for compounds rows
    const handleAddFertCompoundRow = () => {
        setFertilizationCompounds([...fertilizationCompounds, { name: '', amount: '' }]);
    };
    const handleRemoveFertCompoundRow = (index: number) => {
        setFertilizationCompounds(fertilizationCompounds.filter((_, i) => i !== index));
    };
    const handleFertCompoundChange = (index: number, key: 'name' | 'amount', val: string) => {
        const copy = [...fertilizationCompounds];
        copy[index][key] = val;
        setFertilizationCompounds(copy);
    };

    const handleAddSprayCompoundRow = () => {
        setSprayingCompounds([...sprayingCompounds, { name: '', amount: '' }]);
    };
    const handleRemoveSprayCompoundRow = (index: number) => {
        setSprayingCompounds(sprayingCompounds.filter((_, i) => i !== index));
    };
    const handleSprayCompoundChange = (index: number, key: 'name' | 'amount', val: string) => {
        const copy = [...sprayingCompounds];
        copy[index][key] = val;
        setSprayingCompounds(copy);
    };

    const toggleSection = (sec: string) => {
        setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));
    };

    const handleExpandAll = () => {
        setOpenSections({
            irrigation: true,
            fertilization: true,
            protection: true,
            operations: true,
            harvest: true,
            planting: true
        });
    };

    const handleCollapseAll = () => {
        setOpenSections({
            irrigation: false,
            fertilization: false,
            protection: false,
            operations: false,
            harvest: false,
            planting: false
        });
    };

    const isSectionActive = (sec: string) => {
        switch (sec) {
            case 'irrigation':
                return irrigationMorningMinutes !== '' || irrigationEveningMinutes !== '';
            case 'fertilization':
                return fertilizationCompounds.some(c => c.name.trim()) || fertilizationNotes.trim() !== '';
            case 'protection':
                return sprayingCompounds.some(c => c.name.trim()) || sprayingNotes.trim() !== '' || pestName.trim() !== '';
            case 'operations':
                return selectedAgriOps.length > 0 || workersCount !== '' || opsNotes.trim() !== '';
            case 'harvest':
                return harvestQuantity !== '' || harvestNotes.trim() !== '';
            case 'planting':
                return plantType.trim() !== '';
            default:
                return false;
        }
    };

    // Populate form states from task array
    const populateFormFromTasks = (taskList: DailyLogTask[]) => {
        setIrrigationMorningMinutes('');
        setIrrigationEveningMinutes('');
        setIrrigationNotes('');

        setFertilizationCompounds([{ name: '', amount: '' }, { name: '', amount: '' }]);
        setFertilizationNotes('');

        setSprayingCompounds([{ name: '', amount: '' }, { name: '', amount: '' }]);
        setSprayingNotes('');
        setPestName('');
        setPestSeverity('متوسطة');
        setPestStatus('نشطة وتحت العلاج');
        setPestNotes('');

        setSelectedAgriOps([]);
        setOpsNotes('');
        setWorkersCount('');

        setHarvestQuantity('');
        setHarvestUnit('قفص');
        setHarvestNotes('');

        setPlantType('');
        setPlantingQty('');
        setPlantingUnit('شتلة');
        setPlantingNotes('');

        const ids: Record<string, string> = {};

        taskList.forEach(task => {
            ids[task.category] = task.id;

            switch (task.category) {
                case 'ري': {
                    const { morning, morningMin, evening, eveningMin, notes: irrNotes } = deserializeIrrigation(task.details);
                    if (morning) setIrrigationMorningMinutes(morningMin);
                    if (evening) setIrrigationEveningMinutes(eveningMin);
                    setIrrigationNotes(irrNotes || '');
                    break;
                }
                case 'تسميد': {
                    const { compounds: parsed, detailsText } = deserializeCompounds(task.details);
                    setFertilizationCompounds(parsed.length > 0 ? parsed : [{ name: '', amount: '' }]);
                    setFertilizationNotes(detailsText || '');
                    break;
                }
                case 'رش': {
                    const { compounds: parsed, detailsText } = deserializeCompounds(task.details);
                    setSprayingCompounds(parsed.length > 0 ? parsed : [{ name: '', amount: '' }]);
                    setSprayingNotes(detailsText || '');
                    break;
                }
                case 'الاصابات والآفات':
                case 'إصابات': {
                    const { pestName: pName, severity, status, details: pNotes } = deserializePest(task.details);
                    setPestName(pName);
                    setPestSeverity(severity || 'متوسطة');
                    setPestStatus(status || 'نشطة وتحت العلاج');
                    setPestNotes(pNotes || '');
                    break;
                }
                case 'عمليات زراعية': {
                    const { ops, notes: oNotes } = deserializeAgriOps(task.details);
                    setSelectedAgriOps(ops);
                    setOpsNotes(oNotes || '');
                    break;
                }
                case 'عمالة': {
                    setWorkersCount(task.workersCount !== undefined ? task.workersCount : '');
                    break;
                }
                case 'حصاد': {
                    setHarvestQuantity(task.quantity !== undefined ? task.quantity : '');
                    setHarvestUnit(task.unit || 'قفص');
                    setHarvestNotes(task.details || '');
                    break;
                }
                case 'زراعة': {
                    const { plantType: pType, quantity: pQty, unit: pUnit, notes: pNotes } = deserializePlanting(task.details);
                    setPlantType(pType);
                    setPlantingQty(pQty);
                    setPlantingUnit(pUnit);
                    setPlantingNotes(pNotes || '');
                    break;
                }
            }
        });

        setTaskIds(ids);
    };

    // Prepopulate or auto-select values
    useEffect(() => {
        if (editingRecord) {
            setDate(editingRecord.date);
            setCycleId(editingRecord.cycle_id);
            populateFormFromTasks(deduplicateTasks(editingRecord.tasks));
            setNotes(editingRecord.notes || '');
            setOpenSections({
                irrigation: true,
                fertilization: true,
                protection: true,
                operations: true,
                harvest: true,
                planting: true
            });
        } else {
            setDate(getLocalDateString());
            setCycleId(currentSelectedCycleId || (activeCycles[0]?.id || ''));
            populateFormFromTasks([]);
            setNotes('');
            setOpenSections({
                irrigation: true,
                fertilization: false,
                protection: false,
                operations: false,
                harvest: false,
                planting: false
            });
        }
    }, [editingRecord, currentSelectedCycleId, activeCycles]);

    // Check if log already exists on this date and is not the one we are currently editing
    const existingDateLog = useMemo(() => {
        if (editingRecord) return null; // editing mode overrides date warning
        return dailyLogs.find(l => l.date === date && l.cycle_id === cycleId);
    }, [dailyLogs, date, cycleId, editingRecord]);

    // Populate tasks and notes if matching log exists for adding more easily
    useEffect(() => {
        if (existingDateLog && !editingRecord) {
            populateFormFromTasks(deduplicateTasks(existingDateLog.tasks));
            setNotes(existingDateLog.notes || '');
            const hasIrr = existingDateLog.tasks.some(t => t.category === 'ري');
            const hasFert = existingDateLog.tasks.some(t => t.category === 'تسميد');
            const hasProt = existingDateLog.tasks.some(t => t.category === 'رش' || t.category === 'الاصابات والآفات' || t.category === 'إصابات');
            const hasOps = existingDateLog.tasks.some(t => t.category === 'عمليات زراعية' || t.category === 'عمالة');
            const hasHarv = existingDateLog.tasks.some(t => t.category === 'حصاد');
            const hasPlant = existingDateLog.tasks.some(t => t.category === 'زراعة');
            setOpenSections({
                irrigation: hasIrr,
                fertilization: hasFert,
                protection: hasProt,
                operations: hasOps,
                harvest: hasHarv,
                planting: hasPlant
            });
        }
    }, [existingDateLog, editingRecord]);

    const handleSaveProcess = async () => {
        if (!cycleId) {
            alert('يرجى اختيار عروة الموسم قبل المتابعة');
            return;
        }

        const getTaskId = (category: string) => taskIds[category] || crypto.randomUUID();
        const finalTasks: DailyLogTask[] = [];

        // 1. Irrigation (ري)
        const isIrrigationFilled = irrigationMorningMinutes !== '' || irrigationEveningMinutes !== '';
        if (isIrrigationFilled) {
            const hasMorning = irrigationMorningMinutes !== '' && Number(irrigationMorningMinutes) > 0;
            const hasEvening = irrigationEveningMinutes !== '' && Number(irrigationEveningMinutes) > 0;
            const details = serializeIrrigation(hasMorning, irrigationMorningMinutes, hasEvening, irrigationEveningMinutes, irrigationNotes);
            const subParts = [];
            if (hasMorning) subParts.push(`صباحاً: ${irrigationMorningMinutes} د`);
            if (hasEvening) subParts.push(`مساءً: ${irrigationEveningMinutes} د`);
            
            finalTasks.push({
                id: getTaskId('ري'),
                category: 'ري',
                subCategory: subParts.join(' | ') || 'تم الري',
                details
            });
        }

        // 2. Fertilization (تسميد)
        const filledFertCompounds = fertilizationCompounds.filter(c => c.name.trim());
        if (filledFertCompounds.length > 0 || fertilizationNotes.trim() !== '') {
            const details = serializeCompounds(filledFertCompounds, fertilizationNotes);
            const subCategory = filledFertCompounds.map(c => c.name.trim()).join('، ') || 'تسميد ومغذيات';
            finalTasks.push({
                id: getTaskId('تسميد'),
                category: 'تسميد',
                subCategory,
                details
            });
        }

        // 3. Spraying (رش)
        const filledSprayCompounds = sprayingCompounds.filter(c => c.name.trim());
        if (filledSprayCompounds.length > 0 || sprayingNotes.trim() !== '') {
            const details = serializeCompounds(filledSprayCompounds, sprayingNotes);
            const subCategory = filledSprayCompounds.map(c => c.name.trim()).join('، ') || 'رش وقائي/علاجي';
            finalTasks.push({
                id: getTaskId('رش'),
                category: 'رش',
                subCategory,
                details
            });
        }

        // 4. Pests & Infections (الاصابات والآفات)
        if (pestName.trim()) {
            const details = serializePest(pestName.trim(), pestSeverity, pestStatus, pestNotes.trim());
            finalTasks.push({
                id: getTaskId('الاصابات والآفات'),
                category: 'الاصابات والآفات',
                subCategory: pestName.trim(),
                details
            });
        }

        // 5. AgriOps (عمليات زراعية)
        if (selectedAgriOps.length > 0 || opsNotes.trim() !== '') {
            const details = serializeAgriOps(selectedAgriOps, opsNotes);
            const subCategory = selectedAgriOps.slice(0, 2).join('، ') + (selectedAgriOps.length > 2 ? '...' : '') || 'عملية زراعية';
            finalTasks.push({
                id: getTaskId('عمليات زراعية'),
                category: 'عمليات زراعية',
                subCategory,
                details
            });
        }

        // 6. Labor (عمالة)
        if (workersCount !== '') {
            finalTasks.push({
                id: getTaskId('عمالة'),
                category: 'عمالة',
                workersCount: Number(workersCount),
                details: 'تم توظيف العمالة في الصوبة الزراعية'
            });
        }

        // 7. Harvest (حصاد)
        if (harvestQuantity !== '' || harvestNotes.trim() !== '') {
            finalTasks.push({
                id: getTaskId('حصاد'),
                category: 'حصاد',
                quantity: harvestQuantity !== '' ? Number(harvestQuantity) : undefined,
                unit: harvestUnit,
                details: harvestNotes.trim()
            });
        }

        // 8. Planting (زراعة)
        if (plantType.trim()) {
            const details = serializePlanting(plantType.trim(), plantingQty, plantingUnit, plantingNotes);
            finalTasks.push({
                id: getTaskId('زراعة'),
                category: 'زراعة',
                subCategory: plantType.trim(),
                details
            });
        }

        if (finalTasks.length === 0 && !notes.trim()) {
            alert('يرجى تعبئة قسم واحد على الأقل قبل حفظ يوميات الصوبة');
            return;
        }

        try {
            if (editingRecord) {
                await updateDailyLog({
                    ...editingRecord,
                    cycle_id: cycleId,
                    date,
                    tasks: deduplicateTasks(finalTasks),
                    notes: notes.trim()
                });
            } else if (existingDateLog) {
                await updateDailyLog({
                    ...existingDateLog,
                    tasks: deduplicateTasks(finalTasks),
                    notes: notes.trim() 
                        ? (existingDateLog.notes ? (existingDateLog.notes.includes(notes.trim()) ? existingDateLog.notes : `${existingDateLog.notes}\n${notes.trim()}`.trim()) : notes.trim())
                        : (existingDateLog.notes || '')
                });
            } else {
                await addDailyLog({
                    id: crypto.randomUUID(),
                    cycle_id: cycleId,
                    date,
                    tasks: deduplicateTasks(finalTasks),
                    notes: notes.trim()
                });
            }
            onClose();
        } catch (e) {
            console.error(e);
            alert('حدث خطأ أثناء حفظ السجل');
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex flex-col bg-white dark:bg-neutral-900 animate-in fade-in duration-200 sm:p-4 sm:bg-neutral-900/60 sm:items-center sm:justify-center">
            <div className="flex flex-col w-full bg-white dark:bg-neutral-900 sm:max-w-2xl sm:rounded-3xl sm:max-h-[92vh] h-full sm:h-auto shadow-2xl relative overflow-hidden" dir="rtl">
                
                {/* Header */}
                <div className="flex justify-between items-center py-4.5 px-5 border-b border-neutral-100 dark:border-neutral-800 shrink-0 bg-white dark:bg-neutral-900 z-10">
                    <div>
                        <h2 className="text-base font-black text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                            <PlusCircle className="w-5 h-5 text-primary" />
                            <span>{editingRecord ? 'تعديل الأجندة الزراعية' : 'صناعة تدوينة زراعية جديدة'}</span>
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-neutral-500 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                    {/* Date and Cycle Selectors */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-neutral-50 dark:bg-neutral-800/20 p-3.5 rounded-2xl border border-neutral-100 dark:border-neutral-800/40">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-neutral-400">عروة الموسم</label>
                            <div className="relative">
                                <select 
                                    className="w-full pl-8 pr-3 py-3 bg-white dark:bg-neutral-900 border-none rounded-xl text-xs font-black text-neutral-700 dark:text-neutral-200 appearance-none focus:ring-1 focus:ring-primary shadow-sm" 
                                    value={cycleId} 
                                    onChange={e => setCycleId(e.target.value)}
                                >
                                    <option value="" disabled>اختر العروة...</option>
                                    {activeCycles.map(c => <option key={c.id} value={c.id}>🌿 {c.name}</option>)}
                                </select>
                                <ChevronDown className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-neutral-400">تاريخ العملية</label>
                            <input 
                                type="date" 
                                className="w-full px-3 py-3 bg-white dark:bg-neutral-900 border-none rounded-xl text-xs font-mono font-bold text-neutral-700 dark:text-neutral-200 focus:ring-1 focus:ring-primary shadow-sm" 
                                value={date} 
                                onChange={e => setDate(e.target.value)} 
                            />
                        </div>
                    </div>

                    {/* Same date warning indicator */}
                    {existingDateLog && (
                        <div className="bg-amber-500/10 text-amber-600 border border-amber-500/25 p-3 rounded-2xl flex items-start gap-2.5 text-xs font-bold leading-relaxed">
                            <Info className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>ملاحظة: يوجد سجل سابق لهذا التاريخ بالفعل. متابعة الحفظ ستقوم بدمج العمليات الجديدة إلى السجل الحالي لتسهيل المتابعة.</span>
                        </div>
                    )}

                    {/* Expand/Collapse Control Buttons */}
                    <div className="flex justify-between items-center bg-neutral-50 dark:bg-neutral-850/45 p-2 rounded-xl text-xs border border-neutral-100 dark:border-neutral-800/40">
                        <span className="text-neutral-500 dark:text-neutral-450 font-black pr-1">نموذج اليوميات الموحد (Accordion)</span>
                        <div className="flex gap-2">
                            <button 
                                type="button" 
                                onClick={handleExpandAll}
                                className="px-2.5 py-1 bg-white dark:bg-neutral-900 border border-neutral-150 dark:border-neutral-800 rounded-lg font-black text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                            >
                                فتح الكل
                            </button>
                            <button 
                                type="button" 
                                onClick={handleCollapseAll}
                                className="px-2.5 py-1 bg-white dark:bg-neutral-900 border border-neutral-150 dark:border-neutral-800 rounded-lg font-black text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                            >
                                طي الكل
                            </button>
                        </div>
                    </div>

                    {/* Accordion / Collapsible Cards Vertical Stack */}
                    <div className="space-y-3.5">
                        
                        {/* 💧 Irrigation Card */}
                        <div className="border border-neutral-150 dark:border-neutral-800/80 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 shadow-sm">
                            <button
                                type="button"
                                onClick={() => toggleSection('irrigation')}
                                className="w-full p-4 flex justify-between items-center hover:bg-neutral-50/50 dark:hover:bg-neutral-800/15 transition-colors cursor-pointer text-right"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 rounded-xl">
                                        <Droplet className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-neutral-800 dark:text-neutral-200">💧 ري النباتات</span>
                                        <span className="text-[9.5px] text-neutral-400 font-bold">تسجيل جدول وفترات الري بدقة بالدقائق</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isSectionActive('irrigation') && (
                                        <span className="text-[9.5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                                            <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
                                            <span>تم الإدخال</span>
                                        </span>
                                    )}
                                    <ChevronDown className={`w-4 h-4 text-neutral-400 transform transition-transform duration-200 ${openSections.irrigation ? 'rotate-180' : ''}`} />
                                </div>
                            </button>
                            {openSections.irrigation && (
                                <div className="p-4 border-t border-neutral-100 dark:border-neutral-800/60 bg-neutral-50/30 dark:bg-neutral-900/40 space-y-3.5 animate-in slide-in-from-top-2 duration-150">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div className="space-y-1">
                                            <label className="text-[10.5px] font-bold text-neutral-600 dark:text-neutral-300">مدة الري الصباحي (بالدقائق)</label>
                                            <input 
                                                type="number" 
                                                min="0"
                                                value={irrigationMorningMinutes} 
                                                onChange={e => setIrrigationMorningMinutes(e.target.value ? Number(e.target.value) : '')}
                                                className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 font-bold"
                                                placeholder="مثال: 15"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10.5px] font-bold text-neutral-600 dark:text-neutral-300">مدة الري المسائي (بالدقائق)</label>
                                            <input 
                                                type="number" 
                                                min="0"
                                                value={irrigationEveningMinutes} 
                                                onChange={e => setIrrigationEveningMinutes(e.target.value ? Number(e.target.value) : '')}
                                                className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 font-bold"
                                                placeholder="مثال: 5"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-neutral-400">ملاحظات إضافية حول الري</label>
                                        <textarea 
                                            rows={2}
                                            value={irrigationNotes}
                                            onChange={e => setIrrigationNotes(e.target.value)}
                                            className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 resize-none font-bold"
                                            placeholder="مثال: فحص خراطيم التنقيط بالصوبة، رفع الملوحة..."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 🌱 Fertilization Card */}
                        <div className="border border-neutral-150 dark:border-neutral-800/80 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 shadow-sm">
                            <button
                                type="button"
                                onClick={() => toggleSection('fertilization')}
                                className="w-full p-4 flex justify-between items-center hover:bg-neutral-50/50 dark:hover:bg-neutral-800/15 transition-colors cursor-pointer text-right"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                        <Sprout className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-neutral-800 dark:text-neutral-200">🌱 تسميد ومغذيات</span>
                                        <span className="text-[9.5px] text-neutral-400 font-bold">تسجيل العناصر المغذية والأسمدة المضافة</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isSectionActive('fertilization') && (
                                        <span className="text-[9.5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                                            <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
                                            <span>تم الإدخال</span>
                                        </span>
                                    )}
                                    <ChevronDown className={`w-4 h-4 text-neutral-400 transform transition-transform duration-200 ${openSections.fertilization ? 'rotate-180' : ''}`} />
                                </div>
                            </button>
                            {openSections.fertilization && (
                                <div className="p-4 border-t border-neutral-100 dark:border-neutral-800/60 bg-neutral-50/30 dark:bg-neutral-900/40 space-y-4 animate-in slide-in-from-top-2 duration-150">
                                    <div className="space-y-3">
                                        {fertilizationCompounds.map((comp, idx) => (
                                            <div key={idx} className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-150 dark:border-neutral-800 relative group flex gap-3.5 items-center">
                                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                    <div className="space-y-1">
                                                        <label className="text-[9.5px] font-bold text-neutral-400 block">اسم السماد/المركب</label>
                                                        <input
                                                            type="text"
                                                            list="common_fert"
                                                            value={comp.name}
                                                            onChange={e => handleFertCompoundChange(idx, 'name', e.target.value)}
                                                            placeholder="مثال: حامض فسفوريك، نترات كالسيوم..."
                                                            className="w-full p-2.5 text-xs bg-neutral-50 dark:bg-neutral-800/40 rounded-lg border-none font-bold text-neutral-800 dark:text-neutral-200"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9.5px] font-bold text-neutral-400 block">الكمية المضافة</label>
                                                        <input
                                                            type="text"
                                                            value={comp.amount}
                                                            onChange={e => handleFertCompoundChange(idx, 'amount', e.target.value)}
                                                            placeholder="مثال: ٥ كجم، ٢ لتر..."
                                                            className="w-full p-2.5 text-xs bg-neutral-50 dark:bg-neutral-800/40 rounded-lg border-none font-bold text-neutral-800 dark:text-neutral-200"
                                                        />
                                                    </div>
                                                </div>
                                                {fertilizationCompounds.length > 1 && (
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleRemoveFertCompoundRow(idx)}
                                                        className="p-2 text-neutral-400 hover:text-rose-500 rounded-xl cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 shrink-0 transition-all self-end mb-1"
                                                        title="إزالة السماد"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-end">
                                        <button 
                                            type="button" 
                                            onClick={handleAddFertCompoundRow}
                                            className="flex items-center gap-1.5 text-xs font-black text-primary hover:text-primary/80 transition-colors cursor-pointer"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span>إضافة سماد آخر</span>
                                        </button>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-neutral-400">ملاحظات وتفاصيل التسميد</label>
                                        <textarea 
                                            rows={2}
                                            value={fertilizationNotes}
                                            onChange={e => setFertilizationNotes(e.target.value)}
                                            className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 resize-none font-bold"
                                            placeholder="مثال: تم الحقن على فترتين ري بمعدل ربع ساعة..."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 🧪 Protection & Spraying Card */}
                        <div className="border border-neutral-150 dark:border-neutral-800/80 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 shadow-sm">
                            <button
                                type="button"
                                onClick={() => toggleSection('protection')}
                                className="w-full p-4 flex justify-between items-center hover:bg-neutral-50/50 dark:hover:bg-neutral-800/15 transition-colors cursor-pointer text-right"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl">
                                        <Shield className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-neutral-800 dark:text-neutral-200">🧪 رش مكافحة وآفات</span>
                                        <span className="text-[9.5px] text-neutral-400 font-bold">مبيدات الرش الوقائي، مكافحة الإصابات والآفات</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isSectionActive('protection') && (
                                        <span className="text-[9.5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                                            <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
                                            <span>تم الإدخال</span>
                                        </span>
                                    )}
                                    <ChevronDown className={`w-4 h-4 text-neutral-400 transform transition-transform duration-200 ${openSections.protection ? 'rotate-180' : ''}`} />
                                </div>
                            </button>
                            {openSections.protection && (
                                <div className="p-4 border-t border-neutral-100 dark:border-neutral-800/60 bg-neutral-50/30 dark:bg-neutral-900/40 space-y-4 animate-in slide-in-from-top-2 duration-150">
                                    
                                    {/* Part A: Spraying Compounds */}
                                    <div className="space-y-3">
                                        <span className="text-[10px] font-black text-neutral-400 block pr-1">🧪 مركبات ومبيدات الرش:</span>
                                        {sprayingCompounds.map((comp, idx) => (
                                            <div key={idx} className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-150 dark:border-neutral-800 relative group flex gap-3.5 items-center">
                                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                    <div className="space-y-1">
                                                        <label className="text-[9.5px] font-bold text-neutral-400 block">اسم المبيد/المركب</label>
                                                        <input
                                                            type="text"
                                                            list="common_spray"
                                                            value={comp.name}
                                                            onChange={e => handleSprayCompoundChange(idx, 'name', e.target.value)}
                                                            placeholder="مثال: مبيد فطري، أحماض أمينية..."
                                                            className="w-full p-2.5 text-xs bg-neutral-50 dark:bg-neutral-800/40 rounded-lg border-none font-bold text-neutral-800 dark:text-neutral-200"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9.5px] font-bold text-neutral-400 block">التركيز/النسبة</label>
                                                        <input
                                                            type="text"
                                                            value={comp.amount}
                                                            onChange={e => handleSprayCompoundChange(idx, 'amount', e.target.value)}
                                                            placeholder="مثال: نصف لتر، ٢٥٠ جرام..."
                                                            className="w-full p-2.5 text-xs bg-neutral-50 dark:bg-neutral-800/40 rounded-lg border-none font-bold text-neutral-800 dark:text-neutral-200"
                                                        />
                                                    </div>
                                                </div>
                                                {sprayingCompounds.length > 1 && (
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleRemoveSprayCompoundRow(idx)}
                                                        className="p-2 text-neutral-400 hover:text-rose-500 rounded-xl cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 shrink-0 transition-all self-end mb-1"
                                                        title="إزالة المركب"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-end">
                                        <button 
                                            type="button" 
                                            onClick={handleAddSprayCompoundRow}
                                            className="flex items-center gap-1.5 text-xs font-black text-primary hover:text-primary/80 transition-colors cursor-pointer"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span>إضافة مركب رش آخر</span>
                                        </button>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-neutral-450">ملاحظات حول عملية الرش</label>
                                        <textarea 
                                            rows={1.5}
                                            value={sprayingNotes}
                                            onChange={e => setSprayingNotes(e.target.value)}
                                            className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 resize-none font-bold"
                                            placeholder="مثال: رشة عقب المغرب، مخصصة للورق السفلي..."
                                        />
                                    </div>

                                    <hr className="border-neutral-200 dark:border-neutral-850" />

                                    {/* Part B: Pests & Infections */}
                                    <div className="space-y-3">
                                        <span className="text-[10px] font-black text-rose-500 block pr-1">🐛 تقرير الآفات والإصابات المكتشفة بالصوبة:</span>
                                        <div className="space-y-3 p-3 bg-red-500/5 rounded-xl border border-red-500/10">
                                            <div>
                                                <label className="text-[9.5px] font-bold text-neutral-600 dark:text-neutral-300 block mb-1">اسم الآفة أو المرض</label>
                                                <input 
                                                    type="text"
                                                    list="common_pests"
                                                    value={pestName}
                                                    onChange={e => setPestName(e.target.value)}
                                                    className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 font-bold text-neutral-700 dark:text-neutral-200"
                                                    placeholder="مثال: بياض زغبي، عنكبوت أحمر..."
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-3.5">
                                                <div>
                                                    <label className="text-[9.5px] font-bold text-neutral-600 dark:text-neutral-300 block mb-1">شدة الإصابة</label>
                                                    <select 
                                                        className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 font-bold text-neutral-700 dark:text-neutral-200"
                                                        value={pestSeverity}
                                                        onChange={e => setPestSeverity(e.target.value)}
                                                    >
                                                        <option value="خفيفة">🟢 خفيفة</option>
                                                        <option value="متوسطة">🟡 متوسطة</option>
                                                        <option value="شديدة">🔴 شديدة</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="text-[9.5px] font-bold text-neutral-600 dark:text-neutral-300 block mb-1">حالة البلاغ</label>
                                                    <select 
                                                        className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 font-bold text-neutral-700 dark:text-neutral-200"
                                                        value={pestStatus}
                                                        onChange={e => setPestStatus(e.target.value)}
                                                    >
                                                        <option value="نشطة وتحت العلاج">🔄 نشطة وتحت العلاج</option>
                                                        <option value="تمت المكافحة بنجاح">✅ تمت المكافحة بنجاح</option>
                                                        <option value="تحت الملاحظة">👀 تحت الملاحظة</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[9.5px] font-bold text-neutral-400 block">ملاحظات مكافحة الآفة</label>
                                                <textarea 
                                                    rows={1.5}
                                                    value={pestNotes}
                                                    onChange={e => setPestNotes(e.target.value)}
                                                    className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 resize-none font-bold"
                                                    placeholder="اكتب أية تفاصيل أخرى حول بؤرة الإصابة والمكافحة..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ✂️ Agricultural Operations & Labor Card */}
                        <div className="border border-neutral-150 dark:border-neutral-800/80 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 shadow-sm">
                            <button
                                type="button"
                                onClick={() => toggleSection('operations')}
                                className="w-full p-4 flex justify-between items-center hover:bg-neutral-50/50 dark:hover:bg-neutral-800/15 transition-colors cursor-pointer text-right"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 rounded-xl">
                                        <Wrench className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-neutral-800 dark:text-neutral-200">✂️ عمليات يدوية وعمالة</span>
                                        <span className="text-[9.5px] text-neutral-400 font-bold">تقليم، تهوية، تربيط، وعمالة الصوبة الزراعية</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isSectionActive('operations') && (
                                        <span className="text-[9.5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                                            <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
                                            <span>تم الإدخال</span>
                                        </span>
                                    )}
                                    <ChevronDown className={`w-4 h-4 text-neutral-400 transform transition-transform duration-200 ${openSections.operations ? 'rotate-180' : ''}`} />
                                </div>
                            </button>
                            {openSections.operations && (
                                <div className="p-4 border-t border-neutral-100 dark:border-neutral-800/60 bg-neutral-50/30 dark:bg-neutral-900/40 space-y-4 animate-in slide-in-from-top-2 duration-150">
                                    
                                    {/* Part A: AgriOps Quick Tags */}
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-black text-orange-650 dark:text-orange-400 block pr-1">✂️ اختر العمليات الفنية واليدوية المنجزة لليوم:</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {COMMON_AGRI_OPS.map(op => {
                                                const isSelected = selectedAgriOps.includes(op);
                                                return (
                                                    <button
                                                        key={op}
                                                        type="button"
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                setSelectedAgriOps(selectedAgriOps.filter(o => o !== op));
                                                            } else {
                                                                setSelectedAgriOps([...selectedAgriOps, op]);
                                                            }
                                                        }}
                                                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer border ${
                                                            isSelected 
                                                            ? 'bg-orange-500 border-orange-500 text-white shadow-xs' 
                                                            : 'bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-150 dark:bg-neutral-850 dark:hover:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-800'
                                                        }`}
                                                    >
                                                        {isSelected && <span className="text-[8px]">●</span>}
                                                        <span>{op}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Part B: Labor count */}
                                    <div className="space-y-1">
                                        <label className="text-[10.5px] font-bold text-neutral-600 dark:text-neutral-300">عدد عمال الصوبة بمشروع اليوم</label>
                                        <input 
                                            type="number"
                                            min="0"
                                            placeholder="مثال: 3 عمال..."
                                            value={workersCount}
                                            onChange={(e) => setWorkersCount(e.target.value ? Number(e.target.value) : '')}
                                            className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 font-bold"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-neutral-400">ملاحظات وتفاصيل إضافية</label>
                                        <textarea 
                                            rows={1.5}
                                            value={opsNotes}
                                            onChange={e => setOpsNotes(e.target.value)}
                                            className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 resize-none font-bold"
                                            placeholder="اكتب أية ملاحظات تفصيلية أخرى عن العمالة والعمليات الزراعية اليوم..."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 🧺 Harvest Card */}
                        <div className="border border-neutral-150 dark:border-neutral-800/80 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 shadow-sm">
                            <button
                                type="button"
                                onClick={() => toggleSection('harvest')}
                                className="w-full p-4 flex justify-between items-center hover:bg-neutral-50/50 dark:hover:bg-neutral-800/15 transition-colors cursor-pointer text-right"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
                                        <ShoppingBag className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-neutral-800 dark:text-neutral-200">🧺 حصاد المحصول</span>
                                        <span className="text-[9.5px] text-neutral-400 font-bold">سحب المحصول وتجميع الإنتاج والصناديق</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isSectionActive('harvest') && (
                                        <span className="text-[9.5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                                            <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
                                            <span>تم الإدخال</span>
                                        </span>
                                    )}
                                    <ChevronDown className={`w-4 h-4 text-neutral-400 transform transition-transform duration-200 ${openSections.harvest ? 'rotate-180' : ''}`} />
                                </div>
                            </button>
                            {openSections.harvest && (
                                <div className="p-4 border-t border-neutral-100 dark:border-neutral-800/60 bg-neutral-50/30 dark:bg-neutral-900/40 space-y-3.5 animate-in slide-in-from-top-2 duration-150">
                                    <div className="grid grid-cols-2 gap-3.5">
                                        <div className="space-y-1">
                                            <label className="text-[10.5px] font-bold text-neutral-600 dark:text-neutral-300">الكمية الإجمالية المحصودة</label>
                                            <input 
                                                type="number"
                                                min="0"
                                                placeholder="مثال: 25"
                                                value={harvestQuantity}
                                                onChange={(e) => setHarvestQuantity(e.target.value ? Number(e.target.value) : '')}
                                                className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 font-bold"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10.5px] font-bold text-neutral-600 dark:text-neutral-300">الوحدة المستخدمة</label>
                                            <select 
                                                value={harvestUnit}
                                                onChange={(e) => setHarvestUnit(e.target.value)}
                                                className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 font-bold text-neutral-700 dark:text-neutral-200"
                                            >
                                                <option value="قفص">قفص</option>
                                                <option value="كرتونة">كرتونة</option>
                                                <option value="برنيكة">برنيكة</option>
                                                <option value="كيلو">كيلو</option>
                                                <option value="طن">طن</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-neutral-400">ملاحظات الجودة والتعبئة</label>
                                        <textarea 
                                            rows={2}
                                            value={harvestNotes}
                                            onChange={e => setHarvestNotes(e.target.value)}
                                            className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 resize-none font-bold"
                                            placeholder="مثال: جودة الثمار عالية، تم الاستبعاد البسيط، الحجم متوسط..."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 🌿 Planting / الزراعة Card */}
                        <div className="border border-neutral-150 dark:border-neutral-800/80 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 shadow-sm">
                            <button
                                type="button"
                                onClick={() => toggleSection('planting')}
                                className="w-full p-4 flex justify-between items-center hover:bg-neutral-50/50 dark:hover:bg-neutral-800/15 transition-colors cursor-pointer text-right"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-xl">
                                        <Sprout className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-neutral-800 dark:text-neutral-200">🌿 زراعة شتلات جديدة</span>
                                        <span className="text-[9.5px] text-neutral-400 font-bold">زراعة أصناف ومحاصيل وشتلات جديدة بداخل الصوبة</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isSectionActive('planting') && (
                                        <span className="text-[9.5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                                            <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
                                            <span>تم الإدخال</span>
                                        </span>
                                    )}
                                    <ChevronDown className={`w-4 h-4 text-neutral-400 transform transition-transform duration-200 ${openSections.planting ? 'rotate-180' : ''}`} />
                                </div>
                            </button>
                            {openSections.planting && (
                                <div className="p-4 border-t border-neutral-100 dark:border-neutral-800/60 bg-neutral-50/30 dark:bg-neutral-900/40 space-y-3.5 animate-in slide-in-from-top-2 duration-150">
                                    <div className="space-y-1">
                                        <label className="text-[10.5px] font-bold text-neutral-600 dark:text-neutral-300">الصنف أو المحصول المزروع</label>
                                        <input 
                                            type="text"
                                            value={plantType}
                                            onChange={e => setPlantType(e.target.value)}
                                            className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 font-bold"
                                            placeholder="مثال: خيار بلدي هجين، طماطم شيري..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3.5">
                                        <div className="space-y-1">
                                            <label className="text-[10.5px] font-bold text-neutral-600 dark:text-neutral-300">الكمية المزروعة (اختياري)</label>
                                            <input 
                                                type="number"
                                                min="0"
                                                placeholder="مثال: 500"
                                                value={plantingQty}
                                                onChange={(e) => setPlantingQty(e.target.value ? Number(e.target.value) : '')}
                                                className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 font-bold"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10.5px] font-bold text-neutral-600 dark:text-neutral-300">الوحدة</label>
                                            <select 
                                                value={plantingUnit}
                                                onChange={(e) => setPlantingUnit(e.target.value)}
                                                className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 font-bold text-neutral-700 dark:text-neutral-200"
                                            >
                                                <option value="شتلة">شتلة</option>
                                                <option value="بذرة">بذرة</option>
                                                <option value="عروة">عروة</option>
                                                <option value="مصطبة">مصطبة</option>
                                                <option value="أخرى">أخرى</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-neutral-400">ملاحظات وتفاصيل الزراعة</label>
                                        <textarea 
                                            rows={2}
                                            value={plantingNotes}
                                            onChange={e => setPlantingNotes(e.target.value)}
                                            className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 resize-none font-bold"
                                            placeholder="أية ملاحظات إضافية حول نسبة نجاح التشتيل والنمو المبدئي..."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>

                    {/* General notes for the whole day log */}
                    <div className="space-y-1 bg-neutral-50 dark:bg-neutral-850/40 p-3.5 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                        <label className="text-[10px] font-black text-neutral-400">مذكرات أو ملاحظات عامة حول هذا السجل اليومي:</label>
                        <textarea 
                            className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-150 dark:border-neutral-800 rounded-xl outline-none focus:ring-1 focus:ring-primary h-[60px] resize-none font-bold"
                            placeholder="أي تفاصيل عامة تذكرك لاحقاً بأحداث اليوم (مثال: مشكلة الصنبور بالصوبة الخامسة، تفقد العمال)..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                {/* Submit actions bottom panel */}
                <div 
                    className="shrink-0 p-4 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-850 z-10 flex gap-3"
                    style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
                >
                    <button 
                        type="button"
                        onClick={onClose}
                        className="px-6 py-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 hover:dark:bg-neutral-700 text-sm font-black rounded-2xl active:scale-95 transition-colors cursor-pointer shrink-0"
                    >
                        إلغاء
                    </button>
                    <button 
                        onClick={handleSaveProcess}
                        className="flex-1 py-4 bg-primary hover:bg-opacity-95 text-white text-sm font-black rounded-2xl active:scale-95 transition-transform cursor-pointer"
                    >
                        💾 حفظ يوميات الصوبة
                    </button>
                </div>
            </div>
            
            {/* Native Datalists to facilitate choices */}
            <datalist id="common_pests">
                {COMMON_PESTS.map(p => <option key={p} value={p} />)}
            </datalist>
            <datalist id="common_spray">
                {COMMON_COMPOUNDS_SPRAY.map(p => <option key={p} value={p} />)}
            </datalist>
            <datalist id="common_fert">
                {COMMON_COMPOUNDS_FERT.map(p => <option key={p} value={p} />)}
            </datalist>
        </div>,
        document.body
    );
};

export default AddEditLogModal;
