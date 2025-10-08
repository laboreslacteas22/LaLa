
import React, { useState } from 'react';
import { signInUser, sendPasswordReset } from '../services/firebaseService';
import { AuthErrorCodes } from 'firebase/auth';
import { AppNotification, NotificationPriority } from '../types';
import LoginIcon from './icons/LoginIcon';
import LaboresLacteasLogo from './icons/LaboresLacteasLogo';
import EyeIcon from './icons/EyeIcon';
import EyeSlashIcon from './icons/EyeSlashIcon';

interface LoginProps {
    addToast: (toastData: Omit<AppNotification, 'id' | 'createdAt' | 'isRead' | 'isTaskCompleted'>) => void;
}


const Login: React.FC<LoginProps> = ({ addToast }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await signInUser(email.trim(), password);
            // On success, the onAuthStateChanged listener in App.tsx will handle the redirect.
        } catch (err: any) {
            if (err instanceof Error) {
                 setError(err.message);
            } else if (err.code) { // Firebase Auth specific errors
                switch (err.code) {
                    case AuthErrorCodes.INVALID_PASSWORD:
                    case AuthErrorCodes.INVALID_LOGIN_CREDENTIALS:
                    case 'auth/user-not-found':
                    case 'auth/invalid-credential':
                        setError('El correo o la contraseña son incorrectos.');
                        break;
                    case AuthErrorCodes.USER_DISABLED:
                        setError('Esta cuenta de usuario ha sido deshabilitada.');
                        break;
                    default:
                        setError('Ocurrió un error inesperado. Inténtalo de nuevo.');
                        console.error("Login error:", err);
                }
            } else {
                 setError('Ocurrió un error inesperado.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!email) {
            setError('Por favor, ingresa tu correo electrónico.');
            return;
        }
        setIsLoading(true);
        try {
            await sendPasswordReset(email.trim());
            addToast({
                title: 'Correo Enviado',
                message: 'Revisa tu bandeja de entrada para restablecer tu contraseña.',
                type: 'success',
                priority: NotificationPriority.Low
            });
            setIsResettingPassword(false);
        } catch (error) {
            setError('No se pudo enviar el correo. Verifica que la dirección sea correcta.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isResettingPassword) {
        return (
             <div className="flex items-center justify-center min-h-screen bg-brand-bg font-sans">
                <div className="p-8 bg-white rounded-lg shadow-xl w-full max-w-sm text-center animate-fade-in-down">
                     <div className="flex justify-center mb-6">
                        <LaboresLacteasLogo className="w-auto h-24 text-brand-darkgreen" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-700 mb-2">Recuperar Contraseña</h1>
                    <p className="text-sm text-gray-500 mb-6">Ingresa tu correo para enviarte un enlace de recuperación.</p>
                     <form onSubmit={handlePasswordReset} className="space-y-4">
                        <div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Correo electrónico"
                                required
                                className="w-full p-3 border rounded-md bg-white focus:ring-2 focus:ring-brand-lightgreen focus:border-transparent text-md"
                                autoCapitalize="none"
                            />
                        </div>
                        {error && <p className="text-red-500 text-sm font-semibold">{error}</p>}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-brand-green text-white font-bold py-3 px-4 rounded-md hover:bg-opacity-90 transition-colors disabled:bg-gray-400"
                        >
                            {isLoading ? 'Enviando...' : 'Enviar Enlace'}
                        </button>
                         <button type="button" onClick={() => setIsResettingPassword(false)} className="text-sm text-gray-500 hover:underline mt-2">
                            Volver a inicio de sesión
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-brand-bg font-sans">
            <div className="p-8 bg-white rounded-lg shadow-xl w-full max-w-sm text-center animate-fade-in-down">
                <div className="flex justify-center mb-6">
                    <LaboresLacteasLogo className="w-auto h-24 text-brand-darkgreen" />
                </div>
                <h1 className="text-xl font-bold text-gray-700 mb-2">Central de Logística</h1>
                <p className="text-sm text-gray-500 mb-6">Inicia sesión para continuar</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Correo electrónico"
                            required
                            className="w-full p-3 border rounded-md bg-white focus:ring-2 focus:ring-brand-lightgreen focus:border-transparent text-md"
                            autoCapitalize="none"
                        />
                    </div>
                    <div className="relative">
                        <input
                            type={isPasswordVisible ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Contraseña"
                            required
                            className="w-full p-3 border rounded-md bg-white focus:ring-2 focus:ring-brand-lightgreen focus:border-transparent text-md pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setIsPasswordVisible(prev => !prev)}
                            className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-brand-green"
                            aria-label={isPasswordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                            {isPasswordVisible ? <EyeSlashIcon className="h-6 w-6" /> : <EyeIcon className="h-6 w-6" />}
                        </button>
                    </div>
                    {error && <p className="text-red-500 text-sm font-semibold">{error}</p>}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-brand-green text-white font-bold py-3 px-4 rounded-md hover:bg-opacity-90 transition-colors disabled:bg-gray-400"
                    >
                        {isLoading ? (
                            'Ingresando...'
                        ) : (
                            <>
                                <LoginIcon className="w-6 h-6" />
                                Ingresar
                            </>
                        )}
                    </button>
                </form>
                 <div className="mt-4">
                    <button onClick={() => setIsResettingPassword(true)} className="text-sm text-brand-green hover:underline">
                        ¿Olvidaste tu contraseña?
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
