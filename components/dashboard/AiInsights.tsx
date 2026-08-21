
import React, { useState, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { useData } from '../../contexts/DataContext';
import { SparklesIcon } from '../Icons';
import { calculateInvoiceTotal } from '../../utils/helpers';
import Skeleton from '../shared/Skeleton';

const AiInsights: React.FC = () => {
    const { profile, cyclesWithCalculations, invoices, expenses } = useData();
    const [insight, setInsight] = useState<string | null>('انقر على "تحديث" للحصول على تحليل ذكي لبياناتك.');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateInsight = useCallback(async () => {
        setLoading(true);
        setError(null);
        setInsight(null);

        try {
            // 1. Prepare a summary of the data
            const activeCycles = cyclesWithCalculations.filter(c => c.status === 'active');
            const now = new Date();
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

            const currentMonthRevenue = invoices
                .filter(i => new Date(i.date) > lastMonth && activeCycles.some(c => c.id === i.cycle_id) && i.market !== 'رصيد منقول')
                .reduce((sum, inv) => sum + calculateInvoiceTotal(inv.price_items, inv.deductions), 0);

            const currentMonthExpenses = expenses
                .filter(e => new Date(e.date) > lastMonth && activeCycles.some(c => c.id === e.cycle_id))
                .reduce((sum, exp) => sum + exp.amount, 0);

            const summaryData = {
                currentMonth: {
                    revenue: currentMonthRevenue,
                    expenses: currentMonthExpenses,
                },
                activeCycles: activeCycles.map(c => ({
                    name: c.name,
                    revenue: c.revenue,
                    expenses: c.expenses,
                    profit: c.profit,
                    expenseBreakdown: c.expenseBreakdown?.map(b => ({ category: b.category, amount: b.amount })),
                })),
            };
            
            if (summaryData.activeCycles.length === 0 && summaryData.currentMonth.revenue === 0 && summaryData.currentMonth.expenses === 0) {
                 setInsight('لا توجد بيانات كافية لتقديم تحليل. ابدأ بإضافة بعض المعاملات!');
                 setLoading(false);
                 return;
            }

            // 2. Call Gemini API
            // FIX: Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY}); as per guidelines.
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `
                مرحباً، اسمي هو ${profile?.full_name || 'المستخدم'}.
                هذه هي بياناتي المالية الزراعية للشهر الحالي والعروات النشطة:
                ${JSON.stringify(summaryData, null, 2)}

                قدم لي ملاحظة ذكية ومختصرة (جملة واحدة أو اثنتين) باللغة العربية. ركز على أهم شيء، مثل زيادة كبيرة في المصاريف، أو أداء ممتاز لعروة معينة، أو مقارنة الإيرادات بالمصروفات. اجعل النص ودودًا ومباشرًا.
            `;
            
            // FIX: Use 'gemini-3-flash-preview' for Basic Text Tasks as per instructions
            const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt,
            });

            setInsight(response.text);

        } catch (err: unknown) {
            console.error("Error generating AI insight:", err);
            let errorMessage = 'تعذر الحصول على التحليل الآن. حاول مرة أخرى.';
            if (err instanceof Error && (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED'))) {
                errorMessage = 'تم تجاوز حد الطلبات الحالية. يرجى المحاولة مرة أخرى لاحقًا.';
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [cyclesWithCalculations, invoices, expenses, profile]);

    const renderContent = () => {
        if (loading) {
            return (
                <div className="space-y-2">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">يقوم مساعدك الذكي بتحليل بياناتك...</p>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
            );
        }
        if (error) {
            return <p className="text-sm text-accent-danger">{error}</p>;
        }
        if (insight) {
            return <p className="text-sm md:text-base text-neutral-600 dark:text-neutral-300 leading-relaxed">{insight}</p>;
        }
        return null;
    };

    return (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-neutral-800 dark:to-neutral-900/50 p-5 rounded-lg shadow-soft border border-neutral-200 dark:border-neutral-700">
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                    <SparklesIcon className="w-6 h-6 text-accent-purple" />
                    <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">تحليلات ذكية</h3>
                </div>
                <button 
                    onClick={generateInsight} 
                    disabled={loading}
                    className="text-sm font-semibold text-primary hover:underline disabled:opacity-50"
                >
                    {loading ? '...' : 'تحديث'}
                </button>
            </div>
            {renderContent()}
        </div>
    );
};

export default AiInsights;
