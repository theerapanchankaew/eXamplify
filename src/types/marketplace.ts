import { Timestamp } from 'firebase/firestore';

/**
 * Shopping Cart Item
 */
export interface CartItem {
    id: string;
    userId: string;
    itemType: 'course' | 'exam';
    itemId: string;
    itemName: string;
    itemDescription?: string;
    price: number;
    thumbnail?: string;
    addedAt: Timestamp;
}

/**
 * Order
 */
export interface Order {
    id: string;
    userId: string;
    items: {
        itemType: 'course' | 'exam';
        itemId: string;
        itemName: string;
        price: number;
    }[];
    subtotal: number;
    discount: number;
    total: number;
    paymentMethod: 'tokens' | 'voucher';
    voucherCode?: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    createdAt: Timestamp;
    completedAt?: Timestamp;
}

/**
 * Voucher
 */
export interface Voucher {
    id: string;
    code: string;
    type: 'percentage' | 'fixed' | 'free';
    value: number; // percentage (0-100) or fixed amount
    minPurchase?: number; // minimum purchase amount
    maxDiscount?: number; // maximum discount amount (for percentage)
    applicableTo?: 'all' | 'courses' | 'exams';
    expiresAt: Timestamp;
    usageLimit: number; // total usage limit
    usedCount: number;
    isActive: boolean;
    createdBy: string; // admin/instructor ID
    createdAt: Timestamp;
}

/**
 * Marketplace Item (for catalog display)
 */
export interface MarketplaceItem {
    id: string;
    type: 'course' | 'exam';
    name: string;
    description: string;
    price: number;
    thumbnail?: string;
    category?: string;
    difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
    duration?: number; // in minutes
    rating?: number;
    enrollmentCount?: number;
    instructorId: string;
    instructorName?: string;
    createdAt: Timestamp;
}
