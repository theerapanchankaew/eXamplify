import {
    Firestore,
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    getDoc,
    query,
    where,
    serverTimestamp,
    writeBatch,
    increment,
} from 'firebase/firestore';
import { CartItem, Order, Voucher } from '@/types/marketplace';
import { getUserTokenBalance } from './tokens';

/**
 * Add item to cart
 */
export async function addToCart(
    firestore: Firestore,
    userId: string,
    itemType: 'course' | 'exam',
    itemId: string,
    itemName: string,
    price: number,
    itemDescription?: string,
    thumbnail?: string
): Promise<string> {
    const cartRef = collection(firestore, `cart/${userId}/items`);

    // Check if item already in cart
    const existingQuery = query(cartRef, where('itemId', '==', itemId));
    const existingSnap = await getDocs(existingQuery);

    if (!existingSnap.empty) {
        throw new Error('Item already in cart');
    }

    // Build cart item data, excluding undefined fields
    const cartItemData: any = {
        userId,
        itemType,
        itemId,
        itemName,
        price,
        addedAt: serverTimestamp(),
    };

    // Only add optional fields if they have values
    if (itemDescription) {
        cartItemData.itemDescription = itemDescription;
    }
    if (thumbnail) {
        cartItemData.thumbnail = thumbnail;
    }

    const docRef = await addDoc(cartRef, cartItemData);

    return docRef.id;
}

/**
 * Remove item from cart
 */
export async function removeFromCart(
    firestore: Firestore,
    userId: string,
    cartItemId: string
): Promise<void> {
    const itemRef = doc(firestore, `cart/${userId}/items/${cartItemId}`);
    await deleteDoc(itemRef);
}

/**
 * Get cart items
 */
export async function getCartItems(
    firestore: Firestore,
    userId: string
): Promise<CartItem[]> {
    const cartRef = collection(firestore, `cart/${userId}/items`);
    const snapshot = await getDocs(cartRef);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    })) as CartItem[];
}

/**
 * Clear cart
 */
export async function clearCart(
    firestore: Firestore,
    userId: string
): Promise<void> {
    const cartRef = collection(firestore, `cart/${userId}/items`);
    const snapshot = await getDocs(cartRef);

    const batch = writeBatch(firestore);
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
}

/**
 * Validate voucher
 */
export async function validateVoucher(
    firestore: Firestore,
    code: string,
    subtotal: number
): Promise<{ valid: boolean; discount: number; voucher?: Voucher; error?: string }> {
    const vouchersRef = collection(firestore, 'vouchers');
    const q = query(vouchersRef, where('code', '==', code.toUpperCase()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        return { valid: false, discount: 0, error: 'Invalid voucher code' };
    }

    const voucherDoc = snapshot.docs[0];
    const voucher = { id: voucherDoc.id, ...voucherDoc.data() } as Voucher;

    // Check if active
    if (!voucher.isActive) {
        return { valid: false, discount: 0, error: 'Voucher is inactive' };
    }

    // Check expiry
    if (voucher.expiresAt.toMillis() < Date.now()) {
        return { valid: false, discount: 0, error: 'Voucher has expired' };
    }

    // Check usage limit
    if (voucher.usedCount >= voucher.usageLimit) {
        return { valid: false, discount: 0, error: 'Voucher usage limit reached' };
    }

    // Check minimum purchase
    if (voucher.minPurchase && subtotal < voucher.minPurchase) {
        return { valid: false, discount: 0, error: `Minimum purchase of ${voucher.minPurchase} tokens required` };
    }

    // Calculate discount
    let discount = 0;
    if (voucher.type === 'percentage') {
        discount = (subtotal * voucher.value) / 100;
        if (voucher.maxDiscount && discount > voucher.maxDiscount) {
            discount = voucher.maxDiscount;
        }
    } else if (voucher.type === 'fixed') {
        discount = voucher.value;
    } else if (voucher.type === 'free') {
        discount = subtotal;
    }

    return { valid: true, discount, voucher };
}

/**
 * Process checkout
 */
export async function processCheckout(
    firestore: Firestore,
    userId: string,
    cartItems: CartItem[],
    voucherCode?: string
): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
        // Calculate subtotal
        const subtotal = cartItems.reduce((sum, item) => sum + item.price, 0);

        // Validate voucher if provided
        let discount = 0;
        let voucher: Voucher | undefined;
        if (voucherCode) {
            const validation = await validateVoucher(firestore, voucherCode, subtotal);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }
            discount = validation.discount;
            voucher = validation.voucher;
        }

        const total = subtotal - discount;

        // Check token balance from transactions
        const tokenBalance = await getUserTokenBalance(firestore, userId);

        if (tokenBalance < total) {
            return { success: false, error: `Insufficient tokens. You need ${total} tokens but have ${tokenBalance}.` };
        }

        // Create order
        const batch = writeBatch(firestore);

        const orderRef = doc(collection(firestore, 'orders'));

        // Build order data, excluding undefined fields
        const orderData: any = {
            userId,
            items: cartItems.map(item => ({
                itemType: item.itemType,
                itemId: item.itemId,
                itemName: item.itemName,
                price: item.price,
            })),
            subtotal,
            discount,
            total,
            paymentMethod: 'tokens',
            status: 'completed',
            createdAt: serverTimestamp(),
            completedAt: serverTimestamp(),
        };

        // Only add voucherCode if it exists
        if (voucherCode) {
            orderData.voucherCode = voucherCode.toUpperCase();
        }

        batch.set(orderRef, orderData);

        // Deduct tokens
        const transactionRef = doc(collection(firestore, `users/${userId}/tokenTransactions`));
        batch.set(transactionRef, {
            amount: -total,
            type: 'deduction',
            description: `Purchase order ${orderRef.id}`,
            orderId: orderRef.id,
            timestamp: serverTimestamp(),
        });

        // Create enrollments for purchased items
        for (const item of cartItems) {
            if (item.itemType === 'course') {
                const enrollmentRef = doc(firestore, 'enrollments', `${userId}_${item.itemId}`);
                batch.set(enrollmentRef, {
                    userId,
                    courseId: item.itemId,
                    enrolledAt: serverTimestamp(),
                    status: 'active',
                    progress: 0,
                });

                // Increment enrollment count
                const courseRef = doc(firestore, 'courses', item.itemId);
                batch.update(courseRef, { enrollment_count: increment(1) });
            }
        }

        // Update voucher usage if used
        if (voucher) {
            const voucherRef = doc(firestore, 'vouchers', voucher.id);
            batch.update(voucherRef, { usedCount: increment(1) });
        }

        // Clear cart
        const cartRef = collection(firestore, `cart/${userId}/items`);
        const cartSnapshot = await getDocs(cartRef);
        cartSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();

        return { success: true, orderId: orderRef.id };
    } catch (error: any) {
        console.error('Checkout error:', error);
        return { success: false, error: error.message || 'Checkout failed' };
    }
}
