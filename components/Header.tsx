
import React from 'react';
import Bars3Icon from './icons/Bars3Icon';
import NotificationBell from './NotificationBell';
import { User } from '../types';
import LogoutIcon from './icons/LogoutIcon';
import KeyIcon from './icons/KeyIcon';

interface HeaderProps {
    onMenuClick: () => void;
    unreadNotificationCount: number;
    onNotificationClick: () => void;
    currentUser: User;
    onLogout: () => void;
    onChangePassword: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, unreadNotificationCount, onNotificationClick, currentUser, onLogout, onChangePassword }) => {
    
    return (
        <header className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-between gap-4 sticky top-0 z-10 lg:static">
             <div className="flex items-center gap-4">
                <button 
                    onClick={onMenuClick} 
                    className="text-gray-600 hover:text-brand-green lg:hidden"
                    aria-label="Abrir menú"
                >
                    <Bars3Icon className="w-6 h-6" />
                </button>
                <h1 className="text-2xl font-bold text-brand-darkgreen tracking-wide">
                    Labores Lácteas - Central de Logística
                </h1>
            </div>
            <div className="flex items-center gap-4">
                <div className="hidden lg:flex items-center gap-2 bg-gray-100 p-1 pr-3 rounded-full">
                    <div className="w-8 h-8 rounded-full bg-brand-green flex items-center justify-center text-white font-bold text-sm">
                        {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-gray-700">
                        Hola, {currentUser.name}
                    </span>
                    <span className="text-gray-300">|</span>
                     <button 
                        onClick={onChangePassword}
                        className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-brand-green transition-colors"
                        title="Cambiar contraseña"
                    >
                        <KeyIcon className="w-4 h-4" />
                    </button>
                     <button 
                        onClick={onLogout} 
                        className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-red-600 transition-colors"
                        title="Cerrar sesión"
                    >
                        <LogoutIcon className="w-4 h-4" />
                    </button>
                </div>
                <div className="relative">
                    <NotificationBell 
                        unreadCount={unreadNotificationCount}
                        onClick={onNotificationClick}
                    />
                </div>
            </div>
        </header>
    );
};

export default Header;
