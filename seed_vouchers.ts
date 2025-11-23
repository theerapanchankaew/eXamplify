import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';

// Firebase config (use your actual config)
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedVouchers() {
    console.log('🎟️ Creating test vouchers...');

    const vouchers = [
        {
            code: 'WELCOME10',
            type: 'percentage',
            value: 10,
            minPurchase: 100,
            maxDiscount: 50,
            applicableTo: 'all',
            expiresAt: Timestamp.fromDate(new Date('2025-12-31')),
            usageLimit: 100,
            usedCount: 0,
            isActive: true,
            createdBy: 'admin',
            createdAt: Timestamp.now(),
        },
        {
            code: 'SAVE50',
            type: 'fixed',
            value: 50,
            minPurchase: 200,
            applicableTo: 'all',
            expiresAt: Timestamp.fromDate(new Date('2025-12-31')),
            usageLimit: 50,
            usedCount: 0,
            isActive: true,
            createdBy: 'admin',
            createdAt: Timestamp.now(),
        },
        {
            code: 'FREECOURSE',
            type: 'percentage',
            value: 100,
            minPurchase: 0,
            applicableTo: 'courses',
            expiresAt: Timestamp.fromDate(new Date('2025-06-30')),
            usageLimit: 10,
            usedCount: 0,
            isActive: true,
            createdBy: 'admin',
            createdAt: Timestamp.now(),
        },
        {
            code: 'STUDENT20',
            type: 'percentage',
            value: 20,
            minPurchase: 50,
            maxDiscount: 100,
            applicableTo: 'all',
            expiresAt: Timestamp.fromDate(new Date('2025-12-31')),
            usageLimit: 200,
            usedCount: 0,
            isActive: true,
            createdBy: 'admin',
            createdAt: Timestamp.now(),
        },
    ];

    try {
        for (const voucher of vouchers) {
            const docRef = await addDoc(collection(db, 'vouchers'), voucher);
            console.log(`✅ Created voucher: ${voucher.code} (${docRef.id})`);
        }
        console.log('\n🎉 All vouchers created successfully!');
    } catch (error) {
        console.error('❌ Error creating vouchers:', error);
    }
}

// Run the seed function
seedVouchers()
    .then(() => {
        console.log('\n✅ Seeding completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    });
