
import React, { useState, useEffect, useMemo } from 'react';
import SyncIcon from './icons/SyncIcon';

type ShopifyOrder = any;

const ShopifyWebhookTester: React.FC = () => {
    const [storeUrl, setStoreUrl] = useState('');
    const [apiToken, setApiToken] = useState('');
    const [saveCredentials, setSaveCredentials] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [consultedOrders, setConsultedOrders] = useState<ShopifyOrder[] | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('shopifyConnectorCredentials');
        if (saved) {
            const { storeUrl, apiToken } = JSON.parse(saved);
            setStoreUrl(storeUrl || '');
            setApiToken(apiToken || '');
        }
    }, []);

    const handleConsult = async () => {
        setIsProcessing(true);
        setError(null);
        setConsultedOrders(null);

        if (saveCredentials) {
            localStorage.setItem('shopifyConnectorCredentials', JSON.stringify({ storeUrl, apiToken }));
        } else {
            localStorage.removeItem('shopifyConnectorCredentials');
        }

        if (!storeUrl || !apiToken) {
            setError("La URL de la Tienda y el Token son obligatorios.");
            setIsProcessing(false);
            return;
        }

        try {
            const response = await fetch(`/shopify/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeUrl: storeUrl.replace(/^https?:\/\//, ''), apiToken }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.details || data?.error || `Error del Worker: ${response.statusText}.`);
            }
            
            const shopifyOrders = data.data?.orders;
            if (!shopifyOrders || !Array.isArray(shopifyOrders)) {
                throw new Error("La respuesta del worker no contiene un arreglo 'orders' válido.");
            }
            
            setConsultedOrders(shopifyOrders);

        } catch (e) {
            console.error(e);
            if (e instanceof Error) {
                setError(`${e.message}`);
            } else {
                setError('Ocurrió un error desconocido.');
            }
        } finally {
            setIsProcessing(false);
        }
    };
    
    const getOrderStatus = (order: ShopifyOrder): { text: string, color: string } => {
        if (order.cancelled_at) {
            return { text: 'Cancelado', color: 'bg-red-100 text-red-800' };
        }
        if (order.closed_at) {
            return { text: 'Archivado', color: 'bg-gray-100 text-gray-800' };
        }
        return { text: 'Abierto', color: 'bg-green-100 text-green-800' };
    };

    const summary = useMemo(() => {
        if (!consultedOrders) return null;
        const counts = { open: 0, closed: 0, cancelled: 0 };
        consultedOrders.forEach(order => {
            if (order.cancelled_at) counts.cancelled++;
            else if (order.closed_at) counts.closed++;
            else counts.open++;
        });
        return counts;
    }, [consultedOrders]);
    

    const renderResults = () => {
        if (!consultedOrders) return null;

        if (consultedOrders.length === 0) {
            return <div className="mt-6 p-4 bg-blue-100 text-blue-800 rounded-md">No se encontraron pedidos con los criterios actuales.</div>;
        }

        return (
            <div className="mt-8">
                <div className="p-4 bg-gray-50 rounded-lg mb-4 text-center font-semibold text-gray-700">
                    {summary && `Abiertos: ${summary.open} | Archivados: ${summary.closed} | Cancelados: ${summary.cancelled}`}
                </div>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full bg-white text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                {[
                                    'Pedido', 'Fecha', 'Estado', 'Cliente', 'Teléfono',
                                    'Dirección', 'Productos', 'Estado Pago', 'Total',
                                    'Envío', 'Fulfillment', 'Etiquetas', 'Notas', 'Motivo Cancelación'
                                ].map(h => <th key={h} className="text-left font-semibold text-gray-600 p-3 whitespace-nowrap">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {consultedOrders.map(order => {
                                const status = getOrderStatus(order);
                                const addr = order.shipping_address;
                                const customer = order.customer;
                                return (
                                <tr key={order.id} className="hover:bg-gray-50">
                                    <td className="p-3 font-medium text-brand-green whitespace-nowrap">
                                        <a href={`https://${storeUrl}/admin/orders/${order.id}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                            #{order.order_number}
                                        </a>
                                    </td>
                                    <td className="p-3 whitespace-nowrap">{new Date(order.created_at).toLocaleDateString()}</td>
                                    <td className="p-3 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>{status.text}</span></td>
                                    <td className="p-3 whitespace-nowrap">{customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : 'N/A'}</td>
                                    <td className="p-3 whitespace-nowrap">{addr?.phone || '—'}</td>
                                    <td className="p-3 min-w-[250px]">{addr ? `${addr.address1}, ${addr.city}, ${addr.province_code} ${addr.zip}` : '—'}</td>
                                    <td className="p-3 min-w-[250px]">{order.line_items.map((li: any) => `${li.quantity}x ${li.title}`).join('; ')}</td>
                                    <td className="p-3 whitespace-nowrap">{order.financial_status}</td>
                                    <td className="p-3 font-semibold whitespace-nowrap">{parseFloat(order.total_price).toLocaleString('es-CO', { style: 'currency', currency: order.currency })}</td>
                                    <td className="p-3 whitespace-nowrap">{order.shipping_lines?.[0]?.title || '—'}</td>
                                    <td className="p-3 whitespace-nowrap">{order.fulfillment_status || 'unfulfilled'}</td>
                                    <td className="p-3 whitespace-nowrap">{order.tags || '—'}</td>
                                    <td className="p-3 min-w-[200px] truncate" title={order.note}>{order.note || '—'}</td>
                                    <td className="p-3 min-w-[200px] truncate" title={order.cancel_reason}>{order.cancel_reason || '—'}</td>
                                </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-7xl mx-auto">
            <h2 className="text-xl font-bold text-brand-darkgreen mb-2">Conector Directo Shopify</h2>
            <p className="text-gray-600 mb-4">
                Consulta los últimos pedidos (abiertos, archivados y cancelados) directamente desde la API de Shopify.
            </p>
            
            <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                <div>
                    <label htmlFor="storeUrl" className="block text-sm font-medium text-gray-700">URL de la Tienda Shopify (.myshopify.com)</label>
                    <input
                        type="text"
                        id="storeUrl"
                        value={storeUrl}
                        onChange={(e) => setStoreUrl(e.target.value)}
                        placeholder="ejemplo.myshopify.com"
                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-green focus:border-brand-green"
                        disabled={isProcessing}
                    />
                </div>
                 <div>
                    <label htmlFor="apiToken" className="block text-sm font-medium text-gray-700">Token de Acceso de API Admin</label>
                    <input
                        type="password"
                        id="apiToken"
                        value={apiToken}
                        onChange={(e) => setApiToken(e.target.value)}
                        placeholder="shpat_••••••••••••••••••••••••••••••••"
                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-green focus:border-brand-green"
                        disabled={isProcessing}
                    />
                </div>
                <div className="flex items-center">
                    <input
                        id="save-credentials"
                        type="checkbox"
                        checked={saveCredentials}
                        onChange={(e) => setSaveCredentials(e.target.checked)}
                        className="h-4 w-4 text-brand-green focus:ring-brand-green border-gray-300 rounded"
                    />
                    <label htmlFor="save-credentials" className="ml-2 block text-sm text-gray-900">
                        Guardar credenciales
                    </label>
                </div>
            </div>

            <button
                onClick={handleConsult}
                disabled={isProcessing}
                className="w-full mt-6 bg-brand-green text-white font-bold py-3 px-4 rounded-md hover:bg-opacity-90 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
                {isProcessing ? (
                    <>
                        <SyncIcon className="w-5 h-5 animate-spin" />
                        Consultando...
                    </>
                ) : (
                    <>
                        <SyncIcon className="w-5 h-5" />
                        Consultar Pedidos
                    </>
                )}
            </button>

            {error && (
                <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md break-words">
                    <p className="font-bold">Error:</p>
                    <p>{error}</p>
                </div>
            )}
            
            {renderResults()}
        </div>
    );
};

export default ShopifyWebhookTester;