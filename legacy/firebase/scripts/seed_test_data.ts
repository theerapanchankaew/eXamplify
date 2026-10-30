import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp, doc, setDoc } from 'firebase/firestore';

// Firebase config
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

// Replace with your actual instructor UID
const INSTRUCTOR_UID = 'YOUR_INSTRUCTOR_UID_HERE';

async function seedTestData() {
    console.log('🌱 Starting test data seeding...\n');

    try {
        // 1. Create Test Courses
        console.log('📚 Creating test courses...');
        const courses = [
            {
                name: 'Introduction to Web Development',
                description: 'Learn HTML, CSS, and JavaScript fundamentals',
                price: 100,
                category: 'Programming',
                difficulty: 'Beginner',
                instructorId: INSTRUCTOR_UID,
                enrollment_count: 0,
                createdAt: Timestamp.now(),
            },
            {
                name: 'Advanced React & Next.js',
                description: 'Master modern React and Next.js development',
                price: 200,
                category: 'Programming',
                difficulty: 'Advanced',
                instructorId: INSTRUCTOR_UID,
                enrollment_count: 0,
                createdAt: Timestamp.now(),
            },
            {
                name: 'Database Design & SQL',
                description: 'Learn database design principles and SQL',
                price: 150,
                category: 'Database',
                difficulty: 'Intermediate',
                instructorId: INSTRUCTOR_UID,
                enrollment_count: 0,
                createdAt: Timestamp.now(),
            },
        ];

        const courseIds: string[] = [];
        for (const course of courses) {
            const docRef = await addDoc(collection(db, 'courses'), course);
            courseIds.push(docRef.id);
            console.log(`✅ Created course: ${course.name} (${docRef.id})`);
        }

        // 2. Create Test Exams
        console.log('\n📝 Creating test exams...');
        const exams = [
            {
                courseId: courseIds[0],
                name: 'Web Development Final Exam',
                description: 'Test your knowledge of HTML, CSS, and JavaScript',
                duration: 60,
                passingScore: 70,
                price: 50,
                totalQuestions: 20,
                createdAt: Timestamp.now(),
            },
            {
                courseId: courseIds[1],
                name: 'React & Next.js Certification',
                description: 'Advanced certification exam for React developers',
                duration: 90,
                passingScore: 75,
                price: 100,
                totalQuestions: 30,
                createdAt: Timestamp.now(),
            },
            {
                courseId: courseIds[2],
                name: 'SQL Proficiency Test',
                description: 'Database and SQL skills assessment',
                duration: 75,
                passingScore: 70,
                price: 75,
                totalQuestions: 25,
                createdAt: Timestamp.now(),
            },
        ];

        const examData: Array<{ courseId: string; examId: string; name: string }> = [];
        for (let i = 0; i < exams.length; i++) {
            const exam = exams[i];
            const examRef = await addDoc(
                collection(db, `courses/${courseIds[i]}/exams`),
                exam
            );
            examData.push({
                courseId: courseIds[i],
                examId: examRef.id,
                name: exam.name,
            });
            console.log(`✅ Created exam: ${exam.name} (${examRef.id})`);
        }

        // 3. Create Exam Schedules
        console.log('\n📅 Creating exam schedules...');
        const today = new Date();
        const schedules = [];

        for (const exam of examData) {
            // Create schedules for next 7 days
            for (let day = 1; day <= 7; day++) {
                const examDate = new Date(today);
                examDate.setDate(today.getDate() + day);
                examDate.setHours(0, 0, 0, 0);

                // Create 3 time slots per day
                const timeSlots: Array<'09:00' | '13:00' | '17:00'> = ['09:00', '13:00', '17:00'];

                for (const timeSlot of timeSlots) {
                    schedules.push({
                        examId: exam.examId,
                        examName: exam.name,
                        courseId: exam.courseId,
                        date: Timestamp.fromDate(examDate),
                        timeSlot,
                        capacity: 10,
                        bookedCount: 0,
                        status: 'available',
                        createdAt: Timestamp.now(),
                        createdBy: INSTRUCTOR_UID,
                    });
                }
            }
        }

        for (const schedule of schedules) {
            const docRef = await addDoc(collection(db, 'examSchedules'), schedule);
            console.log(`✅ Created schedule: ${schedule.examName} on ${schedule.date.toDate().toDateString()} at ${schedule.timeSlot}`);
        }

        // 4. Create Vouchers
        console.log('\n🎟️ Creating vouchers...');
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
        ];

        for (const voucher of vouchers) {
            const docRef = await addDoc(collection(db, 'vouchers'), voucher);
            console.log(`✅ Created voucher: ${voucher.code} (${docRef.id})`);
        }

        console.log('\n🎉 All test data created successfully!');
        console.log('\n📊 Summary:');
        console.log(`   - Courses: ${courses.length}`);
        console.log(`   - Exams: ${exams.length}`);
        console.log(`   - Schedules: ${schedules.length}`);
        console.log(`   - Vouchers: ${vouchers.length}`);

    } catch (error) {
        console.error('❌ Error seeding data:', error);
    }
}

// Run the seed function
seedTestData()
    .then(() => {
        console.log('\n✅ Seeding completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    });
