
import React, { useState, useEffect } from 'react';
import { User, UserRoleType, Zone, CourierName } from '../types';
import { ZONES, COURIERS } from '../constants';
import XMarkIcon from './icons/XMarkIcon';
import KeyIcon from './icons/KeyIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';

interface EditUserModalProps {
    user: User;
    onClose: () => void;
    onSave: (userId: string, userData: Partial<Omit<User, 'id' | 'email'>>) => Promise<void>;
    onSendPasswordReset: (email: string) => Promise<void>;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose, onSave, onSendPasswordReset }) => {
    const [name, setName] = useState(user.name);
    const [username, setUsername] = useState(user.username);
    const [role, setRole] = useState<UserRoleType>(user.role);
    const [selectedZones, setSelectedZones] = useState<Set<Zone>>(new Set(user.zones || []));
    const [courierName, setCourierName] = useState<CourierName | ''>(user.courierName || '');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setName(user.name);
        setUsername(user.username);
        setRole(user.role);
        setSelectedZones(new Set(user.zones || []));
        setCourierName(user.courierName || '');
    }, [user]);

    const handleZoneChange = (zone: Zone) => {
        setSelectedZones(prev => {
            const newSet = new Set(prev);
            if (newSet.has(zone)) newSet.delete(zone);
            else newSet.add(zone);
            return newSet;
        });
    };

    const handleSave = async () => {
        setIsLoading(true);
        const userData: Partial<Omit<User, 'id' | 'email'>> = { name, username, role };
        if (role === 'Logística') {
            userData.zones = Array.from(selectedZones);
            userData.courierName = undefined;
        } else if (role === 'Domiciliario') {
            userData.courierName = courierName as CourierName;
            userData.zones = undefined;
        } else {
            userData.zones = undefined;
            userData.courierName = undefined;
        }
        await onSave(user.id, userData);
        setIsLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold text-brand-darkgreen">Editar Usuario: {user.name}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 p-2 rounded-full"><XMarkIcon className="w-6 h-6" /></button>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nombre</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nombre de Usuario</label>
                            <input type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase())} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Correo (no editable)</label>
                            <input type="email" value={user.email} disabled className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm text-gray-500" />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700">Rol</label>
                             <select value={role} onChange={e => setRole(e.target.value as UserRoleType)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm">
                                <option value="Logística">Logística</option>
                                <option value="Superadmin">Superadmin</option>
                                <option value="Domiciliario">Domiciliario</option>
                            </select>
                        </div>
                    </div>
                     {role === 'Logística' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Zonas Asignadas</label>
                            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-gray-50 rounded-md border">
                                {ZONES.map(zone => (
                                    <label key={zone} className="flex items-center space-x-2">
                                        <input type="checkbox" checked={selectedZones.has(zone)} onChange={() => handleZoneChange(zone)} className="h-4 w-4 text-brand-green focus:ring-brand-green border-gray-300 rounded" />
                                        <span className="text-sm text-gray-600">{zone}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                    {role === 'Domiciliario' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Asignar a Domiciliario</label>
                            <select value={courierName} onChange={e => setCourierName(e.target.value as CourierName | '')} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" required>
                                <option value="" disabled>Seleccionar...</option>
                                {COURIERS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    )}
                </div>
                 <div className="p-4 bg-gray-50 border-t flex justify-between items-center">
                    <button onClick={() => onSendPasswordReset(user.email)} className="flex items-center gap-2 text-sm font-semibold py-2 px-3 rounded-md text-gray-600 bg-gray-200 hover:bg-gray-300 transition-colors">
                        <KeyIcon className="w-5 h-5"/> Enviar reseteo de contraseña
                    </button>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="font-semibold py-2 px-4 rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors">Cancelar</button>
                        <button onClick={handleSave} disabled={isLoading} className="flex items-center gap-2 font-semibold py-2 px-4 rounded-md text-white bg-brand-green hover:bg-opacity-90 transition-colors disabled:bg-gray-400">
                            <CheckCircleIcon className="w-5 h-5" />
                            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditUserModal;
