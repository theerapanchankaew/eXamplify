
import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

export async function GET() {
    try {
        console.log('Seeding free test course...');

        const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
        const db = getFirestore(app);

        // 1. Create Course
        const courseRef = doc(collection(db, 'courses'));
        const courseId = courseRef.id;

        await setDoc(courseRef, {
            name: 'Free Certification Test Course',
            description: 'A free course to test enrollment and certificate generation.',
            price: 0,
            instructorId: 'admin_user',
            createdAt: new Date(),
            enrollment_count: 0,
            published: true
        });

        // 2. Create Module
        const moduleRef = await addDoc(collection(db, `courses/${courseId}/modules`), {
            name: 'Test Module 1',
            description: 'First module for testing.',
            courseId: courseId,
            createdAt: new Date()
        });

        // 3. Create Chapter
        const chapterRef = await addDoc(collection(db, `courses/${courseId}/modules/${moduleRef.id}/chapters`), {
            name: 'Test Chapter 1',
            content: 'This is a test chapter. Read it and complete it.',
            moduleId: moduleRef.id,
            createdAt: new Date()
        });

        return NextResponse.json({ success: true, courseId, moduleId: moduleRef.id, chapterId: chapterRef.id });
    } catch (error: any) {
        console.error('Error seeding course:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
