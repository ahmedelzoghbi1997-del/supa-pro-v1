
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ResponsiveContainer, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Legend, Area, ComposedChart } from 'recharts';
import type { Asset } from '../../types';
import { TrashIcon, PencilIcon, AssetIcon, CreditCardIcon, TrendingUpIcon, ChartBarIcon } from '../Icons';
import { formatCurrency, formatNumber, formatNumberWithCommas, parseFormattedNumber, getLocalDateString } from '../../utils/helpers';
import Breadcrumbs from '../shared/Breadcrumbs';
import { useData } from '../../contexts/DataContext';
import Modal from '../shared/Modal';
import { useSettings, terminology } from '../../contexts/SettingsContext';
import { useToast } from '../../hooks/useToast';

import ExtendedFAB from '../shared/ExtendedFAB';

// --- MODAL COMPONENT ---
interface AssetFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<Asset, 'id' | 'user_id' | 'created_at'> | Asset) => void;
    initialData?: Asset | null;
}

const AssetFormModal: React.FC<AssetFormModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [draft, setDraft] = useState({
        name: '',
        cost: '',
        date: getLocalDateString(),
        assetType: 'new' as 'new' | 'existing',
    });

    const clearDraft = () => {
        setDraft({
            name: '',
            cost: '',
            date: getLocalDateString(),
            assetType: 'new',
        });
    };

    const [editData, setEditData] = useState({
        name: initialData?.name || '',
        cost: initialData ? String(initialData.establishment_cost) : '',
        date: initialData?.establishment_date || getLocalDateString(),
        assetType: 'new' as 'new' | 'existing',
    });

    const formData = initialData?.id ? editData : draft;

    const setFormData = (updater: any) => {
        if (initialData?.id) {
            setEditData(updater);
        } else {
            setDraft(updater);
        }
    };

    const { name, cost, date, assetType } = formData;

    const setName = (val: string) => setFormData((prev: any) => ({ ...prev, name: val }));
    const setCost = (val: string) => setFormData((prev: any) => ({ ...prev, cost: val }));
    const setDate = (val: string) => setFormData((prev: any) => ({ ...prev, date: val }));
    const setAssetType = (val: 'new' | 'existing') => setFormData((prev: any) => ({ ...prev, assetType: val }));

    const [errors, setErrors] = useState<{ name?: string }>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && initialData) {
            setEditData({
                name: initialData.name || '',
                cost: String(initialData.establishment_cost),
                date: initialData.establishment_date || getLocalDateString(),
                assetType: 'new',
            });
            setErrors({});
            setIsSaving(false);
        }
    }, [isOpen, initialData]);
    
    const validate = () => {
        const newErrors: { name?: string } = {};
        if (!name.trim()) newErrors.name = 'اسم الأصل مطلوب.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;
        setIsSaving(true);
        const establishment_cost = (!initialData && assetType === 'existing') ? 0 : parseFloat(cost) || 0;
        const data = { name, establishment_cost, establishment_date: date || getLocalDateString() };
        if (initialData) onSave({ ...initialData, ...data });
        else {
            onSave(data);
            clearDraft();
        }
    };

    const handleCostChange = (value: string) => {
        const parsedValue = parseFormattedNumber(value);
        if (/^\d*\.?\d*$/.test(parsedValue)) setCost(parsedValue);
    };

    const inputClasses = "w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-slate-800 dark:text-white rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-primary transition";
    
    return (
         <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "تعديل بيانات الأصل" : "إضافة أصل جديد"}>
            <div className="space-y-6">
                 {!initialData && (
                    <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">ما هو نوع الأصل؟</label>
                        <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-200 dark:bg-neutral-700/50 rounded-lg">
                            <button type="button" onClick={() => setAssetType('new')} className={`py-2 rounded-md font-semibold transition ${assetType === 'new' ? 'bg-white dark:bg-neutral-600 text-primary' : 'text-neutral-500'}`}>أصل جديد (له تكلفة)</button>
                            <button type="button" onClick={() => setAssetType('existing')} className={`py-2 rounded-md font-semibold transition ${assetType === 'existing' ? 'bg-white dark:bg-neutral-600 text-primary' : 'text-neutral-500'}`}>أصل قائم (بدون تكلفة)</button>
                        </div>
                    </div>
                )}
                <div>
                    <label htmlFor="asset-name" className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">اسم الأصل</label>
                    <input id="asset-name" type="text" value={name} onChange={(e) => {setName(e.target.value); if (errors.name) setErrors({});}} className={`${inputClasses} ${errors.name ? 'border-accent-danger focus:border-accent-danger focus:ring-accent-danger/50' : ''}`} />
                    {errors.name && <p className="text-accent-danger text-xs mt-1 text-right">{errors.name}</p>}
                </div>
                {(initialData || assetType === 'new') && (
                    <div>
                        <label htmlFor="asset-cost" className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">التكلفة التأسيسية (اختياري)</label>
                        <input id="asset-cost" type="text" inputMode="decimal" value={formatNumberWithCommas(cost)} onChange={(e) => handleCostChange(e.target.value)} placeholder="0.00" className={inputClasses} />
                    </div>
                )}
                <div>
                    <label htmlFor="asset-date" className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">تاريخ الإنشاء (اختياري)</label>
                     <input id="asset-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClasses} />
                </div>
            </div>
            <div className="mt-8 flex justify-start gap-4 flex-row-reverse">
                <button onClick={handleSave} disabled={isSaving} className="py-2 px-6 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition disabled:bg-primary/50">
                    {isSaving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
                <button onClick={() => { clearDraft(); onClose(); }} className="py-2 px-4 bg-neutral-200 dark:bg-neutral-700 text-slate-800 dark:text-white rounded-lg hover:bg-neutral-300 transition hover:bg-neutral-300">إلغاء</button>
            </div>
        </Modal>
    );
};

