

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Order, AppNotification, NotificationPriority } from '../types';
import ShopifyManualProcessor from './ShopifyManualProcessor';
import LinkIcon from './icons/LinkIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import SyncIcon from './icons/SyncIcon';
import { transformShopifyOrder } from '../services/firebaseService';

interface IntegrationsPageProps {
    allOrders: Order[];
    onImportMultipleOrders: (orders: Order[], source: 'auto' | 'manual') => Promise<void>;
    addToast: (toastData: Omit<AppNotification, 'id' | 'createdAt' | 'isRead' | 'isTaskCompleted'>) => void;
}

const IntegrationsPage: React.FC<IntegrationsPageProps> = ({ allOrders, onImportMultipleOrders, addToast }) => {
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [connectionError, setConnectionError] = useState<string | null>(null);
    
    // State for automatic sync
    const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(true);
    const [lastSync, setLastSync] = useState<string>('Nunca');
    const [isSyncing, setIsSyncing] = useState(false);
    const isSyncingRef = useRef(false);
    const existingShopifyIds = useMemo(() => new Set(allOrders.filter(o => o.id.startsWith('shopify-')).map(o => o.id)), [allOrders]);

    const testShopifyConnection = useCallback(async (silent = false) => {
        setConnectionStatus('testing');
        setConnectionError(null);
        try {
            const response = await fetch('/api/shopify/orders?limit=1');
            const data = await response.json();

            if (response.ok && data.ok) {
                setConnectionStatus('success');
                if (!silent) {
                    addToast({
                        title: 'Conexión Exitosa',
                        message: 'Conectado a la tienda Shopify configurada.',
                        type: 'success',
                        priority: NotificationPriority.Low,
                    });
                }
            } else {
                setConnectionStatus('error');
                let errorMessage = `Error: ${data.code || `HTTP ${response.status}`}`;
                if (data.message) {
                    errorMessage = data.message;
                } else if (data.hint) {
                    errorMessage = `${data.code}: ${data.hint}`;
                } else if (data.missing) {
                    errorMessage = `Configuración incompleta. Faltan variables de entorno: ${data.missing.join(', ')}.`;
                }
                setConnectionError(errorMessage);
            }
        } catch (e) {
            setConnectionStatus('error');
            const message = e instanceof Error ? e.message : 'Error de comunicación con el servidor.';
            setConnectionError(message);
        }
    }, [addToast]);

    useEffect(() => {
        testShopifyConnection(true);
    }, [testShopifyConnection]);

    const syncOrders = useCallback(async () => {
        if (isSyncingRef.current) {
            console.warn("Sync already in progress. Skipping.");
            return;
        }
        
        isSyncingRef.current = true;
        setIsSyncing(true);

        try {
            const response = await fetch('/api/shopify/orders');
            const result = await response.json();

            if (!response.ok || !result.ok) {
                // This will be caught by the catch block below and shown as a toast.
                throw new Error(result.message || result.code || 'Error de red al sincronizar.');
            }
            
            const shopifyOrders = result.data?.orders;
            if (!shopifyOrders || !Array.isArray(shopifyOrders)) return;

            const newShopifyOrders = shopifyOrders.filter(so => !existingShopifyIds.has(`shopify-${so.id}`));

            if (newShopifyOrders.length > 0) {
                const importableOrders = newShopifyOrders
                    .map(so => transformShopifyOrder(so))
                    .filter((order): order is Order => order !== null);
                
                if (importableOrders.length > 0) {
                    await onImportMultipleOrders(importableOrders, 'auto');
                }
            }
            setLastSync(new Date().toLocaleTimeString('es-CO'));
        } catch (error) {
            console.error("Auto-sync failed:", error);
            // Specifically check for rate limit to avoid spamming user with errors for a temporary issue.
            if (error instanceof Error && error.message.includes('RATE_LIMITED')) {
                 console.warn("Shopify rate limit exceeded. Sync will retry on the next interval.");
            } else {
                addToast({ 
                    title: 'Error de Sincronización', 
                    message: error instanceof Error ? error.message : 'No se pudo sincronizar con Shopify.', 
                    type: 'error', 
                    priority: NotificationPriority.High 
                });
            }
        } finally {
            isSyncingRef.current = false;
            setIsSyncing(false);
        }
    }, [existingShopifyIds, onImportMultipleOrders, addToast]);

    useEffect(() => {
        if (isAutoSyncEnabled && connectionStatus === 'success') {
            syncOrders(); // Run immediately on enable/connect
            const intervalId = window.setInterval(syncOrders, 60000); // every 1 minute

            return () => {
                clearInterval(intervalId);
            };
        }
    }, [isAutoSyncEnabled, connectionStatus, syncOrders]);
    
    const ConnectionStatusIndicator = () => {
        switch(connectionStatus) {
            case 'testing':
                return <div className="flex items-center gap-2 text-sm text-yellow-600"><SyncIcon className="w-4 h-4 animate-spin" /> Probando...</div>;
            case 'success':
                return <div className="flex items-center gap-2 text-sm text-green-600 font-semibold"><CheckCircleIcon className="w-5 h-5" /> Conexión Exitosa</div>;
            case 'error':
                 return <div className="flex items-center gap-2 text-sm text-red-600 font-semibold"><XCircleIcon className="w-5 h-5" /> Error de Conexión</div>;
            default:
                return <div className="text-sm text-gray-500">Estado: Inactivo</div>;
        }
    };
    
    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold text-brand-darkgreen mb-2 flex items-center gap-2">
                    <LinkIcon className="w-6 h-6"/>
                    Integración con Shopify
                </h2>
                <p className="text-gray-600 mb-4">
                    La aplicación se conecta a Shopify usando la configuración segura del servidor.
                </p>
                <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between gap-4">
                        <ConnectionStatusIndicator />
                        <button onClick={() => testShopifyConnection()} className="bg-blue-500 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-400" disabled={connectionStatus === 'testing'}>
                            {connectionStatus === 'testing' ? 'Probando...' : 'Probar Conexión'}
                        </button>
                    </div>
                     {connectionStatus === 'error' && connectionError && (
                        <div className="mt-2 p-3 bg-red-100 text-red-800 text-sm rounded-md border border-red-200 break-words">
                            <strong>Detalle del error:</strong> {connectionError}
                        </div>
                    )}
                </div>

                {connectionStatus === 'success' && (
                     <div className="mt-6 p-4 border-l-4 border-brand-green bg-green-50 rounded-md">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-green-800">Sincronización Automática</h3>
                                <p className="text-sm text-green-700 mt-1">
                                   La aplicación buscará nuevos pedidos cada minuto.
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <span className="text-xs text-gray-500">Última vez: {lastSync}</span>
                                    {isSyncing && <SyncIcon className="w-4 h-4 text-brand-green animate-spin inline-block ml-2" />}
                                </div>
                                <label htmlFor="autosync-toggle" className="flex items-center cursor-pointer">
                                    <div className="relative">
                                        <input type="checkbox" id="autosync-toggle" className="sr-only" checked={isAutoSyncEnabled} onChange={() => setIsAutoSyncEnabled(!isAutoSyncEnabled)} />
                                        <div className="block bg-gray-300 w-14 h-8 rounded-full"></div>
                                        <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform"></div>
                                    </div>
                                    <style>{`#autosync-toggle:checked ~ .dot { transform: translateX(100%); } #autosync-toggle:checked ~ .block { background-color: #7a8a4a; }`}</style>
                                </label>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {(connectionStatus === 'success') && (
                 <ShopifyManualProcessor
                    allOrders={allOrders}
                    onImportMultipleOrders={onImportMultipleOrders}
                    addToast={addToast}
                />
            )}
        </div>
    );
};

export default IntegrationsPage;