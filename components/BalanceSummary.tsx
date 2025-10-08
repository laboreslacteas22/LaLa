


import React, { useState } from 'react';
import { CourierBalance, CourierName, Order, OrderStatus, PaymentMethod } from '../types';
import UserIcon from './icons/UserIcon';
import WalletIcon from './icons/WalletIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';


interface BalanceSummaryProps {
    balances: Record<string, CourierBalance>;
    orders: Order[];
    onSettleCourierCash: (courierName: CourierName) => void;
    onPayCourierFees: (courierName: CourierName) => void;
}

const formatCurrency = (value: number) => {
    return value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
};

const BalanceSummary: React.FC<BalanceSummaryProps> = ({ balances, orders, onSettleCourierCash, onPayCourierFees }) => {
    const [expandedCashCourier, setExpandedCashCourier] = useState<CourierName | null>(null);
    const [expandedFeesCourier, setExpandedFeesCourier] = useState<CourierName | null>(null);
    
    // Fix: Explicitly type `courierBalances` to ensure proper type inference downstream.
    const courierBalances: CourierBalance[] = Object.values(balances);

    const couriersWhoOwe = courierBalances.filter(cb => cb.cashCollected > 0).sort((a, b) => b.cashCollected - a.cashCollected);
    const couriersToPay = courierBalances.filter(cb => cb.feesOwed > 0).sort((a, b) => b.feesOwed - a.feesOwed);

    const renderOrderDetails = (courierName: CourierName, type: 'cash' | 'fees') => {
        let relevantOrders: Order[];

        if (type === 'cash') {
            relevantOrders = orders.filter(o => 
                o.courier === courierName &&
                o.status === OrderStatus.Delivered &&
                o.paymentMethod === PaymentMethod.Cash
            ).sort((a,b) => b.createdAt - a.createdAt);
        } else { // fees
            relevantOrders = orders.filter(o => 
                o.courier === courierName &&
                o.status === OrderStatus.Delivered
            ).sort((a,b) => b.createdAt - a.createdAt);
        }
        
        if (relevantOrders.length === 0) {
            return <div className="p-3 text-sm text-gray-500 bg-gray-50">No hay pedidos detallados para este balance.</div>;
        }

        return (
            <div className="p-3 bg-gray-50 border-t animate-fade-in">
                <div className="grid grid-cols-3 gap-2 text-xs font-bold text-gray-500 px-2 pb-1">
                    <span>Cliente</span>
                    <span>Zona</span>
                    <span className="text-right">Valor</span>
                </div>
                <div className="max-h-48 overflow-y-auto pr-1">
                    {relevantOrders.map(order => (
                        <div key={order.id} className="grid grid-cols-3 gap-2 text-sm text-gray-700 px-2 py-1.5 border-b last:border-0 hover:bg-white">
                            <span className="truncate" title={order.customerName}>{order.customerName}</span>
                            <span className="truncate" title={order.zone}>{order.zone}</span>
                            <span className="text-right font-semibold">
                                {formatCurrency(type === 'cash' ? order.totalValue : order.deliveryCost)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold text-green-700 mb-4 border-b-2 border-green-200 pb-2 flex items-center">
                    <WalletIcon className="w-6 h-6 mr-2" />
                    Los domiciliarios deben (Efectivo Recaudado)
                </h2>
                <div className="space-y-2">
                    {couriersWhoOwe.length > 0 ? (
                        couriersWhoOwe.map((cb) => (
                            <div key={cb.name} className="bg-green-50 rounded-md overflow-hidden transition-shadow hover:shadow-md">
                                <div 
                                    className="flex justify-between items-center p-3 cursor-pointer"
                                    onClick={() => setExpandedCashCourier(prev => prev === cb.name ? null : cb.name)}
                                >
                                    <div className="flex items-center">
                                        <UserIcon className="w-5 h-5 mr-3 text-gray-500" />
                                        <span className="font-semibold text-gray-700">{cb.name}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-bold text-lg text-green-600">
                                            {formatCurrency(cb.cashCollected)}
                                        </span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onSettleCourierCash(cb.name); }}
                                            className="bg-green-500 text-white text-xs font-bold py-1 px-3 rounded-md hover:bg-green-600 transition-colors flex items-center gap-1"
                                            title={`Registrar que ${cb.name} consignó ${formatCurrency(cb.cashCollected)}`}
                                        >
                                            <CheckCircleIcon className="w-4 h-4" />
                                            Consignado
                                        </button>
                                        <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform ${expandedCashCourier === cb.name ? 'rotate-180' : ''}`} />
                                    </div>
                                </div>
                                {expandedCashCourier === cb.name && renderOrderDetails(cb.name, 'cash')}
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500 text-center py-4">Ningún domiciliario debe efectivo en este momento.</p>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg">
                 <h2 className="text-xl font-bold text-red-700 mb-4 border-b-2 border-red-200 pb-2 flex items-center">
                    <WalletIcon className="w-6 h-6 mr-2" />
                    Se le debe a los domiciliarios (Pago de Domicilios)
                </h2>
                <div className="space-y-2">
                    {couriersToPay.length > 0 ? (
                        couriersToPay.map((cb) => (
                             <div key={cb.name} className="bg-red-50 rounded-md overflow-hidden transition-shadow hover:shadow-md">
                                <div 
                                    className="flex justify-between items-center p-3 cursor-pointer"
                                    onClick={() => setExpandedFeesCourier(prev => prev === cb.name ? null : cb.name)}
                                >
                                    <div className="flex items-center">
                                        <UserIcon className="w-5 h-5 mr-3 text-gray-500" />
                                        <span className="font-semibold text-gray-700">{cb.name}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-bold text-lg text-red-600">
                                            {formatCurrency(cb.feesOwed)}
                                        </span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onPayCourierFees(cb.name); }}
                                            className="bg-red-500 text-white text-xs font-bold py-1 px-3 rounded-md hover:bg-red-600 transition-colors flex items-center gap-1"
                                            title={`Pagar ${formatCurrency(cb.feesOwed)} a ${cb.name}`}
                                        >
                                            <CheckCircleIcon className="w-4 h-4" />
                                            Pagar
                                        </button>
                                         <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform ${expandedFeesCourier === cb.name ? 'rotate-180' : ''}`} />
                                    </div>
                                </div>
                                {expandedFeesCourier === cb.name && renderOrderDetails(cb.name, 'fees')}
                            </div>
                        ))
                    ) : (
                         <p className="text-gray-500 text-center py-4">No hay pagos pendientes a domiciliarios.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BalanceSummary;