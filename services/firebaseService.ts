

import { initializeApp } from "firebase/app";
import { 
    getFirestore, 
    collection, 
    onSnapshot, 
    doc, 
    updateDoc, 
    runTransaction,
    addDoc,
    deleteDoc,
    query,
    orderBy,
    writeBatch,
    setDoc,
    getDoc,
    where,
    getDocs,
    limit
} from "firebase/firestore";
import { 
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    type User as AuthUser,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword,
} from "firebase/auth";
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "firebase/storage";
import { Order, CourierBalance, OrderStatus, CourierName, PaymentMethod, Zone, PaymentStatus, User, UserRoleType } from '../types';
import { ZONE_TO_COURIER_MAP, DELIVERY_COSTS } from '../constants';

// Tu configuración de Firebase
// @ts-ignore
const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY,
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID,
  measurementId: (import.meta as any).env.VITE_FIREBASE_MEASUREMENT_ID
};


// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Fix: Defined collection references. These were undefined, causing errors in snapshot listeners.
const usersCollection = collection(db, 'users');
const ordersCollection = collection(db, 'orders');
const balancesCollection = collection(db, 'balances');

// --- GESTIÓN DE AUTENTICACIÓN ---
export const onAuthStateChangedListener = (callback: (user: AuthUser | null) => void) => onAuthStateChanged(auth, callback);

export const signInUser = async (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
};

export const signOutUser = () => signOut(auth);

export const sendPasswordReset = (email: string) => sendPasswordResetEmail(auth, email);

export const updateUserPassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user || !user.email) {
        throw new Error("No hay un usuario autenticado.");
    }

    const credential = EmailAuthProvider.credential(user.email, currentPassword);

    try {
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
    } catch (error: any) {
        console.error("Error al actualizar contraseña:", error.code);
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            throw new Error("La contraseña actual es incorrecta.");
        }
        if (error.code === 'auth/weak-password') {
            throw new Error("La nueva contraseña es demasiado débil. Debe tener al menos 6 caracteres.");
        }
        throw new Error("Ocurrió un error al actualizar la contraseña. Inténtalo de nuevo.");
    }
};

export const getUserProfile = async (uid: string): Promise<User | null> => {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        return { id: userDocSnap.id, ...data } as User;
    }
    return null;
};


// --- GESTIÓN DE USUARIOS ---
export const onUsersSnapshot = (callback: (users: User[]) => void): (() => void) => {
    const q = query(usersCollection, orderBy('name'));
    return onSnapshot(q, (snapshot) => {
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        callback(users);
    }, (error) => console.error("Error al obtener usuarios: ", error));
};

export const areAnyUsersRegistered = async (): Promise<boolean> => {
    const q = query(usersCollection, limit(1));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
};

export const createUserProfile = async (uid: string, profileData: Omit<User, 'id' | 'zones' | 'courierName'>): Promise<void> => {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, profileData);
};


export const createUser = async (userData: { email: string; password: string; name: string; username: string; role: UserRoleType; zones?: Zone[]; courierName?: CourierName; }): Promise<void> => {
    const { email, password, name, username, role, zones, courierName } = userData;
    
    try {
        const usernameQuery = query(usersCollection, where("username", "==", username));
        const usernameSnapshot = await getDocs(usernameQuery);
        if (!usernameSnapshot.empty) {
            throw new Error(`El nombre de usuario "${username}" ya está en uso.`);
        }
    } catch (error) {
        console.error("Error checking username uniqueness:", error);
        throw new Error("No se pudo verificar el nombre de usuario. Revisa los permisos de la base de datos.");
    }
    
    let authUser: AuthUser;
    try {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        authUser = user;
    } catch (error: any) {
        console.error("Error creating auth user:", error);
        if (error.code === 'auth/email-already-in-use') {
            throw new Error('El correo electrónico ya está registrado.');
        }
        throw new Error('No se pudo crear la cuenta de autenticación.');
    }
    
    try {
        const userDocRef = doc(db, 'users', authUser.uid);
        const userProfile: { name: string, email: string, username: string, role: UserRoleType, zones?: Zone[], courierName?: CourierName } = {
            name,
            email,
            username,
            role,
        };
        if (role === 'Logística') {
            userProfile.zones = zones || [];
        }
        if (role === 'Domiciliario') {
            userProfile.courierName = courierName;
        }
        await setDoc(userDocRef, userProfile);
    } catch (error) {
        console.error("Error creating user profile in Firestore:", error);
        throw new Error("Se creó la cuenta, pero no se pudo guardar el perfil. Contacta al administrador.");
    }
};

