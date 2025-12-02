import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    writeBatch,
    serverTimestamp,
    Firestore,
} from 'firebase/firestore';

export interface Question {
    id: string;
    text: string;
    type: 'multiple-choice' | 'true-false' | 'essay';
    options?: string[];
    correctAnswer: string;
    explanation?: string;
    points: number;
}

export interface ExamData {
    name: string;
    description: string;
    courseId: string;
    duration: number; // in minutes
    passingScore: number; // percentage
    price: number; // in tokens
    totalQuestions: number;
    status?: 'draft' | 'published';
    category?: string;
}

export interface ExamWithQuestions extends ExamData {
    id: string;
    questions: Question[];
    createdAt?: any;
    updatedAt?: any;
}

export interface ExamFilters {
    courseId?: string;
    category?: string;
    status?: 'draft' | 'published';
    searchTerm?: string;
}

/**
 * Create a new exam
 */
export async function createExam(
    firestore: Firestore,
    examData: ExamData,
    questions: Question[]
): Promise<string> {
    const batch = writeBatch(firestore);

    // Generate exam ID
    const examId = `exam-${Date.now()}`;
    const examRef = doc(firestore, 'courses', examData.courseId, 'exams', examId);

    // Create exam document
    batch.set(examRef, {
        ...examData,
        totalQuestions: questions.length,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    // Create question documents
    for (const question of questions) {
        const questionRef = doc(
            firestore,
            'courses',
            examData.courseId,
            'exams',
            examId,
            'questions',
            question.id
        );
        batch.set(questionRef, {
            ...question,
            examId,
            courseId: examData.courseId,
            createdAt: serverTimestamp(),
        });
    }

    await batch.commit();
    return examId;
}

/**
 * Update an existing exam
 */
export async function updateExam(
    firestore: Firestore,
    courseId: string,
    examId: string,
    examData: Partial<ExamData>,
    questions?: Question[]
): Promise<void> {
    const batch = writeBatch(firestore);

    // Update exam document
    const examRef = doc(firestore, 'courses', courseId, 'exams', examId);
    batch.update(examRef, {
        ...examData,
        ...(questions && { totalQuestions: questions.length }),
        updatedAt: serverTimestamp(),
    });

    // Update questions if provided
    if (questions) {
        // Get existing questions
        const questionsSnapshot = await getDocs(
            collection(firestore, 'courses', courseId, 'exams', examId, 'questions')
        );

        // Delete questions that are no longer in the list
        const newQuestionIds = new Set(questions.map((q) => q.id));
        for (const questionDoc of questionsSnapshot.docs) {
            if (!newQuestionIds.has(questionDoc.id)) {
                batch.delete(questionDoc.ref);
            }
        }

        // Update or create questions
        for (const question of questions) {
            const questionRef = doc(
                firestore,
                'courses',
                courseId,
                'exams',
                examId,
                'questions',
                question.id
            );
            batch.set(
                questionRef,
                {
                    ...question,
                    examId,
                    courseId,
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );
        }
    }

    await batch.commit();
}

/**
 * Delete an exam and all its questions
 */
export async function deleteExam(
    firestore: Firestore,
    courseId: string,
    examId: string
): Promise<void> {
    const batch = writeBatch(firestore);

    // Delete all questions
    const questionsSnapshot = await getDocs(
        collection(firestore, 'courses', courseId, 'exams', examId, 'questions')
    );

    for (const questionDoc of questionsSnapshot.docs) {
        batch.delete(questionDoc.ref);
    }

    // Delete exam
    const examRef = doc(firestore, 'courses', courseId, 'exams', examId);
    batch.delete(examRef);

    await batch.commit();
}

/**
 * Get exam with all questions
 */
export async function getExamWithQuestions(
    firestore: Firestore,
    courseId: string,
    examId: string
): Promise<ExamWithQuestions | null> {
    // Get exam data
    const examRef = doc(firestore, 'courses', courseId, 'exams', examId);
    const examSnap = await getDoc(examRef);

    if (!examSnap.exists()) {
        return null;
    }
    
    const examData = examSnap.data();

    // Get questions
    const questionsSnapshot = await getDocs(
        collection(firestore, 'courses', courseId, 'exams', examId, 'questions')
    );

    const questions: Question[] = questionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Question[];

    return {
        id: examSnap.id,
        ...examData,
        price: examData.price || 0, // Ensure price is included
        questions,
    } as ExamWithQuestions;
}

/**
 * List all exams with optional filters
 */
export async function listExams(
    firestore: Firestore,
    filters?: ExamFilters
): Promise<ExamWithQuestions[]> {
    const exams: ExamWithQuestions[] = [];

    // Get all courses or specific course
    const coursesQuery = filters?.courseId
        ? query(collection(firestore, 'courses'), where('__name__', '==', filters.courseId))
        : collection(firestore, 'courses');

    const coursesSnapshot = await getDocs(coursesQuery);

    // For each course, get exams
    for (const courseDoc of coursesSnapshot.docs) {
        let examsQuery = collection(firestore, 'courses', courseDoc.id, 'exams');
        let q = query(examsQuery);

        // Apply filters
        if (filters?.status) {
            q = query(q, where('status', '==', filters.status));
        }
        if (filters?.category) {
            q = query(q, where('category', '==', filters.category));
        }

        const examsSnapshot = await getDocs(q);

        for (const examDoc of examsSnapshot.docs) {
            const examData = examDoc.data();

            // Apply search filter
            if (filters?.searchTerm) {
                const searchLower = filters.searchTerm.toLowerCase();
                if (
                    !examData.name?.toLowerCase().includes(searchLower) &&
                    !examData.description?.toLowerCase().includes(searchLower)
                ) {
                    continue;
                }
            }

            exams.push({
                id: examDoc.id,
                name: examData.name || '',
                description: examData.description || '',
                courseId: examData.courseId,
                duration: examData.duration || 0,
                passingScore: examData.passingScore || 0,
                price: examData.price || 0, // Ensure price is included with a fallback
                totalQuestions: examData.totalQuestions || 0,
                status: examData.status || 'draft',
                category: examData.category || '',
                questions: [], // Questions are not needed for the list view
            } as ExamWithQuestions);
        }
    }

    return exams;
}

/**
 * Duplicate an exam
 */
export async function duplicateExam(
    firestore: Firestore,
    courseId: string,
    examId: string
): Promise<string> {
    // Get original exam with questions
    const originalExam = await getExamWithQuestions(firestore, courseId, examId);

    if (!originalExam) {
        throw new Error('Exam not found');
    }

    // Create new exam with modified name
    const { id, questions, ...examData } = originalExam;
    const newExamData: ExamData = {
        ...examData,
        name: `${originalExam.name} (Copy)`,
        status: 'draft',
    };

    // Generate new question IDs
    const newQuestions = originalExam.questions.map((q, index) => ({
        ...q,
        id: `q${index + 1}`,
    }));

    return await createExam(firestore, newExamData, newQuestions);
}
