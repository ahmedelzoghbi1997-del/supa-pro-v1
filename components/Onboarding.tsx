import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sprout, Wallet, FileSpreadsheet, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface OnboardingProps {
    onComplete: () => void;
}

interface Slide {
    id: number;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    gradient: string;
    accentColor: string;
    shadowColor: string;
}

const slides: Slide[] = [
    {
        id: 0,
        title: 'أهلاً بك في المحاسب الزراعي',
        description: 'شريكك الذكي لإدارة شؤون الزراعة بذكاء وحكمة. تحكم متكامل في العروات والموارد لتحقيق أقصى ربحية ممكنة لمزرعتك.',
        icon: Sprout,
        gradient: 'from-emerald-500/20 via-emerald-600/5 to-transparent dark:from-emerald-500/10 dark:via-emerald-950/10 dark:to-transparent',
        accentColor: 'text-accent-success dark:text-accent-success bg-accent-success/10 dark:bg-accent-success/20 border-emerald-250 dark:border-accent-success/30',
        shadowColor: 'shadow-emerald-500/10'
    },
    {
        id: 1,
        title: 'إدارة الخزائن والعهد البنكية',
        description: 'تابع رصيد عهدة كل عروة نقدياً ولحظة بلغت، مع ميزات متطورة لإدارة عمليات السحب والإيداع وحوافظ البنوك بكل احترافية ودقة متناهية.',
        icon: Wallet,
        gradient: 'from-blue-500/20 via-blue-600/5 to-transparent dark:from-blue-500/10 dark:via-blue-950/10 dark:to-transparent',
        accentColor: 'text-accent-info dark:text-accent-info bg-accent-info/10 dark:bg-accent-info/20 border-blue-250 dark:border-accent-info/30',
        shadowColor: 'shadow-blue-500/10'
    },
    {
        id: 2,
        title: 'تقارير فورية وكشوف حسابات ذكية',
        description: 'وثّق المعاملات وشارك كشوف الحسابات الدقيقة فوراً مع الموردين، التجار، والشركاء بنقرة واحدة، لتواكب نمو استثمارك لحظة بلحظة.',
        icon: FileSpreadsheet,
        gradient: 'from-violet-500/20 via-violet-600/5 to-transparent dark:from-violet-500/10 dark:via-violet-950/10 dark:to-transparent',
        accentColor: 'text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-950/40 border-violet-250 dark:border-violet-900/40',
        shadowColor: 'shadow-violet-500/10'
    }
];

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState<'next' | 'prev'>('next');

    const activeSlide = slides[currentIndex];
    const IconComponent = activeSlide.icon;

    const handleNext = () => {
        if (currentIndex < slides.length - 1) {
            setDirection('next');
            setCurrentIndex(prev => prev + 1);
        } else {
            handleFinish();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setDirection('prev');
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleSkip = () => {
        handleFinish();
    };

    const handleFinish = () => {
        localStorage.setItem('onboarding_completed', 'true');
        onComplete();
    };

    // Slide transition variants
    const slideVariants = {
        enter: (dir: 'next' | 'prev') => ({
            x: dir === 'next' ? '100%' : '-100%',
            opacity: 0,
            scale: 0.96
        }),
        center: {
            x: 0,
            opacity: 1,
            scale: 1,
            transition: {
                x: { type: 'spring', stiffness: 220, damping: 26 },
                opacity: { duration: 0.25 },
                scale: { duration: 0.3 }
            }
        },
        exit: (dir: 'next' | 'prev') => ({
            x: dir === 'next' ? '-100%' : '100%',
            opacity: 0,
            scale: 0.96,
            transition: {
                x: { type: 'spring', stiffness: 220, damping: 26 },
                opacity: { duration: 0.2 },
                scale: { duration: 0.2 }
            }
        })
    };

    return (
        <div className="fixed inset-0 z-[110] flex flex-col justify-between bg-neutral-50 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-100 font-sans transition-colors duration-300 select-none overflow-hidden" dir="rtl">
            
            {/* Ambient Background Glow matching active slide */}
            <div className={`absolute inset-0 bg-gradient-to-b ${activeSlide.gradient} transition-all duration-700 pointer-events-none`} />

            {/* Top Bar with Brand and Skip Button */}
            <div className="relative z-10 flex items-center justify-between px-6 pt-12 pb-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-600/25">
                        <span className="text-sm">أ</span>
                    </div>
                    <span className="text-sm font-black text-neutral-800 dark:text-neutral-250 tracking-tight">
                        المحاسب الزراعي
                    </span>
                </div>
                
                {currentIndex < slides.length - 1 && (
                    <button 
                        onClick={handleSkip}
                        className="text-xs font-bold text-neutral-450 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors py-1.5 px-3 rounded-lg hover:bg-neutral-100/50 dark:hover:bg-neutral-900/50 cursor-pointer"
                    >
                        تخطي الجولة
                    </button>
                )}
            </div>

            {/* Main Slide Content Area */}
            <div className="flex-1 flex flex-col justify-center items-center px-6 md:px-12 relative z-10 max-w-lg mx-auto w-full">
                <div className="w-full relative min-h-[380px] flex items-center justify-center">
                    <AnimatePresence initial={false} custom={direction} mode="wait">
                        <motion.div
                            key={currentIndex}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            className="w-full flex flex-col items-center justify-center text-center py-2"
                        >
                            {/* Graphic/Icon with interactive hover backing */}
                            <motion.div 
                                initial={{ scale: 0.8, rotate: -8, opacity: 0 }}
                                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                transition={{ delay: 0.15, type: 'spring', stiffness: 180, damping: 15 }}
                                className={`w-32 h-32 rounded-[2.5rem] border-2 flex items-center justify-center mb-8 relative group ${activeSlide.accentColor} ${activeSlide.shadowColor}`}
                            >
                                {/* Decorative breathing rings */}
                                <div className="absolute inset-0 rounded-[2.5rem] bg-current opacity-5 animate-ping" />
                                <IconComponent className="w-16 h-16 transition-transform duration-300 group-hover:scale-110" />
                            </motion.div>

                            {/* Text labels */}
                            <motion.h2 
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.25, duration: 0.3 }}
                                className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white mb-4 leading-normal sm:leading-relaxed"
                            >
                                {activeSlide.title}
                            </motion.h2>

                            <motion.p 
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.35, duration: 0.3 }}
                                className="text-sm sm:text-base font-medium leading-relaxed sm:leading-loose text-neutral-500 dark:text-neutral-400 px-4"
                            >
                                {activeSlide.description}
                            </motion.p>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Bottom Controls Panel */}
            <div className="relative z-10 px-8 pb-12 pt-6 flex flex-col gap-6 max-w-lg mx-auto w-full">
                
                {/* Visual Indicators (Dots) */}
                <div className="flex items-center justify-center gap-2">
                    {slides.map((slide) => {
                        const isActive = slide.id === currentIndex;
                        return (
                            <button
                                key={slide.id}
                                onClick={() => {
                                    setDirection(slide.id > currentIndex ? 'next' : 'prev');
                                    setCurrentIndex(slide.id);
                                }}
                                className="focus:outline-none p-1 group cursor-pointer"
                                aria-label={`انتقل للشاشة ${slide.id + 1}`}
                            >
                                <motion.div
                                    animate={{ 
                                        width: isActive ? 24 : 8,
                                        backgroundColor: isActive 
                                            ? 'rgb(79, 70, 229)' 
                                            : 'rgba(156, 163, 175, 0.4)'
                                    }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                                    className="h-2 rounded-full"
                                />
                            </button>
                        );
                    })}
                </div>

                {/* Primary & Navigation Actions */}
                <div className="flex items-center justify-between gap-4 mt-2">
                    {/* Previous Button or subtle placeholder to keep spacing balanced */}
                    <AnimatePresence mode="wait">
                        {currentIndex > 0 ? (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.15 }}
                                onClick={handlePrev}
                                className="flex items-center gap-1.5 py-3.5 px-5 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-2xl font-black text-sm transition-all cursor-pointer border border-neutral-250/20 dark:border-neutral-800/40"
                            >
                                <ChevronRight className="w-4 h-4" />
                                السابق
                            </motion.button>
                        ) : (
                            <div className="w-[84px]" /> // dummy width to balance flex alignment
                        )}
                    </AnimatePresence>

                    {/* Next/Finish Button */}
                    <button
                        onClick={handleNext}
                        className="flex-1 max-w-[200px] flex items-center justify-center gap-2 py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-indigo-600/20 dark:shadow-none hover:shadow-indigo-600/30 transition-all cursor-pointer relative overflow-hidden group tap"
                    >
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 -translate-x-full group-hover:animate-shimmer" />

                        <span className="relative z-10">
                            {currentIndex === slides.length - 1 ? 'ابدأ الآن' : 'التالي'}
                        </span>
                        
                        <span className="relative z-10">
                            {currentIndex === slides.length - 1 ? (
                                <Check className="w-4 h-4" />
                            ) : (
                                <ChevronLeft className="w-4 h-4" />
                            )}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};
