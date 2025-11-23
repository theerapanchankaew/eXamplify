import { Timestamp } from 'firebase/firestore';

export type EnrollmentStatus = 'not_enrolled' | 'enrolled' | 'completed';

export interface CourseProgress {
    completedLessons: string[];
    totalLessons: number;
    percentage: number;
    lastAccessedLessonId?: string;
    lastAccessedModuleId?: string;
    isExamPassed: boolean;
    examScore?: number;
}

export interface NextAction {
    type: 'enroll' | 'start' | 'continue' | 'exam' | 'certificate';
    label: string;
    link: string;
}

/**
 * Calculate course progress based on enrollment data and course structure
 */
export function calculateCourseProgress(
    enrollment: any,
    modules: any[]
): CourseProgress {
    if (!enrollment) {
        return {
            completedLessons: [],
            totalLessons: 0,
            percentage: 0,
            isExamPassed: false
        };
    }

    const completedLessons = enrollment.completedLessons || [];

    // Calculate total lessons from modules
    let totalLessons = 0;
    modules?.forEach(module => {
        totalLessons += module.chapters?.length || 0;
    });

    const percentage = totalLessons > 0
        ? Math.round((completedLessons.length / totalLessons) * 100)
        : 0;

    return {
        completedLessons,
        totalLessons,
        percentage: Math.min(percentage, 100),
        lastAccessedLessonId: enrollment.lastAccessedLessonId,
        lastAccessedModuleId: enrollment.lastAccessedModuleId,
        isExamPassed: enrollment.examResult?.passed || false,
        examScore: enrollment.examResult?.score
    };
}

/**
 * Determine the next best action for the user
 */
export function getNextAction(
    courseId: string,
    isEnrolled: boolean,
    progress: CourseProgress,
    modules: any[] = []
): NextAction {
    // 1. Not Enrolled
    if (!isEnrolled) {
        return {
            type: 'enroll',
            label: 'Enroll Now',
            link: `/courses/${courseId}`
        };
    }

    // 2. Exam Passed -> Certificate
    if (progress.isExamPassed) {
        return {
            type: 'certificate',
            label: 'View Certificate',
            link: `/certificate/${courseId}`
        };
    }

    // 3. Completed all lessons -> Take Exam
    // Assuming 100% progress means ready for exam
    if (progress.percentage === 100) {
        return {
            type: 'exam',
            label: 'Take Exam',
            link: `/courses/${courseId}/exam`
        };
    }

    // 4. In Progress -> Continue Learning
    if (progress.percentage > 0 && progress.lastAccessedLessonId && progress.lastAccessedModuleId) {
        return {
            type: 'continue',
            label: 'Continue Learning',
            link: `/courses/${courseId}/learn/${progress.lastAccessedModuleId}/${progress.lastAccessedLessonId}`
        };
    }

    // 5. Just Enrolled (0%) -> Start Learning
    // Find first lesson of first module
    if (modules && modules.length > 0) {
        const firstModule = modules[0];
        if (firstModule.chapters && firstModule.chapters.length > 0) {
            const firstLesson = firstModule.chapters[0];
            return {
                type: 'start',
                label: 'Start Learning',
                link: `/courses/${courseId}/learn/${firstModule.id}/${firstLesson.id}`
            };
        }
    }

    // Fallback if no modules/lessons found yet
    return {
        type: 'start',
        label: 'Start Learning',
        link: `/courses/${courseId}`
    };
}
