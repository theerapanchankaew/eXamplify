/**
 * Manual script to create enrollment for existing exam order
 * Run this once to fix the missing enrollment
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Your Firebase config
const firebaseConfig = {
    // Add your config here from .env or firebase console
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

async function createMissingEnrollment() {
    try {
        // Based on the order: m9qT7M8u5Iknz0Dg42xe
        // You need to check the order to get:
        // 1. userId
        // 2. examId

        const userId = 'YOUR_USER_ID'; // Get from order
        const examId = 'Tx6kZsiTQWlczuenhex'; // From the error message

        const enrollmentRef = doc(firestore, 'enrollments', `${userId}_exam_${examId}`);

        await setDoc(enrollmentRef, {
            userId,
            examId,
            courseId: null, // Root-level exam
            enrolledAt: serverTimestamp(),
            status: 'active',
            type: 'exam',
        });

        console.log('✅ Enrollment created successfully!');
    } catch (error) {
        console.error('❌ Error creating enrollment:', error);
    }
}

createMissingEnrollment();
