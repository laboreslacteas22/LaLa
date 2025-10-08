
import React, { useState } from 'react';
import { User, UserRoleType, Zone, CourierName, AppNotification, NotificationPriority } from '../types';
import { ZONES, COURIERS } from '../constants';
import { sendPasswordReset } from '../services/firebaseService';
import UserGroupIcon from './icons/UserGroupIcon';
import PlusCircleIcon from './icons/PlusCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import PencilIcon from './icons/PencilIcon';
import EditUserModal from './EditUserModal';

interface UserManagementProps {
    users: User[];
    onCreateUser: (userData: { email: string; password: string; name: string; username: string; role: UserRoleType; zones?: Zone[]; courierName?: CourierName }) => Promise<void>;
    onUpdateUser: (userId: string, userData: Partial<Omit<User, 'id' | 'email'>>) => Promise<void>;
    onDeleteUser: (userId: string) => void;
    addToast: (toastData: Omit<AppNotification, 'id' | 'createdAt' | 'isRead' | 'isTaskCompleted'>) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, onCreateUser, onUpdateUser, onDeleteUser, addToast }) => {
    const [newName, setNewName] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<UserRoleType>('Logística');
    const [selectedZones, setSelectedZones] = useState<Set<Zone>>(new Set());
    const [newCourierName, setNewCourierName] = useState<CourierName | ''>('');
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const handleZoneChange = (zone: Zone) => {
        setSelectedZones(prev => {
            const newSet = new Set(prev);
            if (newSet.has(zone)) {
                newSet.delete(zone);
            } else {
                newSet.add(zone);
            }
            return newSet;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || !newEmail.trim() || !newPassword.trim() || !newUsername.trim()) {
            addToast({ title: 'Error', message: 'Todos los campos son obligatorios.', type: 'error', priority: NotificationPriority.High });
            return;
        }
        if (newRole === 'Logística' && selectedZones.size === 0) {
            addToast({ title: 'Error', message: 'Debe seleccionar al menos una zona para el rol de Logística.', type: 'error', priority: NotificationPriority.High });
            return;
        }
        if (newRole === 'Domiciliario' && !newCourierName) {
            addToast({ title: 'Error', message: 'Debe asignar un perfil de domiciliario.', type: 'error', priority: NotificationPriority.High });
            return;
        }

        const userData: { email: string; password: string; name: string; username: string; role: UserRoleType; zones?: Zone[]; courierName?: CourierName } = {
            name: newName.trim(),
            username: newUsername.trim().toLowerCase(),
            email: newEmail.trim(),
            password: newPassword,
            role: newRole,
        };
        
        if (newRole === 'Logística') {
            userData.zones = Array.from(selectedZones);
        } else if (newRole === 'Domiciliario') {
            userData.courierName = newCourierName as CourierName;
        }

        try {
            await onCreateUser(userData);
            // Reset form
            setNewName('');
            setNewUsername('');
            setNewEmail('');
            setNewPassword('');
            setNewRole('Logística');
            setSelectedZones(new Set());
            setNewCourierName('');
        } catch (error) {
            // Error is already shown by toast in App.tsx
        }
    };

    const handleDelete = (user: User) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar al usuario "${user.name}"? Esta acción no se puede deshacer y solo elimina el registro, no la cuenta de acceso.`)) {
            onDeleteUser(user.id);
        }
    };

    const handleUpdate = async (userId: string, userData: Partial<Omit<User, 'id' | 'email'>>) => {
        try {
            await onUpdateUser(userId, userData);
            setEditingUser(null);
        } catch (error) {
            // error handled in App.tsx
        }
    };

    const handleSendPasswordReset = async (email: string) => {
        try {
            await sendPasswordReset(email);
            addToast({ title: 'Correo Enviado', message: `Se ha enviado un enlace para restablecer la contraseña a ${email}.`, type: 'success', priority: NotificationPriority.Low });
        } catch (error) {
            addToast({ title: 'Error', message: 'No se pudo enviar el correo de recuperación.', type: 'error', priority: NotificationPriority.High });
        }
    }

    return (
        <>
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold text-brand-darkgreen mb-4 border-b pb-2 flex items-center gap-2">
                    <PlusCircleIcon className="w-6 h-6" />
                    Crear Nuevo Usuario
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="userName" className="block text-sm font-medium text-gray-700">Nombre del Usuario</label>
                            <input
                                type="text"
                                id="userName"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm"
                                placeholder="Ej: Juan Pérez"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="userUsername" className="block text-sm font-medium text-gray-700">Nombre de Usuario (para sesión)</label>
                            <input
                                type="text"
                                id="userUsername"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value.toLowerCase())}
                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm"
                                placeholder="ej: juanperez"
                                required
                                autoCapitalize="none"
                            />
                        </div>
                         <div>
                            <label htmlFor="userRole" className="block text-sm font-medium text-gray-700">Rol</label>
                            <select
                                id="userRole"
                                value={newRole}
                                onChange={(e) => setNewRole(e.target.value as UserRoleType)}
                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm"
                            >
                                <option value="Logística">Logística</option>
                                <option value="Superadmin">Superadmin</option>
                                <option value="Domiciliario">Domiciliario</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="userEmail" className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
                            <input
                                type="email"
                                id="userEmail"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm"
                                placeholder="ejemplo@correo.com"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="userPassword" className="block text-sm font-medium text-gray-700">Contraseña</label>
                            <input
                                type="password"
                                id="userPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm"
                                placeholder="Mínimo 6 caracteres"
                                required
                            />
                        </div>
                    </div>
                    
                    {newRole === 'Logística' && (
                        <div className="pt-2">
                            <label className="block text-sm font-medium text-gray-700">Zonas Asignadas</label>
                            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-gray-50 rounded-md border">
                                {ZONES.map(zone => (
                                    <label key={zone} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedZones.has(zone)}
                                            onChange={() => handleZoneChange(zone)}
                                            className="h-4 w-4 text-brand-green focus:ring-brand-green border-gray-300 rounded"
                                        />
                                        <span className="text-sm text-gray-600">{zone}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {newRole === 'Domiciliario' && (
                         <div className="pt-2">
                            <label htmlFor="courierName" className="block text-sm font-medium text-gray-700">Asignar a Domiciliario</label>
                            <select
                                id="courierName"
                                value={newCourierName}
                                onChange={(e) => setNewCourierName(e.target.value as CourierName | '')}
                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm"
                                required
                            >
                                <option value="" disabled>Seleccionar...</option>
                                {COURIERS.map(courier => (
                                    <option key={courier} value={courier}>{courier}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    
                    <div className="text-right pt-2">
                        <button type="submit" className="inline-flex items-center justify-center gap-2 bg-brand-green text-white font-bold py-2 px-4 rounded-md hover:bg-opacity-90 transition-colors">
                            <PlusCircleIcon className="w-5 h-5" />
                            Crear Usuario
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold text-brand-darkgreen mb-4 border-b pb-2 flex items-center gap-2">
                    <UserGroupIcon className="w-6 h-6" />
                    Usuarios Existentes
                </h2>
                <div className="space-y-2">
                    {users.length > 0 ? (
                        users.map(user => (
                            <div key={user.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100">
                                <div>
                                    <p className="font-semibold text-gray-800">{user.name} <span className="text-xs text-gray-400">({user.username})</span></p>
                                    <p className="text-sm text-gray-500">
                                        Rol: <span className="font-medium">{user.role}</span>
                                        {user.role === 'Logística' && ` | Zonas: ${user.zones?.join(', ') || 'Ninguna'}`}
                                        {user.role === 'Domiciliario' && ` | Repartidor: ${user.courierName || 'No asignado'}`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setEditingUser(user)}
                                        className="p-2 rounded-full text-gray-500 hover:bg-gray-200"
                                        title={`Editar a ${user.name}`}
                                    >
                                        <PencilIcon className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(user)}
                                        className="p-2 rounded-full text-red-500 hover:bg-red-100"
                                        title={`Eliminar a ${user.name}`}
                                    >
                                        <XCircleIcon className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500 text-center py-4">No hay usuarios creados.</p>
                    )}
                </div>
            </div>
        </div>
        {editingUser && (
            <EditUserModal 
                user={editingUser}
                onClose={() => setEditingUser(null)}
                onSave={handleUpdate}
                onSendPasswordReset={handleSendPasswordReset}
            />
        )}
        </>
    );
};

export default UserManagement;
