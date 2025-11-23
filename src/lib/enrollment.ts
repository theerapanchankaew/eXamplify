import {
    Firestore,
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
} from 'firebase/firestore';

/**
 * Check if a user is enrolled in a specific course
 */
export async function checkEnrollment(
    firestore: Firestore,
    userId: string,
    courseId: string
): Promise<boolean> {
    try {
        const enrollmentRef = doc(firestore, 'enrollments', `${userId}_${courseId}`);
        const enrollmentSnap = await getDoc(enrollmentRef);

        if (!enrollmentSnap.exists()) {
            return false;
        }

        const enrollment = enrollmentSnap.data();
        return enrollment.status === 'active';
    } catch (error) {
        console.error('Error checking enrollment:', error);
        return false;
    }
}

/**
 * Check if a user can access a specific exam
 * Returns enrollment status and exam details
 */
export async function canAccessExam(
    firestore: Firestore,
    userId: string,
    examId: string
): Promise<{
    canAccess: boolean;
    reason?: string;
    courseId?: string;
    examName?: string;
}> {
    try {
        // Find the exam using collectionGroup query
        const examsQuery = query(
            collection(firestore, 'exams'),
            where('__name__', '==', examId)
        );

        // Try to find exam in all courses
        let examDoc = null;
        let courseId = null;

        // Search through courses to find the exam
        const coursesSnap = await getDocs(collection(firestore, 'courses'));

        for (const courseDoc of coursesSnap.docs) {
            const examRef = doc(firestore, `courses/${courseDoc.id}/exams/${examId}`);
            const examSnap = await getDoc(examRef);

            if (examSnap.exists()) {
                examDoc = examSnap.data();
                courseId = courseDoc.id;
                break;
            }
        }

        if (!examDoc || !courseId) {
            return {
                canAccess: false,
                reason: 'Exam not found',
            };
        }

        // Check enrollment
        const isEnrolled = await checkEnrollment(firestore, userId, courseId);

        if (!isEnrolled) {
            return {
                canAccess: false,
                reason: 'You must be enrolled in the course to take this exam',
                courseId,
                examName: examDoc.name,
            };
        }

        // Check if already completed
        const resultsQuery = query(
            collection(firestore, 'examResults'),
            where('userId', '==', userId),
            where('examId', '==', examId)
        );
        const resultsSnap = await getDocs(resultsQuery);

        if (!resultsSnap.empty) {
            return {
                canAccess: false,
                reason: 'You have already completed this exam',
                courseId,
                examName: examDoc.name,
            };
        }

        return {
            canAccess: true,
            courseId,
            examName: examDoc.name,
        };
    } catch (error) {
        console.error('Error checking exam access:', error);
        return {
            canAccess: false,
            reason: 'Error verifying access. Please try again.',
        };
    }
}

/**
 * Get detailed enrollment status for a user and course
 */
export async function getEnrollmentStatus(
    firestore: Firestore,
    userId: string,
    courseId: string
): Promise<{
    isEnrolled: boolean;
    enrolledAt?: Date;
    status?: string;
    progress?: number;
} | null> {
    try {
        const enrollmentRef = doc(firestore, 'enrollments', `${userId}_${courseId}`);
        const enrollmentSnap = await getDoc(enrollmentRef);

        if (!enrollmentSnap.exists()) {
            return {
                isEnrolled: false,
            };
        }

        const data = enrollmentSnap.data();
        return {
            isEnrolled: true,
            enrolledAt: data.enrolledAt?.toDate(),
            status: data.status,
            progress: data.progress || 0,
        };
    } catch (error) {
        console.error('Error getting enrollment status:', error);
        return null;
    }
}

/**
 * Get all courses a user is enrolled in
 */
export async function getUserEnrollments(
    firestore: Firestore,
    userId: string
): Promise<Array<{
    courseId: string;
    enrolledAt: Date;
    status: string;
    progress: number;
}>> {
    try {
        const enrollmentsQuery = query(
            collection(firestore, 'enrollments'),
            where('userId', '==', userId)
        );
        const enrollmentsSnap = await getDocs(enrollmentsQuery);

        return enrollmentsSnap.docs.map(doc => ({
            courseId: doc.data().courseId,
            enrolledAt: doc.data().enrolledAt?.toDate(),
            status: doc.data().status,
            progress: doc.data().progress || 0,
        }));
    } catch (error) {
        console.error('Error getting user enrollments:', error);
        return [];
    }
}