export const updateUserProfile = async (userId: string, profileData: Partial<Omit<User, 'id' | 'email'>>): Promise<void> => {
    const userDocRef = doc(db, 'users', userId);
    // Note: This only updates Firestore. The email in Firebase Auth is not updated
    // as it requires more complex handling (re-authentication) or server-side logic.
    await updateDoc(userDocRef, profileData);
};


export const deleteUser = async (userId: string): Promise<void> => {
    // Nota: Esto solo elimina el registro de Firestore, no el usuario de Firebase Auth.
    // Eliminar usuarios de Auth requiere el SDK de administrador, que no está disponible en el lado del cliente.
    const userDoc = doc(db, 'users', userId);
    await deleteDoc(userDoc);
};


// --- OBTENCIÓN DE DATOS EN TIEMPO REAL ---
export const onOrdersSnapshot = (callback: (orders: Order[]) => void): (() => void) => {
    const q = query(ordersCollection, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        callback(orders);
    }, (error) => console.error("Error al obtener pedidos: ", error));
};

export const onBalancesSnapshot = (callback: (balances: Record<string, CourierBalance>) => void): (() => void) => {
    return onSnapshot(balancesCollection, (snapshot) => {
        const balances: Record<string, CourierBalance> = {};
        snapshot.docs.forEach(doc => {
            balances[doc.id] = { name: doc.id as CourierName, ...doc.data() } as CourierBalance;
        });
        callback(balances);
    }, (error) => console.error("Error al obtener saldos: ", error));
};

// --- LÓGICA DE ACTUALIZACIÓN DE SALDOS (TRANSACCIONAL) ---
const performSettlement = async (transaction: any, order: Order) => {
    const balanceDocRef = doc(db, 'balances', order.courier);
    const balanceDoc = await transaction.get(balanceDocRef);

    let newCashCollected = 0;
    let newFeesOwed = 0;

    if (balanceDoc.exists()) {
        const currentBalance = balanceDoc.data() as Omit<CourierBalance, 'name'>;
        newCashCollected = currentBalance.cashCollected;
        newFeesOwed = currentBalance.feesOwed;
    }

    if (order.paymentMethod === PaymentMethod.Cash) {
        newCashCollected += order.totalValue;
    }
    newFeesOwed += order.deliveryCost;

    if (balanceDoc.exists()) {
        transaction.update(balanceDocRef, { cashCollected: newCashCollected, feesOwed: newFeesOwed });
    } else {
        transaction.set(balanceDocRef, { cashCollected: newCashCollected, feesOwed: newFeesOwed });
    }
};

const reverseSettlement = async (transaction: any, order: Order) => {
    const balanceDocRef = doc(db, 'balances', order.courier);
    const balanceDoc = await transaction.get(balanceDocRef);

    if (!balanceDoc.exists()) {
        console.error("No se puede revertir el saldo porque no existe el documento.");
        return;
    }
    
    const currentBalance = balanceDoc.data() as Omit<CourierBalance, 'name'>;
    let newCashCollected = currentBalance.cashCollected;
    if (order.paymentMethod === PaymentMethod.Cash) {
        newCashCollected -= order.totalValue;
    }
    const newFeesOwed = currentBalance.feesOwed - order.deliveryCost;

    transaction.update(balanceDocRef, { cashCollected: newCashCollected, feesOwed: newFeesOwed });
};


