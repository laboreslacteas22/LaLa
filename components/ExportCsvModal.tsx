import React, { useState, useMemo } from 'react';
import { Order, OrderStatus, CourierName, Zone, PaymentStatus } from '../types';
import { COURIERS, ZONES } from '../constants';
import DocumentArrowDownIcon from './icons/DocumentArrowDownIcon';
import XMarkIcon from './icons/XMarkIcon';

interface ExportCsvModalProps {
    isOpen: boolean;
    onClose: () => void;
    allOrders: Order[];
}

export const ExportCsvModal: React.FC<ExportCsvModalProps> = ({ isOpen, onClose, allOrders }) => {
    const [courierFilter, setCourierFilter] = useState<CourierName | 'all'>('all');
    const [zoneFilter, setZoneFilter] = useState<Zone | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
    const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatus | 'all'>('all');
    const [startDateFilter, setStartDateFilter] = useState<string>('');
    const [endDateFilter, setEndDateFilter] = useState<string>('');

    const filteredOrders = useMemo(() => {
        if (!isOpen) return []; // Don't compute if not open

        const startTimestamp = startDateFilter ? new Date(startDateFilter).setHours(0, 0, 0, 0) : 0;
        const endTimestamp = endDateFilter ? new Date(endDateFilter).setHours(23, 59, 59, 999) : Infinity;

        return allOrders.filter(order => {
            const courierMatch = courierFilter === 'all' || order.courier === courierFilter;
            const zoneMatch = zoneFilter === 'all' || order.zone === zoneFilter;
            const statusMatch = statusFilter === 'all' || order.status === statusFilter;
            const paymentStatusMatch = paymentStatusFilter === 'all' || order.paymentStatus === paymentStatusFilter;
            const dateMatch = order.createdAt >= startTimestamp && order.createdAt <= endTimestamp;
            return courierMatch && zoneMatch && statusMatch && paymentStatusMatch && dateMatch;
        });
    }, [allOrders, courierFilter, zoneFilter, statusFilter, paymentStatusFilter, startDateFilter, endDateFilter, isOpen]);

    const handleExport = () => {
        if (filteredOrders.length === 0) {
            alert("No hay pedidos que coincidan con los filtros para exportar.");
            return;
        }

        const escapeCsvField = (field: any): string => {
            if (field === null || field === undefined) return '';
            const stringField = String(field);
            return `"${stringField.replace(/"/g, '""')}"`;
        };
        
        const headers = [
            'ID Pedido', 'Numero Pedido', 'Fecha', 'Cliente', 'Dirección', 'Teléfono', 'Zona', 
            'Domiciliario', 'Valor Total', 'Costo Domicilio', 'Método de Pago', 
            'Estado de Pago', 'Estado del Pedido'
        ];

        const rows = filteredOrders.map(order => [
            escapeCsvField(order.id),
            escapeCsvField(order.orderNumber),
            escapeCsvField(new Date(order.createdAt).toLocaleString('es-CO')),
            escapeCsvField(order.customerName),
            escapeCsvField(order.address),
            escapeCsvField(order.phone),
            escapeCsvField(order.zone),
            escapeCsvField(order.courier),
            escapeCsvField(order.totalValue),
            escapeCsvField(order.deliveryCost),
            escapeCsvField(order.paymentMethod),
            escapeCsvField(order.paymentStatus),
            escapeCsvField(order.status)
        ].join(','));

        const csvString = [headers.join(','), ...rows].join('\n');
        
        const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `pedidos_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        onClose();
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold text-brand-darkgreen">Exportar Pedidos a CSV</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 p-2 rounded-full"><XMarkIcon className="w-6 h-6" /></button>
                </div>
                
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <p className="text-sm text-gray-600">Aplica los filtros para seleccionar los pedidos que quieres incluir en el archivo CSV.</p>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1">Domiciliario</label>
                            <select value={courierFilter} onChange={e => setCourierFilter(e.target.value as CourierName | 'all')} className="w-full p-2 border rounded-md bg-white text-sm">
                                <option value="all">Todos</option>
                                {COURIERS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1">Zona</label>
                            <select value={zoneFilter} onChange={e => setZoneFilter(e.target.value as Zone | 'all')} className="w-full p-2 border rounded-md bg-white text-sm">
                                <option value="all">Todas</option>
                                {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1">Estado del Pedido</label>
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as OrderStatus | 'all')} className="w-full p-2 border rounded-md bg-white text-sm">
                                <option value="all">Todos</option>
                                {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1">Estado de Pago</label>
                            <select value={paymentStatusFilter} onChange={e => setPaymentStatusFilter(e.target.value as PaymentStatus | 'all')} className="w-full p-2 border rounded-md bg-white text-sm">
                                <option value="all">Todos</option>
                                {Object.values(PaymentStatus).map(ps => <option key={ps} value={ps}>{ps}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1">Desde</label>
                            <input
                                type="date"
                                value={startDateFilter}
                                onChange={e => setStartDateFilter(e.target.value)}
                                className="w-full p-2 border rounded-md bg-white text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1">Hasta</label>
                            <input
                                type="date"
                                value={endDateFilter}
                                onChange={e => setEndDateFilter(e.target.value)}
                                className="w-full p-2 border rounded-md bg-white text-sm"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t flex justify-between items-center">
                    <p className="text-sm font-semibold text-gray-700">
                        {filteredOrders.length} {filteredOrders.length === 1 ? 'pedido encontrado' : 'pedidos encontrados'}
                    </p>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="font-semibold py-2 px-4 rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors">Cancelar</button>
                        <button onClick={handleExport} className="flex items-center gap-2 font-semibold py-2 px-4 rounded-md text-white bg-brand-green hover:bg-opacity-90 transition-colors">
                            <DocumentArrowDownIcon className="w-5 h-5" />
                            Descargar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
