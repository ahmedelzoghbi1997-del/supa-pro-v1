import React from 'react';
import type { Profile } from '../../types';
import { CheckCircleIcon, WhatsAppIcon } from '../Icons';
import { createRipple } from '../../utils/helpers';
import { useSettings } from '../../contexts/SettingsContext';

interface WelcomePageProps {
  profile: Profile;
  onContinue: () => void;
}

const WelcomePage: React.FC<WelcomePageProps> = ({ profile, onContinue }) => {
  const { settings } = useSettings();

  const rawName = profile.full_name;
  const displayName = rawName && !rawName.includes('@') && rawName !== 'مستخدم جديد'
    ? rawName
    : (rawName?.split('@')[0] || profile.email?.split('@')[0] || 'المستخدم');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-100 dark:bg-neutral-900 text-center p-6 animate-page-enter">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center bg-white dark:bg-neutral-800 p-8 rounded-2xl shadow-soft-lg border border-neutral-200 dark:border-neutral-700">
          <CheckCircleIcon className="w-20 h-20 text-primary mb-5" />
          <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">
            أهلاً بك يا {displayName}!
          </h1>
          <p className="mt-3 text-neutral-600 dark:text-neutral-300">
            {settings.welcome_message}
          </p>
          
          <button
            onClick={(e) => {
              createRipple(e);
              onContinue();
            }}
            className="w-full mt-8 ripple-effect relative flex justify-center rounded-lg bg-primary py-3 px-4 text-md font-semibold text-white hover:bg-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-dark transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95"
          >
            الدخول إلى حسابك
          </button>
        </div>

        <div className="mt-8 text-center bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border border-green-200 dark:border-green-700/50">
          <p className="font-semibold text-green-800 dark:text-green-300">للمساعدة أو الاستفسار، تواصل مع الدعم الفني عبر واتساب:</p>
          <a 
            href={`https://wa.me/${settings.support_whatsapp}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-3 text-lg font-bold text-green-600 dark:text-green-400 hover:underline"
          >
            <WhatsAppIcon className="w-6 h-6" />
            <span>{settings.support_whatsapp}</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;