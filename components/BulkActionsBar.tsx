import React, { useMemo } from 'react';
import { Order, OrderStatus, User } from '../types';
import PackageIcon from './icons/PackageIcon';
import XCircleIcon from './icons/XCircleIcon';
import TruckIcon from './icons/TruckIcon';
import PrinterIcon from './icons/PrinterIcon';


interface BulkActionsBarProps {
    selectedOrders: Order[];
    onClear: () => void;
    onBulkUpdate: (status: OrderStatus) => void;
    onPrint: () => void;
    view: 'central' | 'courier';
    currentUser?: User;
}

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({ selectedOrders, onClear, onBulkUpdate, onPrint, view, currentUser }) => {
    
    const selectedCount = selectedOrders.length;

    const canPack = useMemo(() => view === 'central' && selectedCount > 0 && selectedOrders.every(o => o.status === OrderStatus.Pending), [selectedOrders, selectedCount, view]);
    const canPrint = useMemo(() => view === 'central' && selectedCount > 0 && selectedOrders.every(o => o.status === OrderStatus.Packed), [selectedOrders, selectedCount, view]);
    const canAccept = useMemo(() => view === 'courier' && selectedCount > 0 && selectedOrders.every(o => o.status === OrderStatus.Packed), [selectedOrders, selectedCount, view]);
    
    const isTerminal = (status: OrderStatus) => [OrderStatus.Delivered, OrderStatus.Cancelled, OrderStatus.Returned].includes(status);
    const canCancel = useMemo(() => view === 'central' && selectedCount > 0 && selectedOrders.every(o => !isTerminal(o.status)), [selectedOrders, selectedCount, view]);

    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-brand-darkgreen shadow-lg z-20 transform transition-transform duration-300 ease-in-out translate-y-0 lg:left-64">
            <div className="container mx-auto p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                     <button onClick={onClear} title="Limpiar selección" className="p-2 rounded-full text-white hover:bg-white/20 transition-colors">
                        <XCircleIcon className="w-6 h-6"/>
                    </button>
                    <div className="font-bold text-lg text-white">
                        {selectedCount} {selectedCount === 1 ? 'pedido seleccionado' : 'pedidos seleccionados'}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {view === 'central' && (
                        <>
                            {canPack && (
                                <button onClick={() => onBulkUpdate(OrderStatus.Packed)} className="flex items-center gap-2 bg-white/20 font-semibold py-2 px-4 rounded-md hover:bg-white/30 transition-colors text-white">
                                    <PackageIcon className="w-5 h-5" /> Empacar
                                </button>
                            )}
                            {canPrint && (
                                <button onClick={onPrint} className="flex items-center gap-2 bg-blue-500 font-semibold py-2 px-4 rounded-md hover:bg-blue-600 transition-colors text-white">
                                    <PrinterIcon className="w-5 h-5" /> Imprimir Guías
                                </button>
                            )}
                            {canCancel && (
                                <button onClick={() => onBulkUpdate(OrderStatus.Cancelled)} className="flex items-center gap-2 bg-red-500/80 font-semibold py-2 px-4 rounded-md hover:bg-red-500 transition-colors text-white">
                                    <XCircleIcon className="w-5 h-5" /> Cancelar
                                </button>
                            )}
                        </>
                    )}
                    {view === 'courier' && (
                        <>
                            {canAccept && (
                                <button onClick={() => onBulkUpdate(OrderStatus.InTransit)} className="flex items-center gap-2 bg-green-500/80 font-semibold py-2 px-4 rounded-md hover:bg-green-500 transition-colors text-white">
                                    <TruckIcon className="w-5 h-5" /> Aceptar Seleccionados
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};