// --- CARD COMPONENT ---
interface AssetCardProps {
    asset: Asset;
    onDelete: (id: string) => void;
    onEdit: (id: string) => void;
    onViewReport: (id: string) => void;
}
const AssetCard: React.FC<AssetCardProps> = ({ asset, onDelete, onEdit, onViewReport }) => {
    const { settings } = useSettings();
    const { showToast } = useToast();
    const term = terminology[settings.primaryTerm];
    const { cyclesWithCalculations } = useData();

    const assetCycles = useMemo(() => cyclesWithCalculations.filter((c: any) => c.asset_id === asset.id), [cyclesWithCalculations, asset.id]);
    const cycleCount = assetCycles.length;
    const canDelete = cycleCount === 0;

    const realizedCycles = useMemo(() => assetCycles.filter((c: any) => c.status !== 'active'), [assetCycles]);
    
    const totalRevenue = useMemo(() => realizedCycles.reduce((sum: number, c: any) => sum + (c.revenue || 0), 0), [realizedCycles]);
    const totalProfit = useMemo(() => realizedCycles.reduce((sum: number, c: any) => sum + (c.profit || 0), 0), [realizedCycles]);
    const netProfitWithSetup = totalProfit; // User states totalProfit already has setup costs deducted.
    
    const roi = useMemo(() => {
        if (asset.establishment_cost > 0) {
            return (netProfitWithSetup / asset.establishment_cost) * 100;
        } else if (totalRevenue > 0) {
            return (totalProfit / totalRevenue) * 100;
        }
        return 0;
    }, [netProfitWithSetup, asset.establishment_cost, totalProfit, totalRevenue]);

    const handleDeleteClick = () => {
        if (!canDelete) { showToast('لا يمكن حذف الأصل لوجود سجلات عروات مرتبطة به.', 'error'); return; }
        onDelete(asset.id);
    };

    return (
        <div className="bg-white dark:bg-[#111827]/70 rounded-2xl border border-neutral-200/65 dark:border-neutral-800 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-full overflow-hidden relative group">
            {/* Top decorative accent */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="p-5 flex-grow flex flex-col justify-between">
                <div>
                    {/* Header */}
                    <div className="flex justify-between items-start gap-3 mb-4">
                        <div className="min-w-0">
                            <h3 className="text-lg font-black text-neutral-800 dark:text-neutral-100 truncate tracking-tight group-hover:text-accent-info dark:group-hover:text-indigo-400 transition-colors duration-200">{asset.name}</h3>
                            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 font-bold mt-1 flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600" />
                                {asset.establishment_date ? `تاريخ الإنشاء: ${asset.establishment_date}` : 'إنشاء منذ مدة'}
                            </p>
                        </div>
                        <div className="bg-accent-info/10 dark:bg-accent-info/20 text-accent-info dark:text-accent-info p-2.5 rounded-xl shrink-0 border border-accent-info/20 dark:border-accent-info/30 transition-all duration-300 group-hover:scale-110">
                           <AssetIcon className="h-5 w-5"/>
                        </div>
                    </div>

                    {/* Highly Professional Advanced Info blocks */}
                    <div className="bg-neutral-50 dark:bg-neutral-900/40 rounded-xl p-3.5 space-y-3 mb-4 border border-neutral-100 dark:border-neutral-800/60 text-xs">
                        {/* Cycles count */}
                        <div className="flex justify-between items-center">
                            <span className="text-neutral-500 dark:text-neutral-400 font-bold flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                <span>عدد {term.plural}:</span>
                            </span>
                            <span className="font-extrabold text-neutral-800 dark:text-neutral-100 tabular-nums">
                                {formatNumber(cycleCount)} {term.plural}
                            </span>
                        </div>

                        {/* Setup cost or Status */}
                        <div className="flex justify-between items-center pt-2.5 border-t border-neutral-150/40 dark:border-neutral-800/40">
                            <span className="text-neutral-500 dark:text-neutral-400 font-bold flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-warning" />
                                <span>التكلفة التأسيسية:</span>
                            </span>
                            {asset.establishment_cost > 0 ? (
                                <span className="font-extrabold text-accent-warning dark:text-accent-warning tabular-nums">
                                    {formatCurrency(asset.establishment_cost).replace('EGP', 'ج.م')}
                                </span>
                            ) : (
                                <span className="text-2xs bg-accent-success/10 text-accent-success dark:text-accent-success px-2 py-0.5 rounded-full font-bold">
                                    أصل قائم
                                </span>
                            )}
                        </div>

                        {/* Net profits after setup */}
                        <div className="flex justify-between items-center pt-2.5 border-t border-neutral-150/40 dark:border-neutral-800/40">
                            <span className="text-neutral-500 dark:text-neutral-400 font-bold flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-success" />
                                <div className="flex flex-col">
                                    <span>إجمالي ربح الأصل (المكتمل):</span>
                                    {asset.establishment_cost > 0 && <span className="text-2xs text-neutral-400 font-normal">شامل التكاليف</span>}
                                </div>
                            </span>
                            <span className={`font-black tabular-nums ${netProfitWithSetup >= 0 ? 'text-accent-success dark:text-accent-success' : 'text-accent-danger dark:text-accent-danger'}`}>
                                {formatCurrency(netProfitWithSetup).replace('EGP', 'ج.م')}
                            </span>
                        </div>

                        {/* Return on Investment (ROI) */}
                        <div className="flex justify-between items-center pt-2.5 border-t border-neutral-150/40 dark:border-neutral-800/40">
                            <span className="text-neutral-500 dark:text-neutral-400 font-bold flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                <span>معدل العائد (ROI):</span>
                            </span>
                            <span className={`font-black text-[13px] tabular-nums ${roi >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-accent-danger dark:text-accent-danger'}`}>
                                {roi > 0 ? '+' : ''}{roi.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/40">
                    <button 
                        onClick={() => onViewReport(asset.id)} 
                        className="flex-grow bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-extrabold py-2 px-3 rounded-xl text-[11px] transition-all hover:shadow-[0_2px_8px_-1px_rgba(79,70,229,0.3)] duration-200 tap cursor-pointer"
                    >
                        عرض التقرير المالي
                    </button>
                    {onEdit && (
                        <button 
                            onClick={() => onEdit(asset.id)} 
                            className="p-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-200/50 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-xl tap transition cursor-pointer" 
                            title="تعديل الأصل"
                            aria-label="تعديل"
                        >
                            <PencilIcon className="h-4 w-4" />
                        </button>
                    )}
                    {onDelete && (
                        <button 
                            onClick={handleDeleteClick} 
                            className={`p-2 rounded-xl border tap transition cursor-pointer ${!canDelete ? 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200/40 dark:border-neutral-800/60 grayscale opacity-30 cursor-not-allowed' : 'bg-accent-danger/10 hover:bg-accent-danger/10 border-accent-danger/20 text-accent-danger dark:bg-accent-danger/20 dark:hover:bg-accent-danger/20 dark:border-accent-danger/30 dark:text-accent-danger'}`} 
                            title="حذف الأصل"
                            aria-label="حذف"
                        >
                            <TrashIcon className="h-4 w-4"/>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- REPORT COMPONENT ---
interface AssetReportProps {
    asset: Asset;
    onBack: () => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-neutral-800 p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-xl text-right dir-rtl">
                <p className="font-bold text-gray-800 dark:text-gray-100 mb-2 truncate">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center justify-between gap-4 text-sm mt-1">
                        <span style={{ color: entry.color }} className="font-medium">{entry.name}</span>
                        <span className="font-bold text-gray-900 dark:text-white">
                            {formatCurrency(entry.value).replace('EGP', '')} ج
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const AssetReport: React.FC<AssetReportProps> = ({ asset, onBack }) => {
    const { settings } = useSettings();
    const term = terminology[settings.primaryTerm];
    const { cyclesWithCalculations } = useData();
    
    const cyclePerformances = useMemo<any[]>(() => {
        return cyclesWithCalculations
            .filter(c => c.asset_id === asset.id)
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) // sort oldest to newest for charts
            .map(c => ({
                name: c.name, 
                revenue: c.revenue, 
                expenses: c.expenses, 
                netOwnerProfit: c.profit, 
                created_at: c.created_at,
                status: c.status
            }));
    }, [cyclesWithCalculations, asset.id]);

    const realizedPerformances = cyclePerformances.filter(c => c.status !== 'active');

    const totalRevenue = realizedPerformances.reduce((sum, cycle) => sum + cycle.revenue, 0);
    const totalOwnerProfit = realizedPerformances.reduce((sum, cycle) => sum + cycle.netOwnerProfit, 0);
    const lifetimeNetProfit = totalOwnerProfit;

    // Calculate Asset Yield / ROI %
    const roiPercentage = useMemo(() => {
        if (asset.establishment_cost > 0) {
            return ((lifetimeNetProfit / asset.establishment_cost) * 100);
        } else if (totalRevenue > 0) {
            return ((totalOwnerProfit / totalRevenue) * 100); // just profit margin if no setup cost
        }
        return 0;
    }, [lifetimeNetProfit, asset.establishment_cost, totalOwnerProfit, totalRevenue]);

    const isCostCovered = totalOwnerProfit >= (asset.establishment_cost || 0);

    return (
        <div className="text-slate-800 dark:text-white space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                     <Breadcrumbs items={[{ label: 'إدارة الأصول', onClick: onBack }, { label: `تقرير: ${asset.name}` }]} />
                    <h2 className="text-3xl font-black mt-4 text-neutral-800 dark:text-white tracking-tight">تقرير الأصل: {asset.name}</h2>
                    <p className="text-neutral-500 mt-1">تاريخ الإنشاء: {asset.establishment_date || 'غير محدد'}</p>
                </div>
                
                {/* Hero Yield Badge */}
                <div className={`p-4 rounded-2xl flex flex-col items-center justify-center min-w-[160px] shadow-sm border ${asset.establishment_cost > 0 && !isCostCovered ? 'bg-accent-warning/10/50 dark:bg-accent-warning/20 border-accent-warning/20 dark:border-accent-warning/30 text-accent-warning dark:text-accent-warning' : 'bg-accent-success/10/50 dark:bg-accent-success/20 border-accent-success/20 dark:border-accent-success/30 text-accent-success dark:text-accent-success'}`}>
                    <span className="text-xs font-semibold uppercase tracking-wider mb-1 opacity-80 text-center">
                        {asset.establishment_cost > 0 && !isCostCovered ? 'نسبة استرداد التكلفة' : 'عائد الاسترداد'}
                    </span>
                    <span className="text-3xl font-black">{roiPercentage > 0 && !isCostCovered ? '' : (roiPercentage > 0 ? '+' : '')}{roiPercentage.toFixed(1)}%</span>
                    <span className="text-[11px] font-bold mt-1 tabular-nums bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-full">
                        {asset.establishment_cost > 0 && !isCostCovered 
                            ? `باقي ${formatCurrency(Math.max(0, asset.establishment_cost - totalOwnerProfit)).replace('EGP', 'ج.م')}` 
                            : 'تمت التغطية بالكامل'}
                    </span>
                </div>
            </div>

            {/* Financial Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {asset.establishment_cost > 0 && (
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-lg"><CreditCardIcon className="w-5 h-5" /></div>
                            <h3 className="text-sm font-medium text-neutral-500">التكلفة التأسيسية</h3>
                        </div>
                        <p className="text-xl lg:text-2xl font-black">{formatCurrency(asset.establishment_cost)}</p>
                        <p className="text-2xs text-neutral-400 mt-1 font-bold">إجمالي تكلفة إنشاء الأصل</p>
                    </div>
                )}
                
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-accent-success/10 dark:bg-accent-success/20 text-accent-success dark:text-accent-success rounded-lg"><TrendingUpIcon className="w-5 h-5" /></div>
                        <h3 className="text-sm font-medium text-neutral-500">أرباح العروات</h3>
                    </div>
                    <p className="text-xl lg:text-2xl font-black text-accent-success dark:text-accent-success">{formatCurrency(totalOwnerProfit)}</p>
                    <p className="text-2xs text-neutral-400 mt-1 font-bold">تراكم أرباح العروات المكتملة</p>
                </div>
                
                {asset.establishment_cost > 0 && (
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-accent-info/10 dark:bg-accent-info/20 text-accent-info dark:text-accent-info rounded-lg"><ChartBarIcon className="w-5 h-5" /></div>
                            <h3 className="text-sm font-medium text-accent-info dark:text-accent-info">المتبقي للتغطية</h3>
                        </div>
                        <p className="text-xl lg:text-2xl font-black text-accent-info dark:text-accent-info">{formatCurrency(Math.max(0, asset.establishment_cost - totalOwnerProfit))}</p>
                        <p className="text-2xs text-accent-info dark:text-accent-info/70 mt-1 font-bold">الباقي لاسترداد التكلفة التأسيسية</p>
                    </div>
                )}

                <div className={`bg-gradient-to-br p-5 rounded-2xl shadow-sm ${(totalOwnerProfit - (asset.establishment_cost || 0)) >= 0 ? 'from-emerald-500 to-emerald-600 text-white' : 'from-slate-600 to-slate-700 text-white'} ${asset.establishment_cost > 0 ? 'lg:col-span-1' : 'lg:col-span-2'}`}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-white/20 rounded-lg"><AssetIcon className="w-5 h-5 text-white" /></div>
                        <h3 className="text-sm font-medium text-white/90">صافي ربح الأصل</h3>
                    </div>
                    <div className="flex items-baseline gap-1" dir="ltr">
                        <p className="text-xl lg:text-2xl font-black mb-1">
                            {(totalOwnerProfit - (asset.establishment_cost || 0)) > 0 ? '+' : ''}{formatCurrency(totalOwnerProfit - (asset.establishment_cost || 0))}
                        </p>
                    </div>
                    <p className="text-2xs text-white/80">
                        {asset.establishment_cost > 0 ? 'أرباح العروات بعد خصم التأسيس' : 'إجمالي أرباح الأصل'}
                    </p>
                </div>
            </div>

            {/* Performance Chart */}
            {cyclePerformances.length > 0 ? (
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl shadow-sm">
                    <h3 className="text-xl font-bold mb-6 text-neutral-800 dark:text-white">أداء {term.plural} عبر الزمن</h3>
                    <div className="h-[350px] w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={cyclePerformances} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorNetProfit" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                                <XAxis 
                                    dataKey="name" 
                                    tick={{ fill: '#6B7280', fontSize: 12, fontFamily: 'Inter' }} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tickMargin={10} 
                                />
                                <YAxis 
                                    tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} 
                                    tick={{ fill: '#6B7280', fontSize: 12, fontFamily: 'Inter' }} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tickMargin={10}
                                />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px', fontWeight: '500' }} />
                                
                                <Bar dataKey="revenue" name="إيرادات" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                <Bar dataKey="expenses" name="مصروفات" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                <Area type="monotone" dataKey="netOwnerProfit" name="الربح الصافي" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorNetProfit)" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 rounded-3xl shadow-sm text-center">
                    <p className="text-neutral-500 font-medium">لا توجد {term.plural} مسجلة حالياً لعرض الأداء.</p>
                </div>
            )}

            {/* Cycle History Table */}
            {cyclePerformances.length > 0 && (
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-sm overflow-hidden mt-6">
                    <div className="p-6 border-b border-neutral-100 dark:border-neutral-800">
                        <h3 className="text-xl font-bold text-neutral-800 dark:text-white">سجل {term.plural}</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 font-medium border-b border-neutral-200 dark:border-neutral-800">
                                <tr>
                                    <th className="p-4 whitespace-nowrap">اسم {term.singular}</th>
                                    <th className="p-4 whitespace-nowrap">حالة {term.singular}</th>
                                    <th className="p-4 whitespace-nowrap">الإيرادات</th>
                                    <th className="p-4 whitespace-nowrap">المصروفات</th>
                                    <th className="p-4 whitespace-nowrap">الربح الصافي</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {[...cyclePerformances].reverse().map((cycle, i) => (
                                    <tr key={i} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/20 transition-colors">
                                        <td className="p-4 font-bold text-neutral-800 dark:text-neutral-200">{cycle.name}</td>
                                        <td className="p-4">
                                            {cycle.status === 'active' ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-accent-success/10 text-accent-success dark:bg-accent-success/20 dark:text-accent-success">نشطة حالياً</span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">مكتملة</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-accent-success dark:text-accent-success font-medium">{formatCurrency(cycle.revenue)}</td>
                                        <td className="p-4 text-accent-danger dark:text-accent-danger font-medium">{formatCurrency(cycle.expenses)}</td>
                                        <td className="p-4 font-black text-accent-info dark:text-accent-info" dir="ltr">
                                            {cycle.netOwnerProfit > 0 ? '+' : ''}{formatCurrency(cycle.netOwnerProfit)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- MANAGER COMPONENT ---
const AssetManager: React.FC = () => {
    const { assets, addAsset, updateAsset, deleteAsset, profile } = useData();
    const { showToast } = useToast();
    
    // تعديل: نستعيد الحالة من history إذا كانت موجودة (للرجوع للخلف بشكل صحيح)
    const [view, setView] = useState<'list' | 'report'>(() => {
        return window.history.state?.assetReport ? 'report' : 'list';
    });
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(() => {
        return window.history.state?.assetReport || null;
    });

    const [isModalOpen, setModalOpen] = useState(false);
    const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
    const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const isViewer = profile?.role === 'viewer';

    const editingAsset = useMemo(() => {
        if (!editingAssetId) return null;
        return assets.find(a => a.id === editingAssetId) || null;
    }, [editingAssetId, assets]);

    const handleSave = (data: Omit<Asset, 'id' | 'user_id' | 'created_at'> | Asset) => {
        if ('id' in data) { updateAsset(data); showToast('تم تحديث الأصل بنجاح.'); }
        else { addAsset(data); showToast('تم إضافة الأصل بنجاح.'); }
        setModalOpen(false); setEditingAssetId(null);
    };

    const handleStartAddNew = () => { setEditingAssetId(null); setModalOpen(true); };
    const handleStartEdit = (id: string) => { setEditingAssetId(id); setModalOpen(true); };
    const handleDeleteRequest = (id: string) => { const asset = assets.find(a => a.id === id); if (asset) setAssetToDelete(asset); };

    const confirmDelete = async () => {
        if (assetToDelete) {
            setIsDeleting(true);
            try {
                const success = await deleteAsset(assetToDelete.id);
                if (success) { 
                    showToast('تم حذف الأصل بنجاح.', 'success'); 
                    if (selectedAssetId === assetToDelete.id) { 
                        setView('list'); 
                        setSelectedAssetId(null); 
                    } 
                }
            } catch (_e) {
                showToast('فشل الحذف.', 'error');
            } finally {
                setIsDeleting(false);
            }
        }
        setAssetToDelete(null);
    };

    const handleViewReport = (id: string) => {
        window.history.pushState({ ...window.history.state, assetReport: id }, '', window.location.href);
        setSelectedAssetId(id); setView('report');
    };
    const handleBackToList = useCallback(() => { setView('list'); setSelectedAssetId(null); window.history.back(); }, []);

    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => { if (view === 'report' && !event.state?.assetReport) { setView('list'); setSelectedAssetId(null); } };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [view]);

    const selectedAsset = useMemo(() => assets.find(gh => gh.id === selectedAssetId), [selectedAssetId, assets]);

    return (
        <div className="h-full">
            <Modal isOpen={!!assetToDelete} onClose={() => setAssetToDelete(null)} title="تأكيد حذف الأصل">
                <p className="text-neutral-500">هل أنت متأكد من حذف هذا الأصل؟</p>
                <div className="mt-6 flex justify-start gap-4 flex-row-reverse">
                    <button 
                        onClick={confirmDelete} 
                        disabled={isDeleting}
                        className="rounded-lg bg-accent-danger px-4 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isDeleting ? 'جاري الحذف...' : 'حذف'}
                    </button>
                    <button 
                        onClick={() => setAssetToDelete(null)} 
                        disabled={isDeleting}
                        className="rounded-lg bg-neutral-100 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        إلغاء
                    </button>
                </div>
            </Modal>
            <AssetFormModal isOpen={isModalOpen} onClose={() => {setModalOpen(false); setEditingAssetId(null);}} onSave={handleSave} initialData={editingAsset} />
            <div key={view} className="animate-page-enter">
                {view === 'report' && selectedAsset ? <AssetReport asset={selectedAsset} onBack={handleBackToList} /> : (
                    <div className="space-y-5">
                        {/* Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {assets.map(asset => <AssetCard key={asset.id} asset={asset} onDelete={isViewer ? undefined : handleDeleteRequest} onEdit={isViewer ? undefined : handleStartEdit} onViewReport={handleViewReport} />)}
                        </div>
                    </div>
                )}
            </div>
            {view === 'list' && !isViewer && <ExtendedFAB onClick={handleStartAddNew} label="أصل" />}
        </div>
    );
};

export default AssetManager;
