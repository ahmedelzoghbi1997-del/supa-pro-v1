import React from 'react';
import { motion } from 'motion/react';
import { PlusIcon } from '../Icons';
import { useData } from '../../contexts/DataContext';

interface FABProps {
    onClick: () => void;
    label: string;
    icon?: React.ElementType;
    colorClass?: string;
}

const ExtendedFAB: React.FC<FABProps> = ({ 
    onClick, 
    label, 
    icon: Icon = PlusIcon,
    colorClass = "bg-primary hover:bg-primary/90"
}) => {
    const { profile } = useData();

    if (profile?.role === 'viewer' || !!profile?.parent_id) return null;

    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={`fixed left-6 lg:bottom-12 lg:left-12 z-[60] flex items-center gap-2 px-5 py-3.5 sm:px-6 sm:py-4 rounded-full text-white shadow-2xl shadow-primary/20 backdrop-blur-md transition-all ${colorClass}`}
            style={{ bottom: 'calc(82px + env(safe-area-inset-bottom, 16px))' }}
        >
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="font-bold text-sm sm:text-base tracking-wide">{label}</span>
        </motion.button>
    );
};

export default ExtendedFAB;
