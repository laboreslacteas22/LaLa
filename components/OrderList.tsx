import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Order, OrderStatus, CourierName, Zone, PaymentStatus, PaymentMethod, User } from '../types';
import { OrderCard } from './OrderCard';
import { BulkActionsBar } from './BulkActionsBar';
import { COURIERS, ZONES } from '../constants';
import FilterIcon from './icons/FilterIcon';
import DocumentArrowDownIcon from './icons/DocumentArrowDownIcon';
import { ExportCsvModal } from './ExportCsvModal';
import MagnifyingGlassIcon from './icons/MagnifyingGlassIcon';

interface OrderListProps {
    orders: Order[];
    allOrdersForExport: Order[];
    onUpdateStatus: (orderId: string, status: OrderStatus) => void;
    isLoading: boolean;
    view: 'central' | 'courier';
    listType: 'active' | 'completed' | 'cancelled';
    selectedOrderIds: Set<string>;
    onSelectOrder: (orderId: string) => void;
    onBulkUpdate: (status: OrderStatus) => void;
    onSelectAll: (orderIds: string[]) => void;
    onClearSelection: () => void;
    onViewOrder: (orderId: string) => void;
    onInitiatePrint: (orders: Order[]) => void;
    currentUser: User;
}

const OrderList: React.FC<OrderListProps> = ({ orders, allOrdersForExport, onUpdateStatus, isLoading, view, listType, selectedOrderIds, onSelectOrder, onBulkUpdate, onSelectAll, onClearSelection, onViewOrder, onInitiatePrint, currentUser }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [courierFilter, setCourierFilter] = useState<CourierName | 'all'>('all');
    const [zoneFilter, setZoneFilter] = useState<Zone | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
    const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatus | 'all'>('all');
    const [startDateFilter, setStartDateFilter] = useState<string>('');
    const [endDateFilter, setEndDateFilter] = useState<string>('');
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ORDERS_PER_PAGE = 10;
    
    const filterPanelRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
                setIsFilterPanelOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

     // Reset page when filters or search change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, courierFilter, zoneFilter, statusFilter, paymentStatusFilter, startDateFilter, endDateFilter]);

    const filteredOrders = useMemo(() => {
        const startTimestamp = startDateFilter ? new Date(startDateFilter).getTime() : 0;
        const endTimestamp = endDateFilter ? (() => {
            const d = new Date(endDateFilter);
            d.setUTCDate(d.getUTCDate() + 1);
            return d.getTime();
        })() : Infinity;
        
        const lowercasedQuery = searchQuery.toLowerCase().trim();

        return orders.filter(order => {
             if (lowercasedQuery) {
                const searchMatch =
                    order.customerName.toLowerCase().includes(lowercasedQuery) ||
                    order.phone.includes(lowercasedQuery) ||
                    (order.orderNumber && order.orderNumber.toLowerCase().includes(lowercasedQuery)) ||
                    order.address.toLowerCase().includes(lowercasedQuery);
                if (!searchMatch) return false;
            }

            const courierMatch = courierFilter === 'all' || order.courier === courierFilter;
            const zoneMatch = zoneFilter === 'all' || order.zone === zoneFilter;
            const statusMatch = statusFilter === 'all' || order.status === statusFilter;
            const paymentStatusMatch = paymentStatusFilter === 'all' || order.paymentStatus === paymentStatusFilter;
            const dateMatch = order.createdAt >= startTimestamp && order.createdAt < endTimestamp;
            return courierMatch && zoneMatch && statusMatch && paymentStatusMatch && dateMatch;
        });
    }, [orders, searchQuery, courierFilter, zoneFilter, statusFilter, paymentStatusFilter, startDateFilter, endDateFilter]);
    
    const { paginatedOrders, totalPages } = useMemo(() => {
        if (listType !== 'completed') {
            return { paginatedOrders: filteredOrders, totalPages: 1 };
        }
        
        const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);
        const startIndex = (currentPage - 1) * ORDERS_PER_PAGE;
        const paginated = filteredOrders.slice(startIndex, startIndex + ORDERS_PER_PAGE);
        
        return { paginatedOrders: paginated, totalPages };
    }, [filteredOrders, currentPage, listType]);

    const allActionableOrderIds = useMemo(() => 
        filteredOrders
            .filter(o => o.status === OrderStatus.Pending)
            .map(o => o.id), 
        [filteredOrders]
    );
    
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (courierFilter !== 'all') count++;
        if (zoneFilter !== 'all') count++;
        if (paymentStatusFilter !== 'all') count++;
        if (listType === 'active' && statusFilter !== 'all') count++;
        if (startDateFilter) count++;
        if (endDateFilter) count++;
        return count;
    }, [courierFilter, zoneFilter, statusFilter, paymentStatusFilter, listType, startDateFilter, endDateFilter]);

    const handleClearFilters = () => {
        setSearchQuery('');
        setCourierFilter('all');
        setZoneFilter('all');
        setStatusFilter('all');
        setPaymentStatusFilter('all');
        setStartDateFilter('');
        setEndDateFilter('');
        setIsFilterPanelOpen(false);
    };

    const areAllSelected = useMemo(() => 
        allActionableOrderIds.length > 0 && allActionableOrderIds.every(id => selectedOrderIds.has(id)), 
        [allActionableOrderIds, selectedOrderIds]
    );

    const handleSelectAllClick = () => {
        if (areAllSelected) {
            onClearSelection();
        } else {
            onSelectAll(allActionableOrderIds);
        }
    };
    
    const selectedOrders = useMemo(() => 
        orders.filter(o => selectedOrderIds.has(o.id)), 
        [orders, selectedOrderIds]
    );

    const handlePrintSelected = () => {
        onInitiatePrint(selectedOrders);
    };

    const handlePrintSingleOrder = (orderId: string) => {
        const order = orders.find(o => o.id === orderId);
        if (order) {
            onInitiatePrint([order]);
        }
    };
    
    const renderPagination = () => {
        if (listType !== 'completed' || totalPages <= 1) return null;

        const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

        return (
            <div className="flex justify-center items-center mt-4 pt-4 border-t">
                <nav className="flex items-center space-x-2">
                    {pageNumbers.map(number => (
                        <button
                            key={number}
                            onClick={() => setCurrentPage(number)}
                            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${currentPage === number ? 'bg-brand-green text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                            {number}
                        </button>
                    ))}
                </nav>
            </div>
        );
    }

    return (
        <>
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4 border-b pb-2 flex-wrap gap-4">
                 <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-brand-darkgreen flex-shrink-0">Seguimiento de Pedidos</h2>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="search"
                            placeholder="Buscar por nombre, tel, #..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full max-w-xs pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-brand-green focus:border-brand-green sm:text-sm"
                        />
                    </div>
                </div>
                 <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setIsExportModalOpen(true)}
                        className="flex items-center gap-2 text-sm font-semibold py-2 px-4 rounded-md transition-colors bg-gray-200 text-gray-700 hover:bg-gray-300"
                    >
                        <DocumentArrowDownIcon className="w-5 h-5" />
                        Descargar CSV
                    </button>
                     <div className="relative">
                        <button 
                            onClick={() => setIsFilterPanelOpen(prev => !prev)}
                            className={`flex items-center gap-2 text-sm font-semibold py-2 px-4 rounded-md transition-colors ${activeFilterCount > 0 ? 'bg-brand-green text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                            <FilterIcon className="w-5 h-5" />
                            Filtros
                            {activeFilterCount > 0 && (
                                <span className="bg-white text-brand-green text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{activeFilterCount}</span>
                            )}
                        </button>

                        {isFilterPanelOpen && (
                            <div ref={filterPanelRef} className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-2xl border z-20 animate-fade-in-down">
                                <div className="p-4 space-y-4">
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
                                    {listType === 'active' && (
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 block mb-1">Estado Activo</label>
                                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as OrderStatus | 'all')} className="w-full p-2 border rounded-md bg-white text-sm">
                                                <option value="all">Todos</option>
                                                {[OrderStatus.Pending, OrderStatus.Packed, OrderStatus.InTransit].map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                    )}
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
                                <div className="p-2 border-t bg-gray-50 rounded-b-lg">
                                    <button onClick={handleClearFilters} className="w-full text-center text-sm text-brand-green font-semibold hover:underline p-1">
                                        Limpiar Filtros
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {listType === 'active' && (
                <div className="flex items-center gap-3 mb-4 px-1">
                     <input
                        type="checkbox"
                        checked={areAllSelected}
                        onChange={handleSelectAllClick}
                        id="select-all"
                        className="h-5 w-5 rounded border-gray-300 text-brand-green focus:ring-brand-green"
                        disabled={allActionableOrderIds.length === 0}
                    />
                    <label htmlFor="select-all" className="font-semibold text-gray-700">
                        Seleccionar accionables ({allActionableOrderIds.length})
                    </label>
                </div>
            )}

            <div className="max-h-[60vh] overflow-y-auto pr-2 pb-2">
                {isLoading && <p>Cargando pedidos...</p>}
                {!isLoading && filteredOrders.length === 0 && <p className="text-center text-gray-500 py-8">No hay pedidos que coincidan con los filtros.</p>}
                {!isLoading && paginatedOrders.map(order => (
                    <OrderCard 
                        key={order.id} 
                        order={order} 
                        onUpdateStatus={onUpdateStatus}
                        onDeliverOrder={() => {}} // Dummy, not used in central view
                        view={view}
                        isSelected={selectedOrderIds.has(order.id)}
                        onSelect={onSelectOrder}
                        onViewOrder={onViewOrder}
                        onPrintOrder={handlePrintSingleOrder}
                        currentUser={currentUser}
                    />
                ))}
            </div>

            {renderPagination()}

             {selectedOrders.length > 0 && (
                <BulkActionsBar 
                    selectedOrders={selectedOrders}
                    onClear={onClearSelection}
                    onBulkUpdate={onBulkUpdate}
                    onPrint={handlePrintSelected}
                    view={view}
                    currentUser={currentUser}
                />
            )}
        </div>
        
        <ExportCsvModal 
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            allOrders={allOrdersForExport}
        />
        </>
    );
};

export default OrderList;