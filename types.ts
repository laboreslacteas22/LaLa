

export enum CourierName {
    James = 'James',
    Beltran = 'Beltran',
    Ismael = 'Ismael',
}

export enum PaymentMethod {
    Cash = 'Efectivo',
    Wompi = 'Wompi',
    Transfer = 'Transferencia',
}

export enum PaymentStatus {
    Paid = 'Pagado',
    PendingPayment = 'Pendiente de Pago',
}

export enum OrderStatus {
    Pending = 'Pendiente', // Cliente acaba de pedir, pendiente de empacar
    Packed = 'Empacado',   // Listo en bodega para que el domiciliario recoja
    InTransit = 'En Ruta',    // Domiciliario aceptó y va en camino
    Delivered = 'Entregado',
    Cancelled = 'Cancelado',
    Returned = 'Devolución',
}

export enum Zone {
    AreaMetropolitana = 'Área Metropolitana',
    SanAntonio = 'San Antonio y Alrededores',
    Oriente = 'Oriente',
    Bogota = 'Bogotá',
}

export type UserRoleType = 'Logística' | 'Superadmin' | 'Domiciliario';

export interface User {
    id: string; // UID from Firebase Auth
    name: string;
    username: string;
    email: string;
    role: UserRoleType;
    zones?: Zone[];
    courierName?: CourierName; // Para el rol de domiciliario
}

export interface Order {
    id: string;
    orderNumber?: string;
    customerName: string;
    phone: string;
    address: string;
    customerId: string;
    totalValue: number;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    courier: CourierName;
    zone: Zone;
    deliveryCost: number;
    status: OrderStatus;
    createdAt: number; 
    transferReceiptUrl?: string; // Para guardar la URL del comprobante de transferencia
    lineItems: { name: string; quantity: number }[];
}

export interface CourierBalance {
    name: CourierName;
    cashCollected: number; // What the courier owes the company from cash payments
    feesOwed: number;      // What the company owes the courier for deliveries
}

export enum NotificationPriority {
    Low = 'low',
    High = 'high',
}

export interface AppNotification {
    id: string;
    priority: NotificationPriority;
    title: string;
    message: string;
    createdAt: number;
    isRead: boolean;
    isTaskCompleted: boolean; // For high-priority tasks that need action
    relatedId?: string; // e.g., orderId, courierName
    relatedType?: 'order' | 'courierDebt' | 'courierPayment';
    type?: 'success' | 'error' | 'info';
}
