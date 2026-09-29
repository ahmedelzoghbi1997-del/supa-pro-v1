import React from 'react';
import { useRealtime } from '../../contexts/UIContext';
import { useData } from '../../contexts/DataContext';
import { formatTimeAgo } from '../../utils/helpers';
import { BellIcon, CheckIcon, TrashIcon } from '../Icons';
import type { Notification, NotificationType } from '../../types';
import { NotificationSettingsModal } from './NotificationSettingsModal';
import { useState } from 'react';
import {
  DollarIcon,
  LightBulbIcon,
  UserGroupIcon,
  Cog6ToothIcon
} from '../Icons';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const getNotificationMeta = (type: NotificationType) => {
    switch(type) {
        case 'financial':
            return { Icon: DollarIcon, iconBg: 'bg-red-100 dark:bg-red-500/20', iconColor: 'text-red-500' };
        case 'administrative':
            return { Icon: UserGroupIcon, iconBg: 'bg-blue-100 dark:bg-blue-500/20', iconColor: 'text-blue-500' };
        case 'insight':
            return { Icon: LightBulbIcon, iconBg: 'bg-purple-100 dark:bg-purple-500/20', iconColor: 'text-purple-500' };
        case 'system':
            return { Icon: Cog6ToothIcon, iconBg: 'bg-neutral-200 dark:bg-neutral-700/50', iconColor: 'text-neutral-600 dark:text-neutral-300' };
        default:
            return { Icon: BellIcon, iconBg: 'bg-neutral-200 dark:bg-neutral-700/50', iconColor: 'text-neutral-500' };
    }
}

const NotificationItem: React.FC<{ notification: Notification }> = ({ notification }) => {
    const { markNotificationAsRead } = useRealtime();
    const { setActiveItem } = useData();
    const { Icon, iconBg, iconColor } = getNotificationMeta(notification.type);

    const handleClick = () => {
        markNotificationAsRead(notification.id);
        if (notification.link) {
            setActiveItem(notification.link);
        }
    }

    return (
        <button onClick={handleClick} className="w-full text-right p-4 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 border-b border-neutral-100 dark:border-neutral-700 flex gap-4 items-start transition-colors">
             {!notification.isRead && (
                <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-1.5" aria-label="إشعار جديد"></div>
             )}
            <div className={`flex-shrink-0 p-2 rounded-full ${iconBg} ${notification.isRead ? 'ml-5' : ''}`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div className="flex-grow">
                <p className={`font-semibold text-sm ${notification.isRead ? 'text-neutral-600 dark:text-neutral-400' : 'text-neutral-800 dark:text-neutral-200'}`}>{notification.title}</p>
                <p className={`text-sm ${notification.isRead ? 'text-neutral-500 dark:text-neutral-500' : 'text-neutral-500 dark:text-neutral-400'}`}>{notification.message}</p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">{formatTimeAgo(notification.timestamp)}</p>
            </div>
        </button>
    );
};

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ isOpen }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { notifications, markAllNotificationsAsRead, clearNotifications } = useRealtime();

  if (!isOpen) return null;

  const sortedNotifications = [...notifications].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <>
    <div className="absolute top-full mt-2 left-0 w-80 sm:w-96 bg-neutral-0 dark:bg-neutral-800 rounded-lg shadow-soft-lg border border-neutral-200 dark:border-neutral-700 z-20 animate-page-enter flex flex-col">
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
        <h4 className="font-semibold text-neutral-800 dark:text-neutral-100">الإشعارات</h4>
        <button
            onClick={() => setIsSettingsOpen(true)}
            className="mt-2 w-full flex items-center justify-center gap-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700/50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
        >
            <Cog6ToothIcon className="w-4 h-4" />
            <span>إعدادات الإشعارات</span>
        </button>
      </div>
      
      <div className="flex-grow max-h-96 overflow-y-auto">
        {sortedNotifications.length > 0 ? (
            sortedNotifications.map(notif => (
                <NotificationItem key={notif.id} notification={notif} />
            ))
        ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 text-neutral-500 dark:text-neutral-400">
                <BellIcon className="w-12 h-12 text-neutral-300 dark:text-neutral-600" />
                <p className="mt-4 font-semibold">لا توجد إشعارات</p>
                <p className="text-sm">لم يتم تسجيل أي تنبيهات جديدة بعد.</p>
            </div>
        )}
      </div>
      
       <div className="p-2 bg-neutral-50 dark:bg-neutral-900/50 border-t border-neutral-200 dark:border-neutral-700 flex justify-between items-center">
        <button onClick={markAllNotificationsAsRead} className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline px-3 py-1.5 rounded-md">
          <CheckIcon className="w-4 h-4" />
          تحديد الكل كمقروء
        </button>
        <button onClick={clearNotifications} className="flex items-center gap-1.5 text-sm font-semibold text-accent-danger hover:underline px-3 py-1.5 rounded-md">
           <TrashIcon className="w-4 h-4" />
            مسح الكل
        </button>
      </div>
    </div>
    <NotificationSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};

export default NotificationsPanel;