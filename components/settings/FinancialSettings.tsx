import { useState } from 'react';
import React from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import Card from '../shared/Card';
import Modal from '../shared/Modal';
import { DiscountType } from '../../types';
import ManageExpenseCategories from './ManageExpenseCategories';
import ManageMarkets from './ManageMarkets';
import ManageDeductionItems from './ManageDeductionItems';

const FinancialSettings: React.FC = () => {
    const { settings, updateSettings } = useSettings();
    const [isCategoriesModalOpen, setCategoriesModalOpen] = useState(false);
    const [isMarketsModalOpen, setMarketsModalOpen] = useState(false);
    const [isDeductionsModalOpen, setDeductionsModalOpen] = useState(false);

    const discountTypeOptions: { id: DiscountType, label: string }[] = [
        { id: 'custom', label: 'بنود مخصصة' },
        { id: 'single', label: 'خصم إجمالي' },
    ];

    return (
        <>
            <Modal isOpen={isCategoriesModalOpen} onClose={() => setCategoriesModalOpen(false)} title="إدارة فئات المصروفات" size="lg">
                <ManageExpenseCategories onClose={() => setCategoriesModalOpen(false)} />
            </Modal>
            
            <Modal isOpen={isMarketsModalOpen} onClose={() => setMarketsModalOpen(false)} title="إدارة أسواق البيع" size="md">
                <ManageMarkets onClose={() => setMarketsModalOpen(false)} />
            </Modal>
            
             <Modal isOpen={isDeductionsModalOpen} onClose={() => setDeductionsModalOpen(false)} title="إدارة بنود الخصومات" size="md">
                <ManageDeductionItems onClose={() => setDeductionsModalOpen(false)} />
            </Modal>

            <div className="space-y-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">الإعدادات المالية</h2>
                
                <div className="space-y-4">
                    <Card>
                        <div className="flex flex-col gap-4">
                            <div>
                                <h4 className="font-semibold text-lg text-slate-800 dark:text-white mb-1">نوع الخصم في الفواتير</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">اختر طريقة إدخال الخصومات في فواتير البيع.</p>
                            </div>
                            
                            <div className="bg-gray-100 dark:bg-[#0D1423] p-1.5 rounded-lg flex items-center justify-between gap-2 max-w-sm">
                                {discountTypeOptions.map((option) => (
                                    <button
                                        key={option.id}
                                        onClick={() => updateSettings({ discountType: option.id })}
                                        className={`flex-1 text-center py-2 rounded-md text-sm font-semibold transition-colors duration-300 ${
                                            settings.discountType === option.id 
                                                ? 'bg-primary text-white shadow-sm' 
                                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800/50'
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                            <div className="flex-1">
                                <h4 className="font-semibold text-lg text-slate-800 dark:text-white">إدارة فئات المصروفات</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">إضافة أو تعديل فئات المصروفات وتحديد نوعها (تشغيلي أو تأسيسي).</p>
                            </div>
                            <button onClick={() => setCategoriesModalOpen(true)} className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-slate-800 dark:text-white font-semibold py-2 px-6 rounded-lg transition-colors">
                                إدارة
                            </button>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                            <div className="flex-1">
                                <h4 className="font-semibold text-lg text-slate-800 dark:text-white">إدارة أسواق البيع</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">تخصيص قائمة الأسواق المتاحة عند إضافة فاتورة بيع.</p>
                            </div>
                            <button onClick={() => setMarketsModalOpen(true)} className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-slate-800 dark:text-white font-semibold py-2 px-6 rounded-lg transition-colors">
                                إدارة
                            </button>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                            <div className="flex-1">
                                <h4 className="font-semibold text-lg text-slate-800 dark:text-white">إدارة بنود الخصومات</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">حفظ أسماء الخصومات الشائعة لسهولة إدخالها في الفواتير.</p>
                            </div>
                            <button onClick={() => setDeductionsModalOpen(true)} className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-slate-800 dark:text-white font-semibold py-2 px-6 rounded-lg transition-colors">
                                إدارة
                            </button>
                        </div>
                    </Card>
                </div>
            </div>
        </>
    );
};

export default FinancialSettings;
