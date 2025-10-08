
import React from 'react';
import { AppNotification, NotificationPriority } from '../types';
import BellIcon from './icons/BellIcon';
import XMarkIcon from './icons/XMarkIcon';

interface NotificationPanelProps {
    notifications: AppNotification[];
    onClose: () => void;
    onClearAll: () => void;
    onNotificationClick: (notification: AppNotification) => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ notifications, onClose, onClearAll, onNotificationClick }) => {
    
    // FIX: When using `reduce`, explicitly type the initial value of the accumulator.
    // The empty object `{}` is too generic, causing TypeScript to infer `unknown` for the values, leading to an error on `.map()`.
    const groupedNotifications = notifications.reduce((acc, notif) => {
        const date = new Date(notif.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(notif);
        return acc;
    }, {} as Record<string, AppNotification[]>);

    return (
        <div 
            className="fixed top-20 right-4 w-96 max-w-[90vw] bg-white rounded-lg shadow-2xl border z-50 animate-fade-in-down flex flex-col max-h-[70vh]"
        >
            <header className="flex justify-between items-center p-4 border-b">
                <h2 className="text-lg font-bold text-brand-darkgreen">Notificaciones</h2>
                <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200"><XMarkIcon className="w-5 h-5"/></button>
            </header>
            
            <div className="flex-1 overflow-y-auto">
                {notifications.length > 0 ? (
                    Object.entries(groupedNotifications).map(([date, notifs]) => (
                        <div key={date}>
                            <h3 className="text-sm font-semibold text-gray-500 bg-gray-50 p-2 sticky top-0">{date}</h3>
                            <ul className="divide-y">
                                {notifs.map(n => (
                                    <li key={n.id} className="relative">
                                        <button
                                            onClick={() => onNotificationClick(n)}
                                            className={`w-full text-left p-3 transition-colors hover:bg-gray-100 ${!n.isRead ? 'bg-blue-50' : ''} ${n.priority === NotificationPriority.High ? 'border-l-4 border-red-500' : 'border-l-4 border-transparent'}`}
                                        >
                                            <p className="font-semibold text-gray-800">{n.title}</p>
                                            <p className="text-sm text-gray-600">{n.message}</p>
                                            <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleTimeString()}</p>
                                            {n.priority === NotificationPriority.High && !n.isTaskCompleted && (
                                                <span className="text-xs font-bold text-red-600">ACCIÓN REQUERIDA</span>
                                            )}
                                        </button>
                                        {!n.isRead && (
                                            <div className="absolute top-1/2 right-4 -translate-y-1/2 w-2.5 h-2.5 bg-blue-500 rounded-full" title="No leído"></div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))
                ) : (
                    <div className="text-center p-8 text-gray-500">
                        <BellIcon className="w-16 h-16 mx-auto text-gray-300" />
                        <p className="mt-4 font-semibold">Todo está al día</p>
                        <p className="text-sm">No tienes notificaciones.</p>
                    </div>
                )}
            </div>
            
            {notifications.length > 0 && (
                <footer className="p-2 border-t bg-gray-50 rounded-b-lg">
                    <button onClick={onClearAll} className="w-full text-center text-sm text-brand-green font-semibold hover:underline p-1 disabled:text-gray-400 disabled:no-underline" disabled={!notifications.some(n => n.isRead)}>
                        Limpiar notificaciones leídas
                    </button>
                </footer>
            )}
        </div>
    );
};

export default NotificationPanel;