// --- ACCIONES DE PEDIDOS ---
export const updateOrderStatus = async (orderId: string, status: OrderStatus): Promise<void> => {
    const orderDocRef = doc(db, 'orders', orderId);
    
    await runTransaction(db, async (transaction) => {
        const orderDoc = await transaction.get(orderDocRef);
        if (!orderDoc.exists()) throw new Error("¡El pedido no fue encontrado!");

        const order = { id: orderDoc.id, ...orderDoc.data() } as Order;
        const oldStatus = order.status;

        if (oldStatus === status) return;
        const unchangeableStates = [OrderStatus.Cancelled, OrderStatus.Returned];
        if (unchangeableStates.includes(oldStatus)) return;
        if (oldStatus === OrderStatus.Delivered && status !== OrderStatus.Returned) return;

        transaction.update(orderDocRef, { status });

        const updatedOrder = { ...order, status };

        if (status === OrderStatus.Delivered && oldStatus !== OrderStatus.Delivered) {
            await performSettlement(transaction, updatedOrder);
        } else if (status === OrderStatus.Returned && oldStatus === OrderStatus.Delivered) {
            await reverseSettlement(transaction, order);
        }
    });
};

export const deliverOrder = async (orderId: string, paymentInfo: { method: PaymentMethod.Cash | PaymentMethod.Transfer; receiptUrl?: string }): Promise<void> => {
    const orderDocRef = doc(db, 'orders', orderId);
    
    await runTransaction(db, async (transaction) => {
        const orderDoc = await transaction.get(orderDocRef);
        if (!orderDoc.exists()) throw new Error("¡El pedido no fue encontrado!");

        const order = { id: orderDoc.id, ...orderDoc.data() } as Order;
        
        const updateData: Partial<Order> = {
            paymentMethod: paymentInfo.method,
            paymentStatus: PaymentStatus.Paid,
            status: OrderStatus.Delivered,
        };
        if (paymentInfo.receiptUrl) {
            updateData.transferReceiptUrl = paymentInfo.receiptUrl;
        }
        
        transaction.update(orderDocRef, updateData);

        if(order.status !== OrderStatus.Delivered) {
            await performSettlement(transaction, { ...order, ...updateData, paymentMethod: paymentInfo.method });
        }
    });
};


export const addOrder = async (order: Order): Promise<void> => {
    const orderDocRef = doc(db, 'orders', order.id);
    await setDoc(orderDocRef, order);
};

export const addMultipleOrders = async (orders: Order[]): Promise<void> => {
    const batch = writeBatch(db);
    orders.forEach(order => {
        const orderDocRef = doc(db, 'orders', order.id);
        batch.set(orderDocRef, order);
    });
    await batch.commit();
};


// --- ACCIONES DE SALDO DE DOMICILIARIO ---
export const settleCourierCash = async (courierName: CourierName): Promise<void> => {
    const balanceDocRef = doc(db, 'balances', courierName);
    await updateDoc(balanceDocRef, { cashCollected: 0 });
};

export const payCourierFees = async (courierName: CourierName): Promise<void> => {
    const balanceDocRef = doc(db, 'balances', courierName);
    await updateDoc(balanceDocRef, { feesOwed: 0 });
};

