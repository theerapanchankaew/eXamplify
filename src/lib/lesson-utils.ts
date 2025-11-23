import {
    Firestore,
    collection,
    query,
    getDocs,
    orderBy,
    doc,
    updateDoc,
    increment,
} from 'firebase/firestore';

export interface LessonInfo {
    id: string;
    title: string;
    order: number;
    duration?: number;
    content?: string;
    description?: string;
}

/**
 * Get all lessons in a chapter, ordered by lesson order
 */
export async function getLessonsInChapter(
    firestore: Firestore,
    courseId: string,
    moduleId: string,
    chapterId: string
): Promise<LessonInfo[]> {
    try {
        const lessonsRef = collection(
            firestore,
            `courses/${courseId}/modules/${moduleId}/chapters/${chapterId}/lessons`
        );
        const lessonsQuery = query(lessonsRef, orderBy('order', 'asc'));
        const lessonsSnap = await getDocs(lessonsQuery);

        return lessonsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as LessonInfo[];
    } catch (error) {
        console.error('Error getting lessons:', error);
        return [];
    }
}

/**
 * Get the next lesson in the sequence
 */
export function getNextLesson(
    lessons: LessonInfo[],
    currentLessonId: string
): LessonInfo | null {
    const currentIndex = lessons.findIndex(l => l.id === currentLessonId);

    if (currentIndex === -1 || currentIndex === lessons.length - 1) {
        return null;
    }

    return lessons[currentIndex + 1];
}

/**
 * Get the previous lesson in the sequence
 */
export function getPreviousLesson(
    lessons: LessonInfo[],
    currentLessonId: string
): LessonInfo | null {
    const currentIndex = lessons.findIndex(l => l.id === currentLessonId);

    if (currentIndex <= 0) {
        return null;
    }

    return lessons[currentIndex - 1];
}

/**
 * Calculate lesson progress percentage
 */
export function getLessonProgress(
    lessons: LessonInfo[],
    completedLessonIds: string[]
): number {
    if (lessons.length === 0) return 0;

    const completedCount = lessons.filter(l =>
        completedLessonIds.includes(l.id)
    ).length;

    return Math.round((completedCount / lessons.length) * 100);
}

/**
 * Mark a lesson as complete and update course progress
 */
export async function markLessonComplete(
    firestore: Firestore,
    userId: string,
    courseId: string,
    lessonId: string
): Promise<void> {
    try {
        const enrollmentRef = doc(firestore, 'enrollments', `${userId}_${courseId}`);

        // Update enrollment progress
        await updateDoc(enrollmentRef, {
            progress: increment(1),
            lastAccessedAt: new Date(),
            [`completedLessons.${lessonId}`]: true,
        });
    } catch (error) {
        console.error('Error marking lesson complete:', error);
        throw error;
    }
}

/**
 * Check if a lesson is completed
 */
export function isLessonCompleted(
    completedLessons: Record<string, boolean> | undefined,
    lessonId: string
): boolean {
    return completedLessons?.[lessonId] === true;
}

/**
 * Get current lesson index
 */
export function getCurrentLessonIndex(
    lessons: LessonInfo[],
    currentLessonId: string
): number {
    return lessons.findIndex(l => l.id === currentLessonId);
}

/**
 * Check if lesson is first in chapter
 */
export function isFirstLesson(
    lessons: LessonInfo[],
    currentLessonId: string
): boolean {
    return getCurrentLessonIndex(lessons, currentLessonId) === 0;
}

/**
 * Check if lesson is last in chapter
 */
export function isLastLesson(
    lessons: LessonInfo[],
    currentLessonId: string
): boolean {
    const index = getCurrentLessonIndex(lessons, currentLessonId);
    return index === lessons.length - 1;
}
