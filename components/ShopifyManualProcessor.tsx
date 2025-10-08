

import React, { useState, useMemo } from 'react';
import { Order, AppNotification, NotificationPriority } from '../types';
import SyncIcon from './icons/SyncIcon';
import { transformShopifyOrder } from '../services/firebaseService';
import CheckCircleIcon from './icons/CheckCircleIcon';
import PlusCircleIcon from './icons/PlusCircleIcon';

type ShopifyOrder = any;
type PageInfo = { next?: string, prev?: string };

interface ShopifyManualProcessorProps {
    allOrders: Order[];
    onImportMultipleOrders: (orders: Order[], source: 'manual') => Promise<void>;
    addToast: (toastData: Omit<AppNotification, 'id' | 'createdAt' | 'isRead' | 'isTaskCompleted'>) => void;
}

const getShopifyCustomerName = (order: ShopifyOrder): string => {
    const customerFullName = (order.customer ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() : null);
    return customerFullName || 
           order.shipping_address?.name || 
           order.billing_address?.name ||
           order.email ||
           'Cliente Anónimo';
};

const ShopifyManualProcessor: React.FC<ShopifyManualProcessorProps> = ({ allOrders, onImportMultipleOrders, addToast }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [consultedOrders, setConsultedOrders] = useState<ShopifyOrder[] | null>(null);
    const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
    const [newlyImportedIds, setNewlyImportedIds] = useState<Set<string>>(new Set());
    
    const existingShopifyIds = useMemo(() => new Set(allOrders.filter(o => o.id.startsWith('shopify-')).map(o => o.id)), [allOrders]);

    const handleConsultAndImport = async (pageInfoToken: string | null = null) => {
        setIsProcessing(true);
        if (!pageInfoToken) {
            setConsultedOrders(null);
            setPageInfo(null);
            setNewlyImportedIds(new Set());
        }

        try {
            // Using includeCustomers=true to get enriched customer data from the backend
            const params = new URLSearchParams({ limit: '20', includeCustomers: 'true' });
            if (pageInfoToken) {
                params.set('page_info', pageInfoToken);
            }

            const response = await fetch(`/api/shopify/orders?${params.toString()}`);
            const result = await response.json();
            
            if (!response.ok || !result.ok) {
                let errorMessage = result.code || 'Error de red al consultar los pedidos.';
                if (result.hint) errorMessage += ` ${result.hint}`;
                throw new Error(errorMessage);
            }

            const shopifyOrders = result.data?.orders;
            if (!shopifyOrders || !Array.isArray(shopifyOrders)) {
                throw new Error("La respuesta del servidor no tiene el formato esperado.");
            }
            
            setConsultedOrders(shopifyOrders);
            setPageInfo(result.data?.pageInfo || null);
            
            // --- Auto-import logic ---
            const newShopifyOrders = shopifyOrders.filter(so => !existingShopifyIds.has(`shopify-${so.id}`));
            const skippedOrders: ShopifyOrder[] = [];
            
            const importableOrders = newShopifyOrders
                .map(so => {
                    const transformed = transformShopifyOrder(so);
                    if (!transformed) skippedOrders.push(so);
                    return transformed;
                })
                .filter((order): order is Order => order !== null);
            
            await onImportMultipleOrders(importableOrders, 'manual');
            
            if (importableOrders.length > 0) {
                 setNewlyImportedIds(prev => {
                    const newSet = new Set(prev);
                    importableOrders.forEach(o => newSet.add(o.id));
                    return newSet;
                });
            }

            if (skippedOrders.length > 0) {
                addToast({ 
                    title: 'Aviso de Importación', 
                    message: `${skippedOrders.length} pedido(s) fueron omitidos por datos incompletos (ej. falta de dirección).`, 
                    type: 'info', 
                    priority: NotificationPriority.Low 
                });
            }

        } catch (e) {
            const message = e instanceof Error ? e.message : 'Ocurrió un error desconocido.';
            addToast({ title: 'Error de Consulta', message, type: 'error', priority: NotificationPriority.High });
            setConsultedOrders([]); // Clear results on error
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold text-brand-darkgreen mb-2">Sincronización Manual</h2>
            <p className="text-gray-600 mb-4">
                Consulta los pedidos de tu tienda para importar automáticamente los que no estén en el sistema.
            </p>
            <button
                onClick={() => handleConsultAndImport()}
                disabled={isProcessing}
                className="w-full mt-2 bg-brand-lightgreen text-white font-bold py-3 px-4 rounded-md hover:bg-opacity-90 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
                {isProcessing && !consultedOrders ? <><SyncIcon className="w-5 h-5 animate-spin" />Consultando...</> : <><SyncIcon className="w-5 h-5" />Consultar e Importar Nuevos Pedidos</>}
            </button>
            
            {consultedOrders && (
                <div className="mt-6">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-lg">Resultados de la consulta:</h3>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => pageInfo?.prev && handleConsultAndImport(pageInfo.prev)}
                                disabled={!pageInfo?.prev || isProcessing}
                                className="bg-gray-200 text-gray-700 font-bold text-xs py-1 px-3 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                                Anterior
                            </button>
                            <button 
                                onClick={() => pageInfo?.next && handleConsultAndImport(pageInfo.next)}
                                disabled={!pageInfo?.next || isProcessing}
                                className="bg-gray-200 text-gray-700 font-bold text-xs py-1 px-3 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                    <div className="border rounded-lg max-h-96 overflow-y-auto">
                        <table className="min-w-full bg-white text-sm">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    {['Pedido', 'Cliente', 'Fecha', 'Total', 'Estado Shopify', 'Estado Sistema'].map(h => 
                                        <th key={h} className="text-left font-semibold text-gray-600 p-3">{h}</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {consultedOrders.length > 0 ? (
                                    consultedOrders.map(order => {
                                        const internalId = `shopify-${order.id}`;
                                        const isAlreadyInSystem = existingShopifyIds.has(internalId);
                                        const wasJustImported = newlyImportedIds.has(internalId);
                                        return (
                                            <tr key={order.id} className="hover:bg-gray-50">
                                                <td className="p-3 font-medium text-brand-green">{order.name}</td>
                                                <td className="p-3">{getShopifyCustomerName(order)}</td>
                                                <td className="p-3">{new Date(order.created_at).toLocaleDateString()}</td>
                                                <td className="p-3 font-semibold">{parseFloat(order.total_price).toLocaleString('es-CO', { style: 'currency', currency: order.currency })}</td>
                                                <td className="p-3">{String(order.financial_status ?? "").toLowerCase()}</td>
                                                <td className="p-3">
                                                    {isAlreadyInSystem ? (
                                                        <span className="flex items-center gap-1 text-green-600 font-semibold text-xs">
                                                            <CheckCircleIcon className="w-4 h-4"/> Ya en el sistema
                                                        </span>
                                                    ) : wasJustImported ? (
                                                        <span className="flex items-center gap-1 text-blue-600 font-semibold text-xs">
                                                            <PlusCircleIcon className="w-4 h-4"/> Importado ahora
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-gray-500">No Importado</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="text-center p-6 text-gray-500">
                                            No se encontraron pedidos en esta página.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShopifyManualProcessor;