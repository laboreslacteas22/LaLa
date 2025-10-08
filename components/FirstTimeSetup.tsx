
import React, { useState } from 'react';
import { UserRoleType, Zone, CourierName } from '../types';
import LaboresLacteasLogo from './icons/LaboresLacteasLogo';
import PlusCircleIcon from './icons/PlusCircleIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';

interface FirstTimeSetupProps {
    onCreateAdmin: (userData: { email: string; password: string; name: string; username: string; role: 'Superadmin' }) => Promise<void>;
}

const FirstTimeSetup: React.FC<FirstTimeSetupProps> = ({ onCreateAdmin }) => {
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCreated, setIsCreated] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        setIsLoading(true);
        try {
            await onCreateAdmin({
                name,
                username: username.toLowerCase(),
                email,
                password,
                role: 'Superadmin'
            });
            setIsCreated(true);
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Ocurrió un error inesperado al crear la cuenta.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (isCreated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-brand-bg font-sans">
                <div className="p-8 bg-white rounded-lg shadow-xl w-full max-w-sm text-center animate-fade-in-down">
                    <div className="flex justify-center mb-6 text-green-500">
                        <CheckCircleIcon className="w-24 h-24" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-700 mb-2">¡Cuenta Creada!</h1>
                    <p className="text-sm text-gray-500 mb-6">
                        La cuenta de superadministrador ha sido configurada exitosamente.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full bg-brand-green text-white font-bold py-3 px-4 rounded-md hover:bg-opacity-90 transition-colors"
                    >
                        Ir a Iniciar Sesión
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-brand-bg font-sans">
            <div className="p-8 bg-white rounded-lg shadow-xl w-full max-w-sm text-center animate-fade-in-down">
                <div className="flex justify-center mb-6">
                    <LaboresLacteasLogo className="w-auto h-24 text-brand-darkgreen" />
                </div>
                <h1 className="text-xl font-bold text-gray-700 mb-2">Configuración Inicial</h1>
                <p className="text-sm text-gray-500 mb-6">Crea la primera cuenta de Superadministrador para empezar.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo" required className="w-full p-3 border rounded-md bg-white focus:ring-2 focus:ring-brand-lightgreen focus:border-transparent text-md" />
                    </div>
                    <div>
                        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Nombre de usuario (para sesión)" required className="w-full p-3 border rounded-md bg-white focus:ring-2 focus:ring-brand-lightgreen focus:border-transparent text-md" autoCapitalize="none" />
                    </div>
                    <div>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo electrónico" required className="w-full p-3 border rounded-md bg-white focus:ring-2 focus:ring-brand-lightgreen focus:border-transparent text-md" />
                    </div>
                    <div>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña (mín. 6 caracteres)" required className="w-full p-3 border rounded-md bg-white focus:ring-2 focus:ring-brand-lightgreen focus:border-transparent text-md" />
                    </div>
                    {error && <p className="text-red-500 text-sm font-semibold">{error}</p>}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-brand-green text-white font-bold py-3 px-4 rounded-md hover:bg-opacity-90 transition-colors disabled:bg-gray-400"
                    >
                        {isLoading ? (
                            'Creando cuenta...'
                        ) : (
                            <>
                                <PlusCircleIcon className="w-6 h-6" />
                                Crear Administrador
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default FirstTimeSetup;
