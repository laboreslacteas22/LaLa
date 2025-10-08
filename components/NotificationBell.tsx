import React from 'react';
import BellIcon from './icons/BellIcon';

interface NotificationBellProps {
    unreadCount: number;
    onClick: () => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ unreadCount, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="relative text-gray-600 hover:text-brand-green p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label={`Notificaciones (${unreadCount} sin leer)`}
        >
            <BellIcon className="w-7 h-7" />
            {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </button>
    );
};

export default NotificationBell;