

import React, { useMemo, useState } from 'react';
import { Order, CourierBalance, CourierName, OrderStatus, PaymentMethod } from '../types';
import { OrderCard } from './OrderCard';
import { BulkActionsBar } from './BulkActionsBar';
import LogoutIcon from './icons/LogoutIcon';
import WalletIcon from './icons/WalletIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import UploadIcon from './icons/UploadIcon';
import SyncIcon from './icons/SyncIcon';

interface CourierViewProps {
    courierName: CourierName;
    orders: Order[];
    balance: CourierBalance;
    onUpdateStatus: (orderId: string, status: OrderStatus) => void;
    onDeliverOrder: (orderId: string, paymentInfo: { method: PaymentMethod.Cash | PaymentMethod.Transfer; receiptUrl?: string }) => void;
    onLogout: () => void;
    selectedOrderIds: Set<string>;
    onSelectOrder: (orderId: string) => void;
    onBulkUpdate: (status: OrderStatus) => void;
    onSelectAll: (orderIds: string[]) => void;
    onClearSelection: () => void;
    onViewOrder: (orderId: string) => void;
    onSubmitDeposit: (courierName: CourierName, receiptFile: File) => Promise<void>;
}

const formatCurrency = (value: number) => {
    return value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
};

const CourierView: React.FC<CourierViewProps> = ({ 
    courierName, orders, balance, onUpdateStatus, onLogout, 
    selectedOrderIds, onSelectOrder, onBulkUpdate, onSelectAll, 
    onClearSelection, onDeliverOrder, onViewOrder, onSubmitDeposit
}) => {
    const cashCollected = balance?.cashCollected ?? 0;
    const feesOwed = balance?.feesOwed ?? 0;

    const [isDepositing, setIsDepositing] = useState(false);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const isPayday = useMemo(() => {
        const today = new Date();
        const day = today.getDate();
        // For testing, we can enable it always: return true;
        return day === 15 || day === 30;
    }, []);

    const handleClaimPayment = () => {
        alert('Tu solicitud de pago ha sido enviada. El administrador la procesará pronto.');
        // In a real app, this would trigger a notification or update a status in the DB.
    };

     const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setReceiptFile(e.target.files[0]);
        }
    };

    const handleSubmitDeposit = async () => {
        if (!receiptFile) {
            alert('Por favor, sube una foto del comprobante.');
            return;
        }
        setIsUploading(true);
        try {
            await onSubmitDeposit(courierName, receiptFile);
            alert('Comprobante enviado exitosamente para verificación.');
            setIsDepositing(false);
            setReceiptFile(null);
        } catch (error) {
            alert('Hubo un error al enviar el comprobante.');
        } finally {
            setIsUploading(false);
        }
    };
    
    const ordersToAccept = useMemo(() => orders.filter(o => o.status === OrderStatus.Packed), [orders]);
    const ordersInTransit = useMemo(() => orders.filter(o => o.status === OrderStatus.InTransit), [orders]);
    const deliveredOrders = useMemo(() => orders.filter(o => o.status === OrderStatus.Delivered), [orders]);
    
    const historyItemsWithTotals = useMemo(() => {
        const sortedOldestFirst = [...deliveredOrders].sort((a, b) => a.createdAt - b.createdAt);
        
        const totalEarned = sortedOldestFirst.reduce((sum, o) => sum + o.deliveryCost, 0);
        const totalPaid = Math.round(totalEarned - feesOwed);

        let paidAmountCounter = 0;
        const itemsWithPaidStatus = sortedOldestFirst.map(order => {
            let isPaid = false;
            if (Math.round(paidAmountCounter + order.deliveryCost) <= totalPaid) {
                isPaid = true;
                paidAmountCounter += order.deliveryCost;
            }
            return { order, isPaid };
        });

        const reversedItems = itemsWithPaidStatus.reverse();
        
        let unpaidRunningTotal = 0;
        return reversedItems.map(item => {
            if (!item.isPaid) {
                unpaidRunningTotal += item.order.deliveryCost;
                return { ...item, runningTotal: unpaidRunningTotal };
            }
            return { ...item, runningTotal: null };
        });

    }, [deliveredOrders, feesOwed]);


    const allActionableIds = useMemo(() => ordersToAccept.map(o => o.id), [ordersToAccept]);
    const areAllSelected = useMemo(() => allActionableIds.length > 0 && allActionableIds.every(id => selectedOrderIds.has(id)), [allActionableIds, selectedOrderIds]);
    
    const selectedOrders = useMemo(() => 
        orders.filter(o => selectedOrderIds.has(o.id)),
        [orders, selectedOrderIds]
    );

    const handleSelectAllClick = () => {
        if (areAllSelected) {
            onClearSelection();
        } else {
            onSelectAll(allActionableIds);
        }
    };
    
    return (
        <div className="min-h-screen bg-brand-bg font-sans">
            <header className="bg-brand-green shadow-md sticky top-0 z-10">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                    <h1 className="text-xl font-bold text-white tracking-wide">
                        Bienvenido, {courierName}
                    </h1>
                    <button 
                        onClick={onLogout} 
                        className="flex items-center gap-2 bg-white/20 text-white font-semibold py-2 px-4 rounded-md hover:bg-white/30 transition-colors"
                    >
                        <LogoutIcon className="w-5 h-5" />
                        Salir
                    </button>
                </div>
            </header>
            <main className="container mx-auto p-4 lg:p-6 pb-24">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white p-6 rounded-lg shadow-lg text-center flex flex-col justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-brand-darkgreen mb-2 flex items-center justify-center gap-2">
                                <WalletIcon className="w-6 h-6" />
                                Efectivo por Entregar
                            </h2>
                            <p className="text-4xl font-black text-red-600">{formatCurrency(cashCollected)}</p>
                            <p className="text-xs text-gray-500 mt-2">Este es el valor total en efectivo que has recaudado y debes consignar.</p>
                        </div>
                         <button
                            onClick={() => setIsDepositing(true)}
                            disabled={cashCollected <= 0}
                            className="mt-4 w-full bg-brand-green text-white font-bold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                            title={cashCollected > 0 ? "Consignar el efectivo recaudado" : "No tienes efectivo por consignar"}
                        >
                            Consignar Efectivo
                        </button>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-lg text-center flex flex-col justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-brand-darkgreen mb-2 flex items-center justify-center gap-2">
                                <CheckCircleIcon className="w-6 h-6" />
                                Domicilios por Cobrar
                            </h2>
                            <p className="text-4xl font-black text-green-600">{formatCurrency(feesOwed)}</p>
                            <p className="text-xs text-gray-500 mt-2">Este es el valor total que Labores Lácteas te debe por tus domicilios.</p>
                        </div>
                        <button
                            onClick={handleClaimPayment}
                            disabled={!isPayday}
                            className="mt-4 w-full bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                            title={isPayday ? "Solicitar pago de tus domicilios" : "Solo puedes cobrar los días 15 y 30 de cada mes"}
                        >
                            Cobrar mis Domicilios
                        </button>
                    </div>
                </div>
                
                {ordersToAccept.length > 0 && (
                    <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
                        <h2 className="text-xl font-bold text-brand-darkgreen mb-4 border-b pb-2">Pedidos por Aceptar</h2>
                        <div className="flex items-center gap-3 mb-4 px-1">
                            <input
                                type="checkbox"
                                checked={areAllSelected}
                                onChange={handleSelectAllClick}
                                id="select-all-courier"
                                className="h-5 w-5 rounded border-gray-300 text-brand-green focus:ring-brand-green"
                                disabled={ordersToAccept.length === 0}
                            />
                            <label htmlFor="select-all-courier" className="font-semibold text-gray-700">
                                Marcar todos ({ordersToAccept.length})
                            </label>
                        </div>

                        <div className="max-h-[40vh] overflow-y-auto pr-2">
                            {ordersToAccept.map(order => (
                                <OrderCard 
                                    key={order.id} 
                                    order={order} 
                                    onUpdateStatus={onUpdateStatus}
                                    onDeliverOrder={onDeliverOrder}
                                    view="courier"
                                    isSelected={selectedOrderIds.has(order.id)}
                                    onSelect={onSelectOrder}
                                    onViewOrder={onViewOrder}
                                    onPrintOrder={() => {}}
                                />
                            ))}
                        </div>
                    </div>
                )}


                 {/* PEDIDOS EN RUTA */}
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-bold text-brand-darkgreen mb-4 border-b pb-2">Pedidos en Ruta</h2>
                     <div className="max-h-[40vh] overflow-y-auto pr-2">
                        {ordersInTransit.length > 0 ? (
                            ordersInTransit.map(order => (
                                <OrderCard 
                                    key={order.id} 
                                    order={order} 
                                    onUpdateStatus={onUpdateStatus}
                                    onDeliverOrder={onDeliverOrder}
                                    view="courier"
                                    isSelected={false} // No seleccionable en esta vista
                                    onSelect={() => {}} // No seleccionable
                                    onViewOrder={onViewOrder}
                                    onPrintOrder={() => {}}
                                />
                            ))
                        ) : (
                            <p className="text-gray-500 text-center py-8">No tienes pedidos en ruta.</p>
                        )}
                    </div>
                </div>

                {deliveredOrders.length > 0 && (
                    <div className="bg-white p-6 rounded-lg shadow-lg mt-6">
                        <h2 className="text-xl font-bold text-brand-darkgreen mb-4 border-b pb-2">Historial de Entregas Recientes</h2>
                        <div className="max-h-[40vh] overflow-y-auto pr-2">
                            {historyItemsWithTotals.map(({ order, isPaid, runningTotal }) => (
                                <div key={order.id} className="grid grid-cols-3 items-center gap-2 py-2 border-b last:border-b-0">
                                    <div className="col-span-1">
                                        <p className="font-medium text-gray-800 truncate" title={order.customerName}>{order.customerName}</p>
                                        <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString('es-CO')}</p>
                                    </div>
                                    <div className="col-span-2 text-right">
                                        <span className={`font-semibold text-lg ${isPaid ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                            {formatCurrency(order.deliveryCost)}
                                        </span>
                                        {runningTotal !== null && (
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                <span className="text-gray-400">Acumulado:</span> <span className="font-semibold text-gray-600">{formatCurrency(runningTotal)}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {feesOwed > 0 ? (
                            <p className="text-xs text-gray-500 text-right mt-4">El total acumulado coincide con el valor de "Domicilios por Cobrar".</p>
                        ) : (
                            <p className="text-xs text-gray-500 text-right mt-4">Todos tus domicilios han sido pagados.</p>
                        )}
                    </div>
                )}


                 {selectedOrders.length > 0 && (
                    <BulkActionsBar 
                        selectedOrders={selectedOrders}
                        onClear={onClearSelection}
                        onBulkUpdate={onBulkUpdate}
                        view="courier"
                        onPrint={() => {}}
                    />
                )}
            </main>

            {isDepositing && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsDepositing(false)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="p-6 space-y-4">
                            <h3 className="text-xl font-bold text-brand-darkgreen text-center">Consignar Efectivo</h3>
                            <p className="text-center text-gray-600">Sube el comprobante de la consignación por el valor de <span className="font-bold">{formatCurrency(cashCollected)}</span>.</p>
                            
                            <input type="file" id={`deposit-file-${courierName}`} className="hidden" onChange={handleFileChange} accept="image/*" />
                            <label htmlFor={`deposit-file-${courierName}`} className="w-full cursor-pointer bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2 text-md">
                                <UploadIcon className="w-6 h-6" />
                                Seleccionar Comprobante
                            </label>
                            {receiptFile && <p className="text-sm text-center text-gray-700 truncate">Archivo: {receiptFile.name}</p>}
                            
                            <div className="flex gap-4 pt-4">
                                <button onClick={() => { setIsDepositing(false); setReceiptFile(null); }} className="w-full text-gray-600 bg-gray-100 font-bold py-2 px-4 rounded-lg hover:bg-gray-200">Cancelar</button>
                                <button onClick={handleSubmitDeposit} disabled={!receiptFile || isUploading} className="w-full bg-brand-green text-white font-bold py-2 px-4 rounded-lg hover:bg-opacity-90 disabled:bg-gray-400 flex items-center justify-center gap-2">
                                    {isUploading ? <SyncIcon className="w-5 h-5 animate-spin" /> : <CheckCircleIcon className="w-5 h-5" />}
                                    {isUploading ? 'Enviando...' : 'Enviar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourierView;