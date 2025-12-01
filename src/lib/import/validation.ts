import { z } from 'zod';

/**
 * Zod schemas for validating course and exam data
 */

// Question schema
export const QuestionSchema = z.object({
    id: z.string().min(1, 'Question ID is required'),
    text: z.string().min(1, 'Question text is required'),
    type: z.enum(['multiple-choice', 'true-false', 'essay'], {
        errorMap: () => ({ message: 'Invalid question type' }),
    }),
    options: z.array(z.string()).optional(),
    correctAnswer: z.string().min(1, 'Correct answer is required'),
    explanation: z.string().optional(),
    points: z.number().min(0, 'Points must be non-negative').default(1),
});

// Exam schema
export const ExamSchema = z.object({
    id: z.string().min(1, 'Exam ID is required'),
    name: z.string().min(1, 'Exam name is required'),
    description: z.string().min(1, 'Exam description is required'),
    duration: z.number().min(1, 'Duration must be at least 1 minute'),
    passingScore: z.number().min(0).max(100, 'Passing score must be between 0-100'),
    totalQuestions: z.number().min(1, 'Must have at least 1 question'),
    price: z.number().min(0, 'Price must be non-negative'),
    questions: z.array(QuestionSchema).min(1, 'Exam must have at least one question'),
});

// Course schema
export const CourseSchema = z.object({
    id: z.string().min(1, 'Course ID is required'),
    name: z.string().min(1, 'Course name is required'),
    description: z.string().min(1, 'Course description is required'),
    instructorId: z.string().min(1, 'Instructor ID is required'),
    price: z.number().min(0, 'Price must be non-negative'),
    thumbnail: z.string().url('Invalid thumbnail URL').optional(),
    category: z.string().min(1, 'Category is required'),
    level: z.enum(['beginner', 'intermediate', 'advanced'], {
        errorMap: () => ({ message: 'Level must be beginner, intermediate, or advanced' }),
    }),
    duration: z.number().min(0, 'Duration must be non-negative'),
    enrollment_count: z.number().min(0).default(0),
    rating: z.number().min(0).max(5).default(0),
    exams: z.array(ExamSchema).optional().default([]),
});

// Root schema for courses.json
export const CoursesDataSchema = z.object({
    courses: z.array(CourseSchema).min(1, 'Must have at least one course'),
});

export type Question = z.infer<typeof QuestionSchema>;
export type Exam = z.infer<typeof ExamSchema>;
export type Course = z.infer<typeof CourseSchema>;
export type CoursesData = z.infer<typeof CoursesDataSchema>;

/**
 * Validation functions
 */

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Validate courses data from JSON
 */
export function validateCoursesData(data: unknown): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
        // Schema validation
        const result = CoursesDataSchema.safeParse(data);

        if (!result.success) {
            result.error.errors.forEach(err => {
                errors.push(`${err.path.join('.')}: ${err.message}`);
            });
            return { valid: false, errors, warnings };
        }

        const coursesData = result.data;

        // Business logic validation
        const courseIds = new Set<string>();
        const examIds = new Set<string>();

        for (const course of coursesData.courses) {
            // Check for duplicate course IDs
            if (courseIds.has(course.id)) {
                errors.push(`Duplicate course ID: ${course.id}`);
            }
            courseIds.add(course.id);

            // Validate exams
            for (const exam of course.exams) {
                // Check for duplicate exam IDs across all courses
                const fullExamId = `${course.id}/${exam.id}`;
                if (examIds.has(fullExamId)) {
                    errors.push(`Duplicate exam ID: ${exam.id} in course ${course.id}`);
                }
                examIds.add(fullExamId);

                // Validate totalQuestions matches actual questions count
                if (exam.questions.length !== exam.totalQuestions) {
                    warnings.push(
                        `Exam ${exam.id} in course ${course.id}: totalQuestions (${exam.totalQuestions}) doesn't match actual questions count (${exam.questions.length})`
                    );
                }

                // Validate question IDs are unique within exam
                const questionIds = new Set<string>();
                for (const question of exam.questions) {
                    if (questionIds.has(question.id)) {
                        errors.push(`Duplicate question ID: ${question.id} in exam ${exam.id}`);
                    }
                    questionIds.add(question.id);

                    // Validate multiple-choice questions have options
                    if (question.type === 'multiple-choice' && (!question.options || question.options.length < 2)) {
                        errors.push(
                            `Question ${question.id} in exam ${exam.id}: Multiple-choice questions must have at least 2 options`
                        );
                    }

                    // Validate correctAnswer is in options for multiple-choice
                    if (question.type === 'multiple-choice' && question.options) {
                        if (!question.options.includes(question.correctAnswer)) {
                            errors.push(
                                `Question ${question.id} in exam ${exam.id}: Correct answer "${question.correctAnswer}" not found in options`
                            );
                        }
                    }
                }
            }

            // Warn if course has no exams
            if (course.exams.length === 0) {
                warnings.push(`Course ${course.id} has no exams`);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    } catch (error) {
        errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
        return { valid: false, errors, warnings };
    }
}
