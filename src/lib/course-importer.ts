import { Firestore, writeBatch, doc, collection, serverTimestamp, WriteBatch } from 'firebase/firestore';
import { CourseImportData, validateCourseImport, ValidationResult } from './schemas/course-import';

export interface ImportResult {
    success: boolean;
    courseId?: string;
    stats?: {
        modulesCreated: number;
        chaptersCreated: number;
        lessonsCreated: number;
    };
    error?: string;
    validationErrors?: any[];
}

export class CourseImporter {
    private firestore: Firestore;
    private userId: string;

    constructor(firestore: Firestore, userId: string) {
        this.firestore = firestore;
        this.userId = userId;
    }

    async import(data: any): Promise<ImportResult> {
        // 1. Validate
        const validation = validateCourseImport(data);
        if (!validation.valid) {
            return {
                success: false,
                error: 'Validation failed',
                validationErrors: validation.errors,
            };
        }

        const courseData = data as CourseImportData;
        const batches: WriteBatch[] = [];
        let currentBatch = writeBatch(this.firestore);
        let operationCount = 0;

        const MAX_BATCH_SIZE = 450; // Safety margin below 500

        const addToBatch = (operation: () => void) => {
            if (operationCount >= MAX_BATCH_SIZE) {
                batches.push(currentBatch);
                currentBatch = writeBatch(this.firestore);
                operationCount = 0;
            }
            operation();
            operationCount++;
        };

        try {
            // 2. Create Course
            const courseRef = doc(collection(this.firestore, 'courses'));
            const courseId = courseRef.id;

            addToBatch(() => {
                // Destructure modules out to avoid saving it to the root document
                const { modules, ...courseFields } = courseData.course;

                currentBatch.set(courseRef, {
                    ...courseFields,
                    instructorId: this.userId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    enrollment_count: 0,
                });
            });

            let modulesCreated = 0;
            let chaptersCreated = 0;
            let lessonsCreated = 0;

            // 3. Create Modules
            courseData.course.modules.forEach((module, moduleIndex) => {
                const moduleRef = doc(collection(this.firestore, `courses/${courseId}/modules`));
                modulesCreated++;

                addToBatch(() => {
                    currentBatch.set(moduleRef, {
                        name: module.name,
                        description: module.description || '',
                        order: module.order ?? moduleIndex,
                        courseId: courseId,
                        createdAt: serverTimestamp(),
                    });
                });

                // 4. Create Chapters
                module.chapters.forEach((chapter, chapterIndex) => {
                    const chapterRef = doc(collection(this.firestore, `courses/${courseId}/modules/${moduleRef.id}/chapters`));
                    chaptersCreated++;

                    addToBatch(() => {
                        currentBatch.set(chapterRef, {
                            name: chapter.name,
                            description: chapter.description || '',
                            order: chapter.order ?? chapterIndex,
                            moduleId: moduleRef.id,
                            courseId: courseId,
                            createdAt: serverTimestamp(),
                        });
                    });

                    // 5. Create Lessons
                    chapter.lessons.forEach((lesson, lessonIndex) => {
                        const lessonRef = doc(collection(this.firestore, `courses/${courseId}/modules/${moduleRef.id}/chapters/${chapterRef.id}/lessons`));
                        lessonsCreated++;

                        addToBatch(() => {
                            currentBatch.set(lessonRef, {
                                title: lesson.title,
                                content: lesson.content,
                                type: lesson.type || 'text',
                                duration: lesson.duration || 0,
                                order: lesson.order ?? lessonIndex,
                                objectives: lesson.objectives || [],
                                resources: lesson.resources || [],
                                chapterId: chapterRef.id,
                                moduleId: moduleRef.id,
                                courseId: courseId,
                                createdAt: serverTimestamp(),
                            });
                        });
                    });
                });
            });

            // Add final batch
            if (operationCount > 0) {
                batches.push(currentBatch);
            }

            // 6. Commit all batches
            // Note: This is not fully atomic across batches, but good enough for large imports.
            // Ideally we'd use a recursive delete to rollback, but for now we rely on the user to delete if it fails halfway.
            for (const batch of batches) {
                await batch.commit();
            }

            return {
                success: true,
                courseId: courseId,
                stats: {
                    modulesCreated,
                    chaptersCreated,
                    lessonsCreated,
                },
            };

        } catch (error: any) {
            console.error('Import failed:', error);
            return {
                success: false,
                error: error.message || 'Unknown error occurred during import',
            };
        }
    }
}
