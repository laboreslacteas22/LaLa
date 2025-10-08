import React, { useState } from 'react';
import { Order, OrderStatus, PaymentMethod, PaymentStatus, User } from '../types';
import { uploadReceipt } from '../services/firebaseService.ts';

// Import Icons
import XMarkIcon from './icons/XMarkIcon';
import PackageIcon from './icons/PackageIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import ArrowUturnLeftIcon from './icons/ArrowUturnLeftIcon';
import TruckIcon from './icons/TruckIcon';
import CashIcon from './icons/CashIcon';
import UploadIcon from './icons/UploadIcon';
import SyncIcon from './icons/SyncIcon';
import UserIcon from './icons/UserIcon';
import MapPinIcon from './icons/MapPinIcon';
import PhoneIcon from './icons/PhoneIcon';
import WalletIcon from './icons/WalletIcon';


interface OrderDetailViewProps {
    order: Order;
    onClose: () => void;
    onUpdateStatus: (orderId: string, status: OrderStatus) => void;
    onDeliverOrder: (orderId: string, paymentInfo: { method: PaymentMethod.Cash | PaymentMethod.Transfer; receiptUrl?: string }) => void;
    view: 'central' | 'courier';
    currentUser?: User;
}

// Re-used from OrderCard
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
};
const formatCurrency = (value: number) => {
    return value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
};

