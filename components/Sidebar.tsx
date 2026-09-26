import React, { useRef, useState, useEffect } from 'react';
import type { NavItemId } from '../types';
import { LogoIcon, LogoutIcon } from './Icons';
import { supabase } from '../lib/supabase';
import { useData } from '../contexts/DataContext';
import { useNavigationItems } from '../hooks/useNavigationItems';
import { Preferences } from '@capacitor/preferences';

interface SidebarProps {
  activeItem: NavItemId;
  setActiveItem: (item: NavItemId) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeItem, setActiveItem, isOpen, onClose }) => {
  const { profile } = useData();
  const visibleNavItems = useNavigationItems();
  const navRef = useRef<HTMLElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ opacity: 0, height: '0px', transform: 'translateY(0px)' });
  const [localActiveItem, setLocalActiveItem] = useState<NavItemId>(activeItem);

  useEffect(() => {
    setLocalActiveItem(activeItem);
  }, [activeItem]);

  const handleLogout = async () => {
    localStorage.removeItem('virtual_auth');
    await Preferences.remove({ key: 'virtual_auth' });
    await Preferences.set({ key: 'was_explicitly_logged_out', value: 'true' });
    await supabase.auth.signOut();
    window.location.reload();
  };

  useEffect(() => {
    const navElement = navRef.current;
    if (!navElement || !localActiveItem) return;

    const timer = setTimeout(() => {
        const activeButton = navElement.querySelector(`[data-nav-id="${localActiveItem}"]`) as HTMLElement;
        if (activeButton) {
            const top = activeButton.offsetTop;
            const height = activeButton.offsetHeight;
            setIndicatorStyle({
                transform: `translateY(${top}px)`,
                height: `${height - 7}px`,
                opacity: 1
            });
        } else { 
            setIndicatorStyle({ opacity: 0, height: '0px', transform: 'translateY(0px)' });
        }
    }, 50);

    return () => clearTimeout(timer);
  }, [localActiveItem, visibleNavItems]);
  
  if (!profile) return null;

  const baseItemClasses = "flex relative items-center w-full p-3 my-1 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 hover:text-primary dark:hover:text-neutral-0 transition-colors duration-200 gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900";
  const activeItemClasses = "text-primary bg-gradient-to-l from-primary/10 to-transparent dark:from-primary/20 dark:to-transparent font-semibold";

  const sidebarClasses = `
    flex flex-col
    bg-neutral-0 dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 h-screen 
    fixed lg:relative inset-y-0 right-0 z-50 lg:z-40
    w-72 flex-shrink-0 in-app-select-none select-none
    transform-gpu transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
    ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
  `;

  return (
    <>
      <div 
          className={`fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          onClick={onClose} 
      />
      <aside className={sidebarClasses}>
        <div className="p-4 flex flex-col h-full">
          <div className="flex items-center justify-between gap-3 mb-2 pt-4 px-2">
            <div className="flex items-center gap-3">
              <LogoIcon className="w-11 h-11 shrink-0 filter drop-shadow-xs" />
              <div>
                <h1 className="text-lg font-black whitespace-nowrap text-neutral-800 dark:text-neutral-0 leading-none">المحاسب الزراعي</h1>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 inline-block">الأجندة الزراعية الذكية</span>
              </div>
            </div>
          </div>
          
          <div className="px-3 mb-2">
            <p className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400">المحاسبة اليومية</p>
          </div>

          <nav ref={navRef} className="relative flex-grow overflow-y-auto pr-2 mt-4">
            <div 
                className="absolute top-1 right-0 w-1 bg-primary rounded-r-full transition-all duration-300 ease-in-out"
                style={indicatorStyle}
            ></div>
            
            {visibleNavItems.map((section, sectionIndex) => (
              <div key={sectionIndex}>
                {section.title && (
                  <h2 className="px-3 my-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400">{section.title}</h2>
                )}
                <ul>
                  {section.items.map((item) => (
                    <li key={item.id}>
                      <button
                        data-nav-id={item.id}
                        onClick={() => {
                          if (item.id !== localActiveItem) {
                            setLocalActiveItem(item.id);
                            requestAnimationFrame(() => {
                                setTimeout(() => {
                                    setActiveItem(item.id);
                                }, 0);
                            });
                          }
                          if (onClose) onClose();
                        }}
                        className={`${baseItemClasses} ${item.id === localActiveItem ? activeItemClasses : ''}`}
                      >
                        <item.icon className="h-6 w-6" />
                        <span className="font-medium text-base">{item.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                 {sectionIndex < visibleNavItems.length - 1 && visibleNavItems[sectionIndex + 1]?.items.length > 0 && <hr className="my-3 border-neutral-200 dark:border-neutral-700/50" />}
              </div>
            ))}
          </nav>

          <div className="mt-auto px-2 py-4 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
            <button
              onClick={handleLogout}
              className={`${baseItemClasses} !my-0 text-accent-danger hover:bg-accent-danger/10 dark:hover:bg-accent-danger/20`}
            >
              <LogoutIcon className="h-6 w-6" />
              <span className="font-medium text-base">تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
