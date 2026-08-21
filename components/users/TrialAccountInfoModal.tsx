import React from 'react';
import Modal from '../shared/Modal';
import { useToast } from '../../hooks/useToast';
import { ClipboardIcon, EnvelopeIcon, LockClosedIcon } from '../Icons';

interface TrialAccountInfoModalProps {
    credentials: { email: string; pass: string };
    onClose: () => void;
}

const InfoRow: React.FC<{ label: string, value: string, icon: React.FC<any> }> = ({ label, value, icon: Icon }) => {
    const { showToast } = useToast();
    
    const copyToClipboard = () => {
        navigator.clipboard.writeText(value);
        showToast(`تم نسخ ${label}`);
    };

    return (
        <div>
            <label className="block text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">{label}</label>
            <div className="flex items-center gap-2">
                <div className="relative flex-grow">
                     <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <Icon className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                    </div>
                    <input 
                        type="text" 
                        readOnly 
                        value={value} 
                        className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg p-3 pr-10 font-mono"
                    />
                </div>
                <button onClick={copyToClipboard} className="p-3 bg-neutral-200 dark:bg-neutral-700 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors" aria-label={`نسخ ${label}`}>
                    <ClipboardIcon className="w-5 h-5"/>
                </button>
            </div>
        </div>
    );
};


const TrialAccountInfoModal: React.FC<TrialAccountInfoModalProps> = ({ credentials, onClose }) => {
    
    return (
        <Modal isOpen={true} onClose={onClose} title="بيانات الحساب التجريبي">
            <div className="space-y-4">
                <p className="text-neutral-500 dark:text-neutral-400">
                    تم إنشاء حساب تجريبي بنجاح. يمكنك مشاركة هذه البيانات مع المستخدم.
                </p>
                <InfoRow label="البريد الإلكتروني" value={credentials.email} icon={EnvelopeIcon} />
                <InfoRow label="كلمة المرور" value={credentials.pass} icon={LockClosedIcon} />
                <div className="pt-4 flex justify-end">
                    <button onClick={onClose} className="py-2 px-6 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors">
                        إغلاق
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default TrialAccountInfoModal;
