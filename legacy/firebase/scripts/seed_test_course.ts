
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { firebaseConfig } from './src/firebase/config';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedTestCourse() {
    try {
        console.log('Seeding free test course...');

        // 1. Create Course
        const courseRef = doc(collection(db, 'courses'));
        const courseId = courseRef.id;

        await setDoc(courseRef, {
            name: 'Free Certification Test Course',
            description: 'A free course to test enrollment and certificate generation.',
            price: 0,
            instructorId: 'admin_user', // Placeholder
            createdAt: new Date(),
            enrollment_count: 0,
            published: true
        });
        console.log(`Course created: ${courseId}`);

        // 2. Create Module
        const moduleRef = await addDoc(collection(db, `courses/${courseId}/modules`), {
            name: 'Test Module 1',
            description: 'First module for testing.',
            courseId: courseId,
            createdAt: new Date()
        });
        console.log(`Module created: ${moduleRef.id}`);

        // 3. Create Chapter
        const chapterRef = await addDoc(collection(db, `courses/${courseId}/modules/${moduleRef.id}/chapters`), {
            name: 'Test Chapter 1',
            content: 'This is a test chapter. Read it and complete it.',
            moduleId: moduleRef.id,
            createdAt: new Date()
        });
        console.log(`Chapter created: ${chapterRef.id}`);

        console.log('Seeding complete!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding course:', error);
        process.exit(1);
    }
}

seedTestCourse();
