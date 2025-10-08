

import React, { useState } from 'react';
import { Order, OrderStatus, PaymentStatus, PaymentMethod, User } from '../types';
import { uploadReceipt } from '../services/firebaseService';

import PackageIcon from './icons/PackageIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import ArrowUturnLeftIcon from './icons/ArrowUturnLeftIcon';
import TruckIcon from './icons/TruckIcon';
import CashIcon from './icons/CashIcon';
import UploadIcon from './icons/UploadIcon';
import SyncIcon from './icons/SyncIcon';
import PrinterIcon from './icons/PrinterIcon';


interface OrderCardProps {
    order: Order;
    onUpdateStatus: (orderId: string, status: OrderStatus) => void;
    onDeliverOrder: (orderId: string, paymentInfo: { method: PaymentMethod.Cash | PaymentMethod.Transfer; receiptUrl?: string }) => void;
    view: 'central' | 'courier';
    isSelected: boolean;
    onSelect: (orderId: string) => void;
    onViewOrder: (orderId: string) => void;
    onPrintOrder: (orderId: string) => void;
    currentUser?: User;
}

const statusConfig = {
    [OrderStatus.Pending]: { text: 'Pendiente', color: 'bg-gray-200 text-gray-800' },
    [OrderStatus.Packed]: { text: 'Empacado', color: 'bg-brand-cream text-brand-darkgreen' },
    [OrderStatus.InTransit]: { text: 'En Ruta', color: 'bg-yellow-200 text-yellow-800' },
    [OrderStatus.Delivered]: { text: 'Entregado', color: 'bg-green-200 text-green-800' },
    [OrderStatus.Cancelled]: { text: 'Cancelado', color: 'bg-red-200 text-red-800' },
    [OrderStatus.Returned]: { text: 'Devolución', color: 'bg-orange-200 text-orange-800' },
};

const paymentStatusConfig = {
    [PaymentStatus.Paid]: { text: 'Pagado', dotColor: 'bg-green-500' },
    [PaymentStatus.PendingPayment]: { text: 'Pendiente Pago', dotColor: 'bg-orange-500' },
}

const formatCurrency = (value: number) => {
    return value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
};

export const OrderCard: React.FC<OrderCardProps> = React.memo(({ order, onUpdateStatus, onDeliverOrder, view, isSelected, onSelect, onViewOrder, onPrintOrder, currentUser }) => {
    const [isConfirmingDelivery, setIsConfirmingDelivery] = useState(false);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const currentStatus = statusConfig[order.status];
    const currentPaymentStatus = paymentStatusConfig[order.paymentStatus];
    const isTerminalState = [OrderStatus.Delivered, OrderStatus.Cancelled, OrderStatus.Returned].includes(order.status);
    const isActionableByCourier = order.status === OrderStatus.Packed || order.status === OrderStatus.InTransit;
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setReceiptFile(e.target.files[0]);
        }
    };

    const handleConfirmTransfer = async () => {
        if (!receiptFile) {
            alert("Por favor, sube una foto del comprobante.");
            return;
        }
        setIsUploading(true);
        try {
            const receiptUrl = await uploadReceipt(receiptFile);
            onDeliverOrder(order.id, { method: PaymentMethod.Transfer, receiptUrl });
        } catch (error) {
            // Error handling is now managed in App.tsx via addToast
        } finally {
            setIsUploading(false);
            setIsConfirmingDelivery(false);
        }
    };
    
    const renderCourierActions = () => {
        if (order.status === OrderStatus.Packed) {
            return (
                 <button
                    onClick={(e) => { e.stopPropagation(); onUpdateStatus(order.id, OrderStatus.InTransit); }}
                    className="w-full bg-brand-green text-white font-bold py-3 px-4 rounded-lg hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2 text-md shadow"
                >
                    <TruckIcon className="w-6 h-6" />
                    Aceptar Pedido
                </button>
            )
        }
        if (order.status === OrderStatus.InTransit) {
             if (isConfirmingDelivery) {
                 if (order.paymentStatus === PaymentStatus.Paid) {
                     return (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                             <p className="text-center font-semibold mb-3">Este pedido ya fue pagado. Confirma la entrega.</p>
                             <button
                                onClick={(e) => { e.stopPropagation(); onUpdateStatus(order.id, OrderStatus.Delivered); }}
                                className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 text-lg shadow-md"
                            >
                                <CheckCircleIcon className="w-6 h-6" />
                                Confirmar Entrega
                            </button>
                         </div>
                     )
                 }
                 return (
                    <div className="mt-4 p-4 bg-gray-100 rounded-lg space-y-4 border border-gray-200">
                         <h4 className="font-bold text-center text-gray-800">¿Cómo pagó el cliente?</h4>
                         <button
                            onClick={(e) => { e.stopPropagation(); onDeliverOrder(order.id, { method: PaymentMethod.Cash }); }}
                            className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-md"
                        >
                            <CashIcon className="w-6 h-6" />
                            Pagado en Efectivo
                        </button>
                         <div className="space-y-2">
                            <h5 className="text-center font-semibold text-gray-600">- O -</h5>
                             <input type="file" id={`file-${order.id}`} className="hidden" onChange={handleFileChange} accept="image/*" onClick={(e) => e.stopPropagation()} />
                             <label htmlFor={`file-${order.id}`} onClick={(e) => e.stopPropagation()} className="w-full cursor-pointer bg-brand-lightgreen text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-colors flex items-center justify-center gap-2 text-md">
                                 <UploadIcon className="w-6 h-6" />
                                 Subir Comprobante Transf.
                             </label>
                            {receiptFile && <p className="text-sm text-center text-gray-700 truncate">Archivo: {receiptFile.name}</p>}
                             <button
                                onClick={(e) => { e.stopPropagation(); handleConfirmTransfer(); }}
                                disabled={!receiptFile || isUploading}
                                className="w-full bg-brand-green text-white font-bold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2 text-sm disabled:bg-gray-400"
                            >
                                {isUploading ? <SyncIcon className="w-5 h-5 animate-spin"/> : <CheckCircleIcon className="w-5 h-5" />}
                                {isUploading ? "Subiendo..." : "Confirmar Transferencia"}
                            </button>
                         </div>
                         <button onClick={(e) => { e.stopPropagation(); setIsConfirmingDelivery(false); }} className="w-full text-sm text-gray-500 hover:underline mt-2">Cancelar</button>
                     </div>
                 );
             }
            return (
                <button
                    onClick={(e) => { e.stopPropagation(); setIsConfirmingDelivery(true); }}
                    className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 text-lg shadow-md"
                >
                    <CheckCircleIcon className="w-6 h-6" />
                    Entregar Pedido
                </button>
            );
        }
        return null;
    }

    const isCheckboxDisabled = () => {
        if (isTerminalState) return true;
        if (view === 'central') {
            // Checkbox logic is now more open, bulk action bar will determine available actions
            return false;
        }
        if (view === 'courier') {
            return !isActionableByCourier;
        }
        return false;
    };

    return (
        <div 
            onClick={() => onViewOrder(order.id)}
            className={`bg-white rounded-lg shadow-md p-4 mb-4 transition-all duration-200 border-l-4 ${isSelected ? 'border-brand-green shadow-xl' : 'border-transparent'} ${isTerminalState && order.status !== OrderStatus.Delivered ? 'opacity-70' : ''} hover:shadow-lg cursor-pointer`}
        >
            <div className="flex justify-between items-start">
                <div className="flex items-start">
                     <div onClick={(e) => e.stopPropagation()}>
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onSelect(order.id)}
                            className="mt-1.5 h-5 w-5 rounded border-gray-300 text-brand-green focus:ring-brand-green disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label={`Seleccionar pedido de ${order.customerName}`}
                            disabled={isCheckboxDisabled()}
                        />
                     </div>
                    <div className="ml-4">
                        <div className="flex items-baseline gap-2">
                           <h3 className="font-bold text-lg text-brand-darkgreen">{order.customerName}</h3>
                           <p className="text-sm font-semibold text-gray-400">{order.orderNumber || `#${order.id.split('-').pop()}`}</p>
                        </div>
                        <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        <p className="text-sm text-gray-500 mt-1">{order.address}</p>
                        <p className="text-sm text-gray-500">
                            Tel: {order.phone} / Domiciliario: <span className="font-semibold">{order.courier}</span> / Pago: <span className="font-semibold">{order.paymentMethod}</span>
                        </p>
                        {order.transferReceiptUrl && (
                             <a href={order.transferReceiptUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-sm text-brand-green hover:underline font-semibold">
                                Ver Comprobante
                            </a>
                        )}
                    </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                     <p className="text-lg font-bold text-brand-green mt-1">{formatCurrency(order.totalValue)}</p>
                     <div className="flex items-center justify-end gap-2 mt-1">
                        <span className={`w-2.5 h-2.5 ${currentPaymentStatus.dotColor} rounded-full`}></span>
                        <span className="text-sm text-gray-600 font-medium">{currentPaymentStatus.text}</span>
                    </div>
                    <span className={`block mt-1.5 px-3 py-1 text-sm font-semibold rounded-full ${currentStatus.color}`}>
                        {currentStatus.text}
                    </span>
                </div>
            </div>
            
             {view === 'courier' && isActionableByCourier && !isTerminalState && (
                <div className="mt-4 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
                    {renderCourierActions()}
                </div>
            )}
            
            {view === 'central' && (
                <div className="flex justify-end items-center space-x-2 mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
                    {!isTerminalState && (
                        <>
                            {order.status === OrderStatus.Packed && (
                                 <button
                                    onClick={() => onPrintOrder(order.id)}
                                    className="flex items-center gap-2 text-sm text-white bg-blue-500 hover:bg-blue-600 py-2 px-3 rounded-md font-semibold transition-colors shadow"
                                    title="Imprimir Guía de Envío"
                                >
                                    <PrinterIcon className="w-5 h-5" />
                                    Imprimir Guía
                                </button>
                            )}
                            <button
                                onClick={() => onUpdateStatus(order.id, OrderStatus.Cancelled)}
                                className="flex items-center gap-1 text-sm text-red-600 hover:bg-red-50 p-2 rounded-md transition-colors"
                                title="Cancelar Pedido"
                            >
                                <XCircleIcon className="w-5 h-5" />
                                Cancelar
                            </button>
                            {order.status === OrderStatus.Pending && (
                                <button
                                    onClick={() => onUpdateStatus(order.id, OrderStatus.Packed)}
                                    className="flex items-center gap-2 text-sm text-white bg-brand-green hover:bg-opacity-90 py-2 px-3 rounded-md font-semibold transition-colors shadow"
                                    title="Marcar como Empacado"
                                >
                                    <PackageIcon className="w-5 h-5" />
                                    Empacar
                                </button>
                            )}
                        </>
                    )}
                    {order.status === OrderStatus.Delivered && (
                        <button
                            onClick={() => onUpdateStatus(order.id, OrderStatus.Returned)}
                            className="flex items-center gap-2 text-sm text-white bg-orange-500 hover:bg-orange-600 py-2 px-3 rounded-md font-semibold transition-colors shadow"
                            title="Procesar una devolución para este pedido"
                        >
                            <ArrowUturnLeftIcon className="w-5 h-5" />
                            Hacer Devolución
                        </button>
                    )}
                </div>
            )}
        </div>
    )
});