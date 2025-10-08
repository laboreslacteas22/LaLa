
import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { Order, CourierBalance, CourierName, OrderStatus, PaymentMethod, AppNotification, NotificationPriority, User, Zone, UserRoleType } from './types';
import { 
    onOrdersSnapshot, 
    onBalancesSnapshot, 
    onUsersSnapshot, 
    createUser as apiCreateUser,
    deleteUser as apiDeleteUser, 
    updateOrderStatus as apiUpdateOrderStatus, 
    deliverOrder as apiDeliverOrder, 
    settleCourierCash as apiSettleCourierCash, 
    payCourierFees as apiPayCourierFees, 
    submitCourierDeposit as apiSubmitCourierDeposit, 
    addMultipleOrders as apiAddMultipleOrders,
    onAuthStateChangedListener,
    getUserProfile,
    signOutUser,
    areAnyUsersRegistered,
    createUserProfile,
    sendPasswordReset,
    updateUserProfile as apiUpdateUserProfile,
    updateUserPassword as apiUpdateUserPassword
} from './services/firebaseService';
import Header from './components/Header';
import BalanceSummary from './components/BalanceSummary';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import { ToastContainer, Toast } from './components/Toast';
import NotificationPanel from './components/NotificationPanel';
import UserManagement from './components/UserManagement';
import { ZONE_TO_COURIER_MAP } from './constants';
import Spinner from './components/Spinner';
import FirstTimeSetup from './components/FirstTimeSetup';

// Lazy load components for better initial performance
const OrderList = React.lazy(() => import('./components/OrderList'));
const OrderDetailView = React.lazy(() => import('./components/OrderDetailView'));
const PrintGuide = React.lazy(() => import('./components/PrintGuide'));
const IntegrationsPage = React.lazy(() => import('./components/IntegrationsPage'));
const CourierView = React.lazy(() => import('./components/CourierView'));
const ChangePasswordModal = React.lazy(() => import('./components/ChangePasswordModal'));


type OrderTab = 'active' | 'completed' | 'cancelled';
type CentralView = 'pedidos' | 'dashboard' | 'liquidaciones' | 'gestion-usuarios' | 'integrations';