// --- SUBIDA DE ARCHIVOS ---
export const uploadReceipt = async (file: File): Promise<string> => {
    const storageRef = ref(storage, `receipts/${Date.now()}-${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
};

export const submitCourierDeposit = async (courierName: CourierName, receiptFile: File): Promise<string> => {
    const receiptUrl = await uploadReceipt(receiptFile);
    console.log(`Recibo para ${courierName} subido a ${receiptUrl}. Se necesita verificación del admin.`);
    return receiptUrl;
};

// --- TRANSFORMACIÓN DE DATOS DE SHOPIFY ---
const getZoneFromAddress = (address: any, city: any): Zone => {
    // Coerce to string to prevent errors on non-string types
    const lowerCity = String(city || '').toLowerCase();
    const lowerAddress = String(address || '').toLowerCase();

    if (['medellin', 'medellín', 'envigado', 'sabaneta', 'bello', 'la estrella', 'itagui', 'itagüí'].some(c => lowerCity.includes(c))) return Zone.AreaMetropolitana;
    if (['san antonio de prado', 'caldas', 'copacabana', 'girardota', 'san cristobal'].some(c => lowerAddress.includes(c) || lowerCity.includes(c))) return Zone.SanAntonio;
    if (['rionegro', 'llanogrande', 'el retiro', 'la ceja', 'guarne', 'marinilla', 'carmen de viboral', 'barbosa'].some(c => lowerAddress.includes(c) || lowerCity.includes(c))) return Zone.Oriente;
    if (['bogota', 'bogotá'].some(c => lowerCity.includes(c))) return Zone.Bogota;
    
    return Zone.AreaMetropolitana;
};

export const transformShopifyOrder = (shopifyOrder: any): Order | null => {
    // Find the best source for address information. Prioritize shipping_address, but fallback to billing or customer default.
    const addressInfo = shopifyOrder.shipping_address || shopifyOrder.billing_address || shopifyOrder.customer?.default_address;

    // If there's no address info at all, the order is likely invalid for delivery and should be skipped.
    if (!addressInfo) {
        console.warn("Skipping Shopify order: Missing address information.", { id: shopifyOrder?.id, name: shopifyOrder?.name });
        return null;
    }

    // Determine Zone, Courier, and Delivery Cost from the address.
    const zone = getZoneFromAddress(addressInfo.address1, addressInfo.city);
    const courier = ZONE_TO_COURIER_MAP[zone];
    const deliveryCost = DELIVERY_COSTS[zone];
    
    // Determine payment status.
    const isPaid = String(shopifyOrder.financial_status ?? "").toLowerCase() === 'paid';

    // Extract line items safely.
    const lineItems = Array.isArray(shopifyOrder.line_items)
        ? shopifyOrder.line_items.map((item: any) => ({
            name: String(item.title || 'Producto sin nombre'),
            quantity: Number(item.quantity || 1),
        }))
        : [];
    
    // Cascade logic for customer name as requested.
    const customerFullName = (shopifyOrder.customer ? `${shopifyOrder.customer.first_name || ''} ${shopifyOrder.customer.last_name || ''}`.trim() : null);
    const customerName = customerFullName || 
                         shopifyOrder.shipping_address?.name || 
                         shopifyOrder.billing_address?.name ||
                         shopifyOrder.email ||
                         'Cliente Anónimo';
    
    // Cascade logic for phone number as requested.
    const phone = shopifyOrder.phone || 
                  shopifyOrder.shipping_address?.phone || 
                  shopifyOrder.billing_address?.phone ||
                  shopifyOrder.customer?.phone || 
                  'N/A';

    // Robustly build the address string, filtering out empty parts.
    const addressString = [
        addressInfo.address1,
        addressInfo.address2,
        addressInfo.city,
        addressInfo.province_code,
        addressInfo.country_code
    ].filter(Boolean).join(', ');

    // Construct the final Order object.
    const newOrder: Order = {
        id: `shopify-${shopifyOrder.id}`,
        orderNumber: shopifyOrder.name,
        customerName: customerName,
        phone: phone,
        address: addressString,
        customerId: shopifyOrder.customer?.id?.toString() || 'N/A',
        totalValue: parseFloat(shopifyOrder.total_price),
        paymentMethod: isPaid ? PaymentMethod.Wompi : PaymentMethod.Cash,
        paymentStatus: isPaid ? PaymentStatus.Paid : PaymentStatus.PendingPayment,
        courier,
        zone,
        deliveryCost,
        status: OrderStatus.Pending,
        createdAt: new Date(shopifyOrder.created_at).getTime(),
        lineItems,
    };

    return newOrder;
};