// Main Component
const OrderDetailView: React.FC<OrderDetailViewProps> = ({ order, onClose, onUpdateStatus, onDeliverOrder, view, currentUser }) => {
    
    // State for courier actions inside modal
    const [isConfirmingDelivery, setIsConfirmingDelivery] = useState(false);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const isTerminalState = [OrderStatus.Delivered, OrderStatus.Cancelled, OrderStatus.Returned].includes(order.status);
    const isActionableByCourier = order.status === OrderStatus.Packed || order.status === OrderStatus.InTransit;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setReceiptFile(e.target.files[0]);
        }
    };

    const handleConfirmTransfer = async () => {
        if (!receiptFile) return;
        setIsUploading(true);
        try {
            const receiptUrl = await uploadReceipt(receiptFile);
            onDeliverOrder(order.id, { method: PaymentMethod.Transfer, receiptUrl });
        } catch (error) {
            alert("Error al subir el comprobante.");
        } finally {
            setIsUploading(false);
        }
    };

    const renderActions = () => {
        if (view === 'central' && !isTerminalState) {
            return (
                <div className="flex w-full gap-4">
                    {order.status === OrderStatus.Pending && (
                        <button onClick={() => onUpdateStatus(order.id, OrderStatus.Packed)} className="flex-1 flex items-center justify-center gap-2 text-white bg-brand-green hover:bg-opacity-90 py-3 px-4 rounded-md font-semibold transition-colors shadow">
                            <PackageIcon className="w-5 h-5" /> Empacar
                        </button>
                    )}
                    {order.status !== OrderStatus.Pending && (
                         <button onClick={() => onUpdateStatus(order.id, OrderStatus.Cancelled)} className="flex-1 flex items-center justify-center gap-1 text-red-600 bg-red-100 hover:bg-red-200 py-3 px-4 rounded-md transition-colors font-semibold">
                            <XCircleIcon className="w-5 h-5" /> Cancelar
                        </button>
                    )}
                </div>
            );
        }

        if (view === 'central' && order.status === OrderStatus.Delivered) {
             return (
                <button onClick={() => onUpdateStatus(order.id, OrderStatus.Returned)} className="w-full flex items-center justify-center gap-2 text-white bg-orange-500 hover:bg-orange-600 py-3 px-4 rounded-md font-semibold transition-colors shadow">
                     <ArrowUturnLeftIcon className="w-5 h-5" /> Hacer Devolución
                </button>
            );
        }

        if (view === 'courier' && isActionableByCourier && !isTerminalState) {
            if (order.status === OrderStatus.Packed) {
                return <button onClick={() => onUpdateStatus(order.id, OrderStatus.InTransit)} className="w-full bg-brand-green text-white font-bold py-3 px-4 rounded-lg hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2 text-md shadow"><TruckIcon className="w-6 h-6" /> Aceptar Pedido</button>;
            }
            if (order.status === OrderStatus.InTransit) {
                if (order.paymentStatus === PaymentStatus.Paid && !isConfirmingDelivery) {
                    return <button onClick={() => setIsConfirmingDelivery(true)} className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 text-lg shadow-md"><CheckCircleIcon className="w-6 h-6" /> Entregar (Ya está pago)</button>;
                }
                if (isConfirmingDelivery) {
                    return (
                        <div className="w-full p-4 bg-gray-100 rounded-lg space-y-4 border border-gray-200">
                             <h4 className="font-bold text-center text-gray-800">¿Cómo pagó el cliente?</h4>
                             <button onClick={() => onDeliverOrder(order.id, { method: PaymentMethod.Cash })} className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-md"><CashIcon className="w-6 h-6" /> Pagado en Efectivo</button>
                             <div className="space-y-2">
                                <h5 className="text-center font-semibold text-gray-600">- O -</h5>
                                 <input type="file" id={`file-modal-${order.id}`} className="hidden" onChange={handleFileChange} accept="image/*" />
                                 <label htmlFor={`file-modal-${order.id}`} className="w-full cursor-pointer bg-brand-lightgreen text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-colors flex items-center justify-center gap-2 text-md"><UploadIcon className="w-6 h-6" /> Subir Comprobante</label>
                                {receiptFile && <p className="text-sm text-center text-gray-700 truncate">{receiptFile.name}</p>}
                                 <button onClick={handleConfirmTransfer} disabled={!receiptFile || isUploading} className="w-full bg-brand-green text-white font-bold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2 text-sm disabled:bg-gray-400">
                                    {isUploading ? <><SyncIcon className="w-5 h-5 animate-spin"/> Subiendo...</> : <><CheckCircleIcon className="w-5 h-5" /> Confirmar Transferencia</>}
                                </button>
                             </div>
                             <button onClick={() => setIsConfirmingDelivery(false)} className="w-full text-sm text-gray-500 hover:underline mt-2">Cancelar</button>
                         </div>
                     );
                }
                 return <button onClick={() => setIsConfirmingDelivery(true)} className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 text-lg shadow-md"><CheckCircleIcon className="w-6 h-6" /> Entregar Pedido</button>;
            }
        }
        return null;
    };

    return (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold text-brand-darkgreen">Detalle del Pedido</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 transition-colors p-2 rounded-full"><XMarkIcon className="w-6 h-6" /></button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Customer & Status */}
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm">Cliente</p>
                            <h3 className="text-2xl font-bold text-gray-800">{order.customerName}</h3>
                        </div>
                        <div className="text-right">
                             <p className="text-gray-500 text-sm">Estado Actual</p>
                            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusConfig[order.status].color}`}>{statusConfig[order.status].text}</span>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-start gap-3">
                            <MapPinIcon className="w-6 h-6 text-brand-green mt-1" />
                            <div>
                                <h4 className="font-semibold text-gray-700">Dirección</h4>
                                <p className="text-gray-600">{order.address}</p>
                            </div>
                        </div>
                         <div className="flex items-start gap-3">
                            <PhoneIcon className="w-6 h-6 text-brand-green mt-1" />
                            <div>
                                <h4 className="font-semibold text-gray-700">Teléfono</h4>
                                <p className="text-gray-600">{order.phone}</p>
                            </div>
                        </div>
                         <div className="flex items-start gap-3">
                            <WalletIcon className="w-6 h-6 text-brand-green mt-1" />
                            <div>
                                <h4 className="font-semibold text-gray-700">Información de Pago</h4>
                                <p className="text-gray-800 font-bold text-lg">{formatCurrency(order.totalValue)}</p>
                                <div className="flex items-center gap-2">
                                    <span className={`w-2.5 h-2.5 ${paymentStatusConfig[order.paymentStatus].dotColor} rounded-full`}></span>
                                    <span className="text-sm text-gray-600 font-medium">{paymentStatusConfig[order.paymentStatus].text} ({order.paymentMethod})</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <UserIcon className="w-6 h-6 text-brand-green mt-1" />
                            <div>
                                <h4 className="font-semibold text-gray-700">Domiciliario</h4>
                                <p className="text-gray-600">{order.courier}</p>
                            </div>
                        </div>
                    </div>

                    {/* Receipt & Map */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-2">Comprobante de Pago</h4>
                            {order.transferReceiptUrl ? (
                                <a href={order.transferReceiptUrl} target="_blank" rel="noopener noreferrer">
                                    <img src={order.transferReceiptUrl} alt="Comprobante" className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition" />
                                </a>
                            ) : (
                                <div className="w-full h-48 flex items-center justify-center bg-gray-100 rounded-lg text-gray-500 text-sm">No hay comprobante</div>
                            )}
                        </div>
                        <div>
                             <h4 className="font-semibold text-gray-700 mb-2">Ubicación en Mapa</h4>
                             <iframe
                                className="w-full h-48 rounded-lg border"
                                loading="lazy"
                                allowFullScreen
                                src={`https://www.google.com/maps?q=${encodeURIComponent(order.address)}&output=embed`}>
                            </iframe>
                        </div>
                    </div>
                </div>

                {/* Footer with Actions */}
                <div className="p-4 bg-gray-50 border-t">
                    <div className="flex items-center">
                        {renderActions() || <p className="text-sm text-gray-500 text-center w-full">No hay acciones disponibles para este pedido.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderDetailView;


const PhoneIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
  </svg>
);