const App: React.FC = () => {
    // Auth State
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [needsFirstTimeSetup, setNeedsFirstTimeSetup] = useState(false);

    // App State
    const [orders, setOrders] = useState<Order[]>([]);
    const [balances, setBalances] = useState<Record<string, CourierBalance>>({});
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [centralView, setCentralView] = useState<CentralView>('pedidos');
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
    const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
    const [activeOrderTab, setActiveOrderTab] = useState<OrderTab>('active');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
    const [newlyCompletedCount, setNewlyCompletedCount] = useState(0);
    const [ordersToPrint, setOrdersToPrint] = useState<Order[]>([]);
    
    // Notification State
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [toasts, setToasts] = useState<AppNotification[]>([]);
    const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
    const [notificationPermission, setNotificationPermission] = useState<'granted' | 'denied' | 'default'>('default');

    const activeOrderTabRef = useRef(activeOrderTab);
    activeOrderTabRef.current = activeOrderTab;
    const prevIsNotificationPanelOpen = useRef(isNotificationPanelOpen);

    const addToast = useCallback((toastData: Omit<AppNotification, 'id' | 'createdAt' | 'isRead' | 'isTaskCompleted'>) => {
        const newToast: AppNotification = {
            ...toastData,
            id: `toast-${Date.now()}-${Math.random()}`,
            createdAt: Date.now(),
            isRead: true, 
            isTaskCompleted: true, 
        };
        setToasts(prev => [newToast, ...prev]);
    }, []);

    // Auth Effect
    useEffect(() => {
        const unsubscribe = onAuthStateChangedListener(async (authUser) => {
            if (authUser) {
                let userProfile = await getUserProfile(authUser.uid);
                
                if (!userProfile) {
                    if (authUser.email) {
                        console.warn("No user profile found for authenticated user. Creating a Superadmin profile for them.");
                        const newProfile: Omit<User, 'id' | 'zones' | 'courierName'> = {
                            name: authUser.email.split('@')[0],
                            username: authUser.email.split('@')[0],
                            email: authUser.email,
                            role: 'Superadmin',
                        };
                        try {
                           await createUserProfile(authUser.uid, newProfile);
                           userProfile = await getUserProfile(authUser.uid);
                        } catch (error) {
                            console.error("Failed to create automatic superadmin profile:", error);
                        }
                    }
                }

                if (userProfile) {
                    setCurrentUser(userProfile);
                    setCentralView('pedidos'); // Force default view to 'pedidos' on login
                } else {
                    console.error("Authenticated user has no profile in Firestore. Logging out.");
                    await signOutUser();
                    setCurrentUser(null);
                }
            } else {
                const anyUsersExist = await areAnyUsersRegistered();
                if (!anyUsersExist) {
                    setNeedsFirstTimeSetup(true);
                }
                setCurrentUser(null);
            }
            setIsAuthLoading(false);
        });
        return unsubscribe;
    }, []);

    // When role changes, if the current view is not allowed, switch to a default one.
    useEffect(() => {
        if (currentUser?.role === 'Logística' && (centralView === 'gestion-usuarios' || centralView === 'integrations')) {
            setCentralView('pedidos');
        }
    }, [currentUser, centralView]);

     useEffect(() => {
        if ('Notification' in window) {
            setNotificationPermission(Notification.permission);
        }
    }, []);

    const requestNotificationPermission = useCallback(() => {
        if ('Notification' in window && notificationPermission === 'default') {
            Notification.requestPermission().then(setNotificationPermission);
        }
    }, [notificationPermission]);
    
     const showBrowserNotification = useCallback((notification: AppNotification) => {
        if (notificationPermission === 'granted') {
            new Notification(notification.title, {
                body: notification.message,
                tag: notification.id,
            });
        }
    }, [notificationPermission]);

    const addNotification = useCallback((notification: Omit<AppNotification, 'id' | 'createdAt' | 'isRead' | 'isTaskCompleted'>) => {
        const newNotification: AppNotification = {
            ...notification,
            id: `notif-${Date.now()}-${Math.random()}`,
            createdAt: Date.now(),
            isRead: false,
            isTaskCompleted: false,
            type: notification.type || 'info',
        };

        setNotifications(prev => [newNotification, ...prev]);

        if (newNotification.priority === NotificationPriority.High) {
             addToast(newNotification);
            showBrowserNotification(newNotification);
        }
    }, [showBrowserNotification, addToast]);
    
    // Notification Engine
    useEffect(() => {
        const checkNotifications = () => {
            const now = Date.now();
            const hoursAgo = (h: number) => now - h * 60 * 60 * 1000;
            const today = new Date();
            const dayOfMonth = today.getDate();

            orders.forEach(order => {
                if (order.status !== OrderStatus.Pending) return;
                const existingNotif = notifications.find(n => n.relatedId === order.id && n.relatedType === 'order');

                if (order.createdAt < hoursAgo(72) && (!existingNotif || existingNotif.message.includes('48'))) {
                    if(existingNotif) setNotifications(prev => prev.filter(n => n.id !== existingNotif.id));
                    addNotification({ priority: NotificationPriority.High, title: 'Pedido Críticamente Atrasado', message: `El pedido de ${order.customerName} lleva más de 72h sin empacar.`, relatedId: order.id, relatedType: 'order', type: 'error'});
                } else if (order.createdAt < hoursAgo(48) && (!existingNotif || existingNotif.message.includes('24'))) {
                     if(existingNotif) setNotifications(prev => prev.filter(n => n.id !== existingNotif.id));
                    addNotification({ priority: NotificationPriority.Low, title: 'Pedido Muy Atrasado', message: `El pedido de ${order.customerName} lleva más de 48h sin empacar.`, relatedId: order.id, relatedType: 'order'});
                } else if (order.createdAt < hoursAgo(24) && !existingNotif) {
                    addNotification({ priority: NotificationPriority.Low, title: 'Pedido Atrasado', message: `El pedido de ${order.customerName} lleva más de 24h sin empacar.`, relatedId: order.id, relatedType: 'order'});
                }
            });

            Object.values(balances).forEach((balance: CourierBalance) => {
                if (balance.cashCollected <= 0) return;
                 const existingNotif = notifications.find(n => n.relatedId === balance.name && n.relatedType === 'courierDebt');

                if (!existingNotif) {
                    addNotification({ priority: NotificationPriority.Low, title: 'Deuda de Domiciliario', message: `${balance.name} tiene un saldo de efectivo por consignar.`, relatedId: balance.name, relatedType: 'courierDebt'});
                }
            });

            if ((dayOfMonth === 15 || dayOfMonth === 30) && currentUser?.role === 'Superadmin') {
                 const notifId = `payment-reminder-${today.getFullYear()}-${today.getMonth()}-${dayOfMonth}`;
                 if (!notifications.find(n => n.id === notifId)) {
                    addNotification({ priority: NotificationPriority.High, title: 'Recordatorio de Pago', message: `Hoy es día de pago. Recuerda liquidar los domicilios pendientes.`, id: notifId } as any);
                 }
            }
        };

        const intervalId = setInterval(checkNotifications, 60 * 1000); // Check every minute
        return () => clearInterval(intervalId);
    }, [orders, balances, notifications, addNotification, currentUser]);

    useEffect(() => {
        requestNotificationPermission();

        const unsubscribeUsers = onUsersSnapshot((allUsers) => {
            setUsers(allUsers);
        });

        const unsubscribeOrders = onOrdersSnapshot((newOrders) => {
            setOrders(currentOrders => {
                if (isLoading) return newOrders;
                
                newOrders.forEach(newOrder => {
                    const oldOrder = currentOrders.find(o => o.id === newOrder.id);
                    if (!oldOrder) {
                        // This notification is now handled by the import functions for better context
                        // addNotification({ priority: NotificationPriority.Low, title: 'Nuevo Pedido', message: `Ha entrado un nuevo pedido para ${newOrder.customerName}.`, type: 'info' });
                    } else {
                        if (newOrder.status === OrderStatus.Cancelled && oldOrder.status !== OrderStatus.Cancelled) {
                             addNotification({ priority: NotificationPriority.High, title: 'Pedido Cancelado', message: `El pedido de ${newOrder.customerName} ha sido cancelado.`, relatedId: newOrder.id, relatedType: 'order', type: 'error' });
                        }
                        if (newOrder.status === OrderStatus.Delivered && oldOrder.status !== OrderStatus.Delivered) {
                             addNotification({ priority: NotificationPriority.Low, title: 'Pedido Entregado', message: `El pedido de ${newOrder.customerName} fue entregado por ${newOrder.courier}.`, type: 'success' });
                        }
                    }
                });

                 if (currentOrders.length > 0 && activeOrderTabRef.current !== 'completed') {
                    const newlyCompleted = newOrders.filter(newOrder => {
                        if (!currentOrders.find(o => o.id === newOrder.id)) return false;
                        const isNowComplete = [OrderStatus.Delivered, OrderStatus.Returned].includes(newOrder.status);
                        const wasNotComplete = ![OrderStatus.Delivered, OrderStatus.Returned].includes(currentOrders.find(o=>o.id === newOrder.id)!.status);
                        return isNowComplete && wasNotComplete;
                    });
                    
                    if (newlyCompleted.length > 0) {
                         setNewlyCompletedCount(prev => prev + newlyCompleted.length);
                    }
                }
                return newOrders;
            });
            setIsLoading(false);
        });

        const unsubscribeBalances = onBalancesSnapshot((newBalances) => {
            setBalances(newBalances);
        });

        return () => {
            unsubscribeOrders();
            unsubscribeBalances();
            unsubscribeUsers();
        };
    }, [isLoading, addNotification, requestNotificationPermission]);
    
    useEffect(() => {
        setSelectedOrderIds(new Set());
    }, [activeOrderTab, centralView, currentUser]);
    
    const handleTaskCompleted = useCallback((relatedType: 'order' | 'courierDebt', relatedId: string | CourierName) => {
        setNotifications(prev => prev.map(n => 
            (n.relatedId === relatedId && n.relatedType === relatedType) 
            ? { ...n, isTaskCompleted: true } 
            : n
        ));
    }, []);

    const handleUpdateStatus = useCallback(async (orderId: string, status: OrderStatus) => {
        try {
            await apiUpdateOrderStatus(orderId, status);
            addToast({ title: 'Estado Actualizado', message: `El pedido ahora está como "${status}".`, type: 'success', priority: NotificationPriority.Low });
            if (status === OrderStatus.Packed || status === OrderStatus.Cancelled) {
                handleTaskCompleted('order', orderId);
            }
            if (viewingOrder && viewingOrder.id === orderId) {
                const updatedOrder = orders.find(o => o.id === orderId);
                setViewingOrder(prev => updatedOrder ? { ...prev, ...updatedOrder, status: status } : null);
            }
        } catch (error) {
            console.error("Error updating order status:", error);
            let errorMessage = "Ocurrió un error desconocido.";
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            addToast({ title: 'Error al Actualizar', message: `No se pudo actualizar el estado: ${errorMessage}`, type: 'error', priority: NotificationPriority.High });
        }
    }, [orders, viewingOrder, handleTaskCompleted, addToast]);
    
    const handleDeliverOrder = useCallback(async (orderId: string, paymentInfo: { method: PaymentMethod.Cash | PaymentMethod.Transfer; receiptUrl?: string }) => {
        try {
            await apiDeliverOrder(orderId, paymentInfo);
            addToast({ title: 'Entrega Registrada', message: 'El pedido ha sido marcado como entregado.', type: 'success', priority: NotificationPriority.Low });
            if (viewingOrder && viewingOrder.id === orderId) {
                 setTimeout(() => setViewingOrder(null), 500);
            }
        } catch (error) {
            console.error("Error delivering order:", error);
            let errorMessage = "Ocurrió un error desconocido.";
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            addToast({ title: 'Error al Entregar', message: `No se pudo registrar la entrega: ${errorMessage}`, type: 'error', priority: NotificationPriority.High });
        }
    }, [viewingOrder, addToast]);

    const handleBulkUpdateStatus = useCallback(async (status: OrderStatus) => {
        const idsToUpdate = Array.from(selectedOrderIds);
        const promises = idsToUpdate.map(id => apiUpdateOrderStatus(id, status));
        try {
            await Promise.all(promises);
            if (status === OrderStatus.Packed || status === OrderStatus.Cancelled) {
                selectedOrderIds.forEach(id => handleTaskCompleted('order', id));
            }
            setSelectedOrderIds(new Set());
            addToast({ title: 'Acción Masiva Completa', message: `${idsToUpdate.length} pedidos actualizados a "${status}".`, type: 'success', priority: NotificationPriority.Low });
        } catch (error) {
            console.error("Error updating bulk order status:", error);
            let errorMessage = "Ocurrió un error desconocido.";
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            addToast({ title: 'Error en Acción Masiva', message: `No se pudieron actualizar los pedidos: ${errorMessage}`, type: 'error', priority: NotificationPriority.High });
        }
    }, [selectedOrderIds, handleTaskCompleted, addToast]);

    const handleSettleCourierCash = useCallback(async (courierName: CourierName) => {
        try {
            await apiSettleCourierCash(courierName);
            handleTaskCompleted('courierDebt', courierName);
            addToast({ title: 'Liquidación Registrada', message: `El efectivo de ${courierName} ha sido marcado como consignado.`, type: 'success', priority: NotificationPriority.Low });
        } catch (error) {
            console.error("Error settling courier cash:", error);
            let errorMessage = "Ocurrió un error desconocido.";
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            addToast({ title: 'Error de Liquidación', message: `No se pudo registrar el pago: ${errorMessage}`, type: 'error', priority: NotificationPriority.High });
        }
    }, [handleTaskCompleted, addToast]);

    const handlePayCourierFees = useCallback(async (courierName: CourierName) => {
        try {
            await apiPayCourierFees(courierName);
            addToast({ title: 'Pago Registrado', message: `Se ha registrado el pago de domicilios a ${courierName}.`, type: 'success', priority: NotificationPriority.Low });
        } catch (error) {
            console.error("Error paying courier fees:", error);
            let errorMessage = "Ocurrió un error desconocido.";
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            addToast({ title: 'Error de Pago', message: `No se pudo pagar al domiciliario: ${errorMessage}`, type: 'error', priority: NotificationPriority.High });
        }
    }, [addToast]);

    const handleCourierDeposit = useCallback(async (courierName: CourierName, receiptFile: File) => {
        try {
            await apiSubmitCourierDeposit(courierName, receiptFile);
            addToast({ title: 'Comprobante Enviado', message: 'Tu comprobante fue enviado para verificación.', type: 'success', priority: NotificationPriority.Low });
        } 
        catch (error) {
            // FIX: The 'error' object in a catch block is of type 'unknown'. We must check if it's an instance of Error before using its 'message' property to prevent a type error.
            console.error("Error submitting courier deposit:", error);
            const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
            addToast({ title: 'Error al Enviar', message: `No se pudo enviar el comprobante: ${errorMessage}`, type: 'error', priority: NotificationPriority.High });
            throw new Error(errorMessage);
        }
    }, [addToast]);

    const handleImportMultipleOrders = useCallback(async (newOrders: Order[], source: 'auto' | 'manual') => {
        if (newOrders.length === 0) {
            if (source === 'manual') {
                addToast({ title: 'Sin Novedades', message: 'No se encontraron nuevos pedidos para importar.', type: 'info', priority: NotificationPriority.Low });
            }
            return;
        }
        try {
            await apiAddMultipleOrders(newOrders);
            const title = source === 'auto' ? 'Sincronización Automática' : 'Importación Manual Exitosa';
            const message = `${newOrders.length} nuevo(s) pedido(s) importado(s).`;
            addToast({ title, message, type: 'success', priority: NotificationPriority.Low });
            addNotification({ title, message, type: 'success', priority: NotificationPriority.Low });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
            addToast({ title: 'Error de Importación', message: `No se pudieron guardar los pedidos: ${errorMessage}`, type: 'error', priority: NotificationPriority.High });
        }
    }, [addToast, addNotification]);

    const handleViewOrder = (orderId: string) => {
        const order = orders.find(o => o.id === orderId);
        if (order) {
            setViewingOrder(order);
        }
    };
    
    const handleInitiatePrint = (ordersForPrinting: Order[]) => {
        setOrdersToPrint(ordersForPrinting);
    };

    const handleCloseOrderDetail = () => {
        setViewingOrder(null);
    };

    const handleSelectOrder = (orderId: string) => {
        setSelectedOrderIds(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(orderId)) {
                newSelection.delete(orderId);
            } else {
                newSelection.add(orderId);
            }
            return newSelection;
        });
    };
    
    const handleSelectAll = (orderIds: string[]) => {
        setSelectedOrderIds(new Set(orderIds));
    };

    const handleClearSelection = () => {
        setSelectedOrderIds(new Set());
    };

    const handleLogout = async () => {
        try {
            await signOutUser();
        } catch (error) {
            console.error("Error signing out:", error);
            addToast({ title: 'Error', message: 'No se pudo cerrar la sesión.', type: 'error', priority: NotificationPriority.High });
        }
    };
    
    const handleChangePassword = () => {
        setIsChangePasswordModalOpen(true);
    };

    const handleUpdatePassword = async (currentPassword: string, newPassword: string) => {
        try {
            await apiUpdateUserPassword(currentPassword, newPassword);
            addToast({ title: 'Éxito', message: 'Tu contraseña ha sido actualizada.', type: 'success', priority: NotificationPriority.Low });
            setIsChangePasswordModalOpen(false);
        } catch (error) {
            // Re-throw the error so the modal can catch it and display it internally.
            throw error;
        }
    };

    const handleCreateUser = async (userData: { email: string; password: string; name: string; username: string; role: UserRoleType; zones?: Zone[], courierName?: CourierName }) => {
        try {
            await apiCreateUser(userData);
            addToast({ title: 'Usuario Creado', message: `${userData.name} ha sido añadido.`, type: 'success', priority: NotificationPriority.Low });
        } catch (error) {
            console.error("Error creating user:", error);
            let errorMessage = "Hubo un error al crear el usuario.";
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            addToast({ title: 'Error', message: errorMessage, type: 'error', priority: NotificationPriority.High });
            throw new Error(errorMessage);
        }
    };
    
    const handleUpdateUser = async (userId: string, userData: Partial<Omit<User, 'id' | 'email'>>) => {
        try {
            await apiUpdateUserProfile(userId, userData);
             addToast({ title: 'Usuario Actualizado', message: 'Los datos del usuario han sido actualizados.', type: 'success', priority: NotificationPriority.Low });
        } catch (error) {
            console.error("Error updating user:", error);
             let errorMessage = "Hubo un error al actualizar el usuario.";
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            addToast({ title: 'Error', message: errorMessage, type: 'error', priority: NotificationPriority.High });
            throw new Error(errorMessage);
        }
    }

    const handleDeleteUser = async (userId: string) => {
        try {
            await apiDeleteUser(userId);
            addToast({ title: 'Usuario Eliminado', message: `El usuario ha sido eliminado.`, type: 'success', priority: NotificationPriority.Low });
        } catch (error) {
            console.error("Error deleting user:", error);
            let errorMessage = "Hubo un error al eliminar el usuario.";
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            addToast({ title: 'Error', message: errorMessage, type: 'error', priority: NotificationPriority.High });
        }
    };

    const setActiveOrderTabWithReset = (tab: OrderTab) => {
        if (tab === 'completed') {
            setNewlyCompletedCount(0);
        }
        setActiveOrderTab(tab);
    };
    
    const handleNotificationPanelToggle = useCallback(() => {
        setIsNotificationPanelOpen(prev => !prev);
    }, []);
    
    useEffect(() => {
        if (isNotificationPanelOpen && !prevIsNotificationPanelOpen.current) {
            setNotifications(currentNotifs =>
                currentNotifs.map(n =>
                    !n.isRead ? { ...n, isRead: true } : n
                )
            );
        }
        prevIsNotificationPanelOpen.current = isNotificationPanelOpen;
    }, [isNotificationPanelOpen]);

    const handleClearAllNotifications = useCallback(() => {
        setNotifications(prev => prev.filter(n => !n.isRead || (n.priority === NotificationPriority.High && !n.isTaskCompleted)));
    }, []);

    const notificationsForUser = useMemo(() => {
        if (!currentUser) return [];
        if (currentUser.role === 'Superadmin') {
            return notifications;
        }

        const allowedZones = currentUser.zones || [];
        const allowedCouriers = Object.entries(ZONE_TO_COURIER_MAP)
            .filter(([zone]) => allowedZones.includes(zone as Zone))
            .map(([, courier]) => courier);
        const uniqueAllowedCouriers = [...new Set(allowedCouriers)];

        return notifications.filter(n => {
            if (!n.relatedType || !n.relatedId) {
                return true; 
            }
            if (n.relatedType === 'order') {
                const order = orders.find(o => o.id === n.relatedId);
                return order ? allowedZones.includes(order.zone) : false;
            }
            if (n.relatedType === 'courierDebt') {
                return uniqueAllowedCouriers.includes(n.relatedId as CourierName);
            }
            return true;
        });
    }, [notifications, currentUser, orders]);

    const unreadNotificationCount = useMemo(() => {
        return notificationsForUser.filter(n => !n.isRead).length;
    }, [notificationsForUser]);
    
    const handleNotificationClick = (notification: AppNotification) => {
        setIsNotificationPanelOpen(false); 

        switch(notification.relatedType) {
            case 'order':
                if(notification.relatedId) {
                    const order = orders.find(o => o.id === notification.relatedId);
                    if(order) {
                        setCentralView('pedidos');
                        setViewingOrder(order);
                    }
                }
                break;
            case 'courierDebt':
                setCentralView('liquidaciones');
                break;
            default:
                break;
        }
    };


    const ordersForUser = useMemo(() => {
        if (!currentUser) return [];
        if (currentUser.role === 'Superadmin') return orders;
        
        const allowedZones = currentUser.zones || [];
        return orders.filter(order => allowedZones.includes(order.zone));
    }, [orders, currentUser]);

    const balancesForUser = useMemo(() => {
        if (!currentUser) return {};
        if (currentUser.role === 'Superadmin') return balances;

        const allowedZones = currentUser.zones || [];
        
        const allowedCouriers = Object.entries(ZONE_TO_COURIER_MAP)
            .filter(([zone]) => allowedZones.includes(zone as Zone))
            .map(([, courier]) => courier);
        
        const uniqueCouriers = [...new Set(allowedCouriers)];
        
        const filteredEntries = Object.entries(balances)
            .filter(([courierName]: [string, any]) => uniqueCouriers.includes(courierName as CourierName));

        return Object.fromEntries(filteredEntries);

    }, [balances, currentUser]);
    
    const courierData = useMemo(() => {
        if (currentUser?.role !== 'Domiciliario' || !currentUser.courierName) {
            return null;
        }
        const courierName = currentUser.courierName;
        return {
            name: courierName,
            orders: orders.filter(o => o.courier === courierName),
            balance: balances[courierName] || { name: courierName, cashCollected: 0, feesOwed: 0 },
        };
      }, [currentUser, orders, balances]);


    const filteredOrdersByTab = useMemo(() => {
        const sortedOrders = [...ordersForUser].sort((a, b) => b.createdAt - a.createdAt);

        switch (activeOrderTab) {
            case 'completed':
                return sortedOrders.filter(o => [OrderStatus.Delivered, OrderStatus.Returned].includes(o.status));
            case 'cancelled':
                return sortedOrders.filter(o => o.status === OrderStatus.Cancelled);
            case 'active':
            default:
                return sortedOrders.filter(o => ![OrderStatus.Delivered, OrderStatus.Returned, OrderStatus.Cancelled].includes(o.status));
        }
    }, [ordersForUser, activeOrderTab]);

    const renderCentralContent = () => {
        if (!currentUser) return null;
        const deniedMessage = <div className="text-center p-8 bg-yellow-100 text-yellow-800 rounded-lg">Acceso denegado. Tu rol no tiene permisos para ver esta sección.</div>;

        switch (centralView) {
            case 'dashboard':
                return <Dashboard orders={ordersForUser} />;
            case 'liquidaciones':
                return <BalanceSummary 
                    balances={balancesForUser} 
                    orders={ordersForUser}
                    onSettleCourierCash={handleSettleCourierCash}
                    onPayCourierFees={handlePayCourierFees}
                />;
            case 'gestion-usuarios':
                if (currentUser.role !== 'Superadmin') return deniedMessage;
                return <UserManagement 
                            users={users} 
                            onCreateUser={handleCreateUser} 
                            onUpdateUser={handleUpdateUser}
                            onDeleteUser={handleDeleteUser} 
                            addToast={addToast}
                       />;
            case 'integrations':
                 if (currentUser.role !== 'Superadmin') return deniedMessage;
                 return <IntegrationsPage allOrders={orders} onImportMultipleOrders={handleImportMultipleOrders} addToast={addToast} />;
            case 'pedidos':
            default:
                return (
                     <div>
                        <div className="mb-4 flex border-b border-gray-200">
                            {(['active', 'completed', 'cancelled'] as OrderTab[]).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveOrderTabWithReset(tab)}
                                    className={`py-2 px-4 font-semibold text-sm capitalize transition-colors flex items-center ${activeOrderTab === tab ? 'border-b-2 border-brand-green text-brand-green' : 'text-gray-500 hover:text-gray-800'}`}
                                >
                                    {tab === 'active' ? 'Activos' : tab === 'completed' ? 'Completados' : 'Cancelados'}
                                    {tab === 'completed' && newlyCompletedCount > 0 && (
                                        <span className="ml-2 bg-red-500 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                                            {newlyCompletedCount}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <OrderList 
                            orders={filteredOrdersByTab}
                            allOrdersForExport={ordersForUser}
                            onUpdateStatus={handleUpdateStatus} 
                            isLoading={isLoading}
                            view="central"
                            listType={activeOrderTab}
                            selectedOrderIds={selectedOrderIds}
                            onSelectOrder={handleSelectOrder}
                            onBulkUpdate={handleBulkUpdateStatus}
                            onSelectAll={handleSelectAll}
                            onClearSelection={handleClearSelection}
                            onViewOrder={handleViewOrder}
                            onInitiatePrint={handleInitiatePrint}
                            currentUser={currentUser}
                        />
                    </div>
                );
        }
    };
    
    if (isAuthLoading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-brand-bg">
                <Spinner />
            </div>
        );
    }

    if (needsFirstTimeSetup) {
        return <FirstTimeSetup onCreateAdmin={handleCreateUser} />;
    }

    if (!currentUser) {
        return <Login addToast={addToast} />;
    }
    
    if (currentUser.role === 'Domiciliario') {
         if (!courierData) {
            return (
                <div className="fixed inset-0 flex items-center justify-center bg-brand-bg flex-col gap-4 p-4 text-center">
                    <h2 className="text-xl font-bold text-red-600">Error de Configuración</h2>
                    <p className="text-gray-700">Tu cuenta de domiciliario no está asignada a un perfil de repartidor. Por favor, contacta a un administrador para que solucione el problema.</p>
                     <button onClick={handleLogout} className="bg-brand-green text-white font-semibold py-2 px-4 rounded-md">Cerrar Sesión</button>
                </div>
            );
        }
        return (
            <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-brand-bg"><Spinner /></div>}>
                <CourierView 
                    courierName={courierData.name}
                    orders={courierData.orders}
                    balance={courierData.balance}
                    onUpdateStatus={handleUpdateStatus}
                    onDeliverOrder={handleDeliverOrder}
                    onLogout={handleLogout}
                    selectedOrderIds={selectedOrderIds}
                    onSelectOrder={handleSelectOrder}
                    onBulkUpdate={handleBulkUpdateStatus}
                    onSelectAll={handleSelectAll}
                    onClearSelection={handleClearSelection}
                    onViewOrder={handleViewOrder}
                    onSubmitDeposit={handleCourierDeposit}
                />
                {viewingOrder && (
                     <OrderDetailView
                        order={viewingOrder}
                        onClose={handleCloseOrderDetail}
                        onUpdateStatus={handleUpdateStatus}
                        onDeliverOrder={handleDeliverOrder}
                        view={'courier'}
                        currentUser={currentUser}
                    />
                )}
            </Suspense>
        )
    }


    return (
        <>
            <ToastContainer>
                {toasts.map(toast => (
                    <Toast 
                        key={toast.id}
                        notification={toast}
                        onDismiss={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                    />
                ))}
            </ToastContainer>
            <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-white/50 z-[100]"><Spinner /></div>}>
                 <div className="relative min-h-screen bg-brand-bg font-sans lg:flex">
                    <Sidebar 
                        centralView={centralView}
                        onSwitchCentralView={setCentralView}
                        isOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                        currentUser={currentUser}
                    />
                    <main className="flex-1">
                         <Header 
                            onMenuClick={() => setIsSidebarOpen(true)}
                            unreadNotificationCount={unreadNotificationCount}
                            onNotificationClick={handleNotificationPanelToggle}
                            currentUser={currentUser}
                            onLogout={handleLogout}
                            onChangePassword={handleChangePassword}
                        />
                        <div className="p-4 lg:p-8">
                            <div className="mt-8">
                                {renderCentralContent()}
                            </div>
                        </div>
                    </main>
                </div>
                {isNotificationPanelOpen && (
                    <NotificationPanel 
                        notifications={notificationsForUser}
                        onClose={() => setIsNotificationPanelOpen(false)}
                        onClearAll={handleClearAllNotifications}
                        onNotificationClick={handleNotificationClick}
                    />
                )}
                {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
                {viewingOrder && (
                     <OrderDetailView
                        order={viewingOrder}
                        onClose={handleCloseOrderDetail}
                        onUpdateStatus={handleUpdateStatus}
                        onDeliverOrder={handleDeliverOrder}
                        view={'central'}
                        currentUser={currentUser}
                    />
                )}
                {ordersToPrint.length > 0 && (
                    <PrintGuide orders={ordersToPrint} onClose={() => setOrdersToPrint([])} />
                )}
                {isChangePasswordModalOpen && (
                    <ChangePasswordModal
                        onClose={() => setIsChangePasswordModalOpen(false)}
                        onSubmit={handleUpdatePassword}
                    />
                )}
            </Suspense>
        </>
    );
};

export default App;