

import React from 'react';
import ClipboardListIcon from './icons/ClipboardListIcon';
import ChartBarIcon from './icons/ChartBarIcon';
import WalletIcon from './icons/WalletIcon';
import XMarkIcon from './icons/XMarkIcon';
import UserGroupIcon from './icons/UserGroupIcon';
import LinkIcon from './icons/LinkIcon';
import { User } from '../types';
import LaboresLacteasLogo from './icons/LaboresLacteasLogo';

type CentralView = 'pedidos' | 'dashboard' | 'liquidaciones' | 'gestion-usuarios' | 'integrations';

interface SidebarProps {
    centralView: CentralView;
    onSwitchCentralView: (view: CentralView) => void;
    isOpen: boolean;
    onClose: () => void;
    currentUser: User;
}

const Sidebar: React.FC<SidebarProps> = ({ centralView, onSwitchCentralView, isOpen, onClose, currentUser }) => {

    const NavButton: React.FC<{
        label: string;
        isActive: boolean;
        onClick: () => void;
        icon: React.ReactNode;
    }> = ({ label, isActive, onClick, icon }) => (
        <button
            onClick={() => {
                onClick();
                onClose();
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left font-semibold transition-colors text-base ${
                isActive ? 'bg-brand-green text-white shadow-md' : 'text-gray-300 hover:bg-brand-green/80 hover:text-white'
            }`}
        >
            {icon}
            {label}
        </button>
    );

    const canView = (view: CentralView): boolean => {
        if (currentUser.role === 'Superadmin') return true;
        if (currentUser.role === 'Logística') {
            return ['pedidos', 'dashboard', 'liquidaciones'].includes(view);
        }
        return false;
    };

    return (
        <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-brand-darkgreen text-white p-4 flex flex-col shadow-2xl transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:shadow-none ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="flex justify-between items-center py-4 mb-6">
                <LaboresLacteasLogo className="w-auto h-14 text-white" />
                <button 
                    onClick={onClose} 
                    className="lg:hidden text-gray-300 hover:text-white p-1 rounded-full"
                    aria-label="Cerrar menú"
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>
            </div>
            <nav className="flex flex-col gap-3 flex-1">
                 {canView('pedidos') && (
                    <NavButton
                        label="Pedidos"
                        icon={<ClipboardListIcon className="w-6 h-6" />}
                        isActive={centralView === 'pedidos'}
                        onClick={() => onSwitchCentralView('pedidos')}
                    />
                 )}
                 {canView('dashboard') && (
                    <NavButton
                        label="Métricas"
                        icon={<ChartBarIcon className="w-6 h-6" />}
                        isActive={centralView === 'dashboard'}
                        onClick={() => onSwitchCentralView('dashboard')}
                    />
                 )}
                {canView('liquidaciones') && (
                    <NavButton
                        label="Liquidaciones"
                        icon={<WalletIcon className="w-6 h-6" />}
                        isActive={centralView === 'liquidaciones'}
                        onClick={() => onSwitchCentralView('liquidaciones')}
                    />
                )}
                {canView('gestion-usuarios') && (
                    <NavButton
                        label="Gestión de Usuarios"
                        icon={<UserGroupIcon className="w-6 h-6" />}
                        isActive={centralView === 'gestion-usuarios'}
                        onClick={() => onSwitchCentralView('gestion-usuarios')}
                    />
                )}

                 {canView('integrations') && (
                    <>
                        <div className="my-4 border-t border-white/20"></div>
                        <NavButton
                            label="Integraciones"
                            icon={<LinkIcon className="w-6 h-6" />}
                            isActive={centralView === 'integrations'}
                            onClick={() => onSwitchCentralView('integrations')}
                        />
                    </>
                 )}
            </nav>
        </aside>
    );
};

export default Sidebar;