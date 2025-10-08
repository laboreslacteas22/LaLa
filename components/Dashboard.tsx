import React, { useState, useMemo } from 'react';
import { Order, OrderStatus, Zone, CourierName } from '../types';
import { COURIERS, ZONES } from '../constants';
import KpiCard from './KpiCard';
import BarChart from './charts/BarChart';

// Icons
import ClipboardListIcon from './icons/ClipboardListIcon';
import CashIcon from './icons/CashIcon';
import MapPinIcon from './icons/MapPinIcon';
import UsersIcon from './icons/UsersIcon';
import TruckIcon from './icons/TruckIcon';
import CurrencyDollarIcon from './icons/CurrencyDollarIcon';
import ArrowPathIcon from './icons/ArrowPathIcon';
import ClockIcon from './icons/ClockIcon';
import PackageIcon from './icons/PackageIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import ArrowUturnLeftIcon from './icons/ArrowUturnLeftIcon';

const formatCurrency = (value: number) => {
    return value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
};

const StatusDetailCard: React.FC<{ icon: React.ReactNode; label: string; value: number; colorClass: string }> = ({ icon, label, value, colorClass }) => (
    <div className="flex justify-between items-center text-sm">
        <div className="flex items-center gap-2 text-gray-600">
            <span className={colorClass}>{icon}</span>
            <span>{label}</span>
        </div>
        <span className={`font-bold ${colorClass}`}>{value}</span>
    </div>
);

const Dashboard: React.FC<{ orders: Order[] }> = ({ orders }) => {
    const today = new Date();
    const [datePreset, setDatePreset] = useState<'last7' | 'last30' | 'thisMonth' | 'custom'>('last30');
    const [startDate, setStartDate] = useState(() => {
        const d = new Date(today);
        d.setDate(d.getDate() - 29);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
    const [zoneFilter, setZoneFilter] = useState<Zone | 'all'>('all');
    const [courierFilter, setCourierFilter] = useState<CourierName | 'all'>('all');

    const handlePresetChange = (preset: 'last7' | 'last30' | 'thisMonth') => {
        setDatePreset(preset);
        const today = new Date();
        const end = new Date(today);
        let start = new Date(today);

        if (preset === 'last7') {
            start.setDate(today.getDate() - 6);
        } else if (preset === 'last30') {
            start.setDate(today.getDate() - 29);
        } else if (preset === 'thisMonth') {
            start = new Date(today.getFullYear(), today.getMonth(), 1);
        }
        
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => {
        setDatePreset('custom');
        if (type === 'start') {
            setStartDate(e.target.value);
        } else {
            setEndDate(e.target.value);
        }
    }
    
    const handleResetFilters = () => {
        handlePresetChange('last30');
        setZoneFilter('all');
        setCourierFilter('all');
    };

    const filteredOrders = useMemo(() => {
        const startTimestamp = new Date(startDate).setHours(0, 0, 0, 0);
        const endTimestamp = new Date(endDate).setHours(23, 59, 59, 999);

        return orders.filter(order => {
            const dateMatch = order.createdAt >= startTimestamp && order.createdAt <= endTimestamp;
            const zoneMatch = zoneFilter === 'all' || order.zone === zoneFilter;
            const courierMatch = courierFilter === 'all' || order.courier === courierFilter;
            return dateMatch && zoneMatch && courierMatch;
        });
    }, [orders, startDate, endDate, zoneFilter, courierFilter]);
    
    const dashboardData = useMemo(() => {
        const totalOrders = filteredOrders.length;
        const totalSales = filteredOrders.reduce((sum, order) => sum + order.totalValue, 0);
        const totalDeliveryCosts = filteredOrders.reduce((sum, order) => sum + order.deliveryCost, 0);
        const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
        
        const statusCounts = {
            pendingGroup: 0,
            completedGroup: 0,
            [OrderStatus.Pending]: 0,
            [OrderStatus.Packed]: 0,
            [OrderStatus.InTransit]: 0,
            [OrderStatus.Delivered]: 0,
            [OrderStatus.Returned]: 0,
            [OrderStatus.Cancelled]: 0,
        };
        
        filteredOrders.forEach(order => {
            statusCounts[order.status]++;
        });
        
        // FIX: The properties were accessed by their enum names (e.g., `Pending`) instead of their enum values (e.g., `OrderStatus.Pending` which evaluates to 'Pendiente').
        statusCounts.pendingGroup = statusCounts[OrderStatus.Pending] + statusCounts[OrderStatus.Packed] + statusCounts[OrderStatus.InTransit];
        statusCounts.completedGroup = statusCounts[OrderStatus.Delivered] + statusCounts[OrderStatus.Returned];

        const salesByZone = ZONES.map(zone => ({
            label: zone,
            value: filteredOrders.filter(o => o.zone === zone).reduce((sum, o) => sum + o.totalValue, 0),
        })).filter(z => z.value > 0).sort((a,b) => b.value - a.value);

        const salesByCourier = COURIERS.map(courier => ({
            label: courier,
            value: filteredOrders.filter(o => o.courier === courier).reduce((sum, o) => sum + o.totalValue, 0),
        })).filter(c => c.value > 0).sort((a,b) => b.value - a.value);

        return {
            totalOrders,
            totalSales,
            totalDeliveryCosts,
            averageTicket,
            statusCounts,
            salesByZone,
            salesByCourier
        };
    }, [filteredOrders]);

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
                    <div className="md:col-span-3 lg:col-span-2">
                        <label className="text-sm font-semibold text-gray-600">Período</label>
                        <div className="flex items-center gap-2 mt-1">
                            {([['last7', '7D'], ['last30', '30D'], ['thisMonth', 'Mes Actual']] as const).map(([preset, label]) => (
                                <button key={preset} onClick={() => handlePresetChange(preset)} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${datePreset === preset ? 'bg-brand-green text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>{label}</button>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                             <input type="date" value={startDate} onChange={e => handleDateChange(e, 'start')} className="w-full p-2 border rounded-md bg-white text-sm" />
                             <input type="date" value={endDate} onChange={e => handleDateChange(e, 'end')} className="w-full p-2 border rounded-md bg-white text-sm" />
                        </div>
                    </div>
                     <div>
                        <label className="text-sm font-semibold text-gray-600">Zona</label>
                        <select value={zoneFilter} onChange={e => setZoneFilter(e.target.value as Zone | 'all')} className="w-full mt-1 p-2 border rounded-md bg-white text-sm">
                            <option value="all">Todas</option>
                            {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="text-sm font-semibold text-gray-600">Domiciliario</label>
                        <select value={courierFilter} onChange={e => setCourierFilter(e.target.value as CourierName | 'all')} className="w-full mt-1 p-2 border rounded-md bg-white text-sm">
                            <option value="all">Todos</option>
                            {COURIERS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <button onClick={handleResetFilters} className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2 px-3 rounded-md transition-colors bg-gray-200 text-gray-700 hover:bg-gray-300">
                            <ArrowPathIcon className="w-5 h-5"/>Limpiar
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Total de Pedidos" value={dashboardData.totalOrders} icon={<ClipboardListIcon className="w-7 h-7" />} />
                <KpiCard title="Ventas Totales" value={formatCurrency(dashboardData.totalSales)} icon={<CashIcon className="w-7 h-7" />} />
                <KpiCard title="Costo Domicilios" value={formatCurrency(dashboardData.totalDeliveryCosts)} icon={<TruckIcon className="w-7 h-7" />} />
                <KpiCard title="Ticket Promedio" value={formatCurrency(dashboardData.averageTicket)} icon={<CurrencyDollarIcon className="w-7 h-7" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-bold text-brand-darkgreen mb-4 border-b pb-2">Desglose de Estados</h3>
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-bold text-gray-700 mb-2">Pendientes ({dashboardData.statusCounts.pendingGroup})</h4>
                            <div className="space-y-2 pl-4 border-l-2">
                                <StatusDetailCard icon={<ClockIcon className="w-4 h-4"/>} label="Por empacar" value={dashboardData.statusCounts[OrderStatus.Pending]} colorClass="text-gray-500"/>
                                <StatusDetailCard icon={<PackageIcon className="w-4 h-4"/>} label="Empacado" value={dashboardData.statusCounts[OrderStatus.Packed]} colorClass="text-yellow-600"/>
                                {/* FIX: `EnRuta` was a typo for the property `En Ruta`. Using bracket notation with the enum value `OrderStatus.InTransit` fixes the issue and improves maintainability. */}
                                <StatusDetailCard icon={<TruckIcon className="w-4 h-4"/>} label="En Ruta" value={dashboardData.statusCounts[OrderStatus.InTransit]} colorClass="text-blue-600"/>
                            </div>
                        </div>
                         <div>
                            <h4 className="font-bold text-gray-700 mb-2">Completados ({dashboardData.statusCounts.completedGroup})</h4>
                             <div className="space-y-2 pl-4 border-l-2">
                                <StatusDetailCard icon={<CheckCircleIcon className="w-4 h-4"/>} label="Entregado" value={dashboardData.statusCounts[OrderStatus.Delivered]} colorClass="text-green-600"/>
                                <StatusDetailCard icon={<ArrowUturnLeftIcon className="w-4 h-4"/>} label="Devolución" value={dashboardData.statusCounts[OrderStatus.Returned]} colorClass="text-orange-600"/>
                            </div>
                        </div>
                         <div>
                             <h4 className="font-bold text-gray-700 mb-2">Cancelados ({dashboardData.statusCounts[OrderStatus.Cancelled]})</h4>
                              <div className="space-y-2 pl-4 border-l-2">
                                <StatusDetailCard icon={<XCircleIcon className="w-4 h-4"/>} label="Cancelado" value={dashboardData.statusCounts[OrderStatus.Cancelled]} colorClass="text-red-600"/>
                            </div>
                        </div>
                    </div>
                </div>
                 <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                     <BarChart 
                        data={dashboardData.salesByZone} 
                        title="Ventas por Zona"
                        icon={<MapPinIcon className="w-6 h-6 mr-2" />}
                        formatValue={formatCurrency}
                     />
                     <BarChart 
                        data={dashboardData.salesByCourier}
                        title="Ventas por Domiciliario"
                        icon={<UsersIcon className="w-6 h-6 mr-2" />}
                        formatValue={formatCurrency}
                        barColorClass="bg-brand-lightgreen"
                    />
                 </div>
            </div>
        </div>
    );
};

export default Dashboard;