'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Circle,
    BookOpen,
    Clock,
    Award,
    Home
} from 'lucide-react';
import Link from 'next/link';
import {
    getLessonsInChapter,
    getNextLesson,
    getPreviousLesson,
    markLessonComplete,
    isFirstLesson,
    isLastLesson,
    type LessonInfo,
} from '@/lib/lesson-utils';
import { SlideViewer } from '@/components/lesson/SlideViewer/SlideViewer';
import type { Slide } from '@/types/slides';

export default function LessonViewerPage() {
    const { courseId, moduleId, chapterId, lessonId } = useParams();
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const [isCompleting, setIsCompleting] = useState(false);
    const [lessons, setLessons] = useState<LessonInfo[]>([]);
    const [loadingLessons, setLoadingLessons] = useState(true);

    // Fetch lesson
    const lessonRef = useMemoFirebase(
        () =>
            firestore && courseId && moduleId && chapterId && lessonId
                ? doc(
                    firestore,
                    `courses/${courseId}/modules/${moduleId}/chapters/${chapterId}/lessons/${lessonId}`
                )
                : null,
        [firestore, courseId, moduleId, chapterId, lessonId]
    );
    const { data: lesson, isLoading } = useDoc(lessonRef);

    // Fetch chapter to get all lessons
    const chapterRef = useMemoFirebase(
        () =>
            firestore && courseId && moduleId && chapterId
                ? doc(firestore, `courses/${courseId}/modules/${moduleId}/chapters/${chapterId}`)
                : null,
        [firestore, courseId, moduleId, chapterId]
    );
    const { data: chapter } = useDoc(chapterRef);

    // Fetch enrollment for progress
    const enrollmentRef = useMemoFirebase(
        () =>
            firestore && user && courseId
                ? doc(firestore, 'enrollments', `${user.uid}_${courseId}`)
                : null,
        [firestore, user, courseId]
    );
    const { data: enrollment } = useDoc(enrollmentRef);

    // Load all lessons in chapter
    useEffect(() => {
        async function loadLessons() {
            if (!firestore || !courseId || !moduleId || !chapterId) return;

            setLoadingLessons(true);
            const chapterLessons = await getLessonsInChapter(
                firestore,
                courseId as string,
                moduleId as string,
                chapterId as string
            );
            setLessons(chapterLessons);
            setLoadingLessons(false);
        }

        loadLessons();
    }, [firestore, courseId, moduleId, chapterId]);

    const handleMarkComplete = async () => {
        if (!firestore || !user || !courseId || !lessonId) return;

        setIsCompleting(true);
        try {
            await markLessonComplete(
                firestore,
                user.uid,
                courseId as string,
                lessonId as string
            );

            toast({
                title: 'Lesson Completed!',
                description: 'Great job! Keep learning.',
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to mark lesson as complete.',
            });
        } finally {
            setIsCompleting(false);
        }
    };

    const handleNext = async () => {
        const nextLesson = getNextLesson(lessons, lessonId as string);

        if (!nextLesson) return;

        // Mark current lesson complete
        if (firestore && user && courseId) {
            try {
                await markLessonComplete(
                    firestore,
                    user.uid,
                    courseId as string,
                    lessonId as string
                );
            } catch (error) {
                console.error('Error marking complete:', error);
            }
        }

        // Navigate to next lesson
        router.push(
            `/courses/${courseId}/modules/${moduleId}/chapters/${chapterId}/lessons/${nextLesson.id}`
        );
    };

    const handlePrevious = () => {
        const prevLesson = getPreviousLesson(lessons, lessonId as string);

        if (!prevLesson) return;

        router.push(
            `/courses/${courseId}/modules/${moduleId}/chapters/${chapterId}/lessons/${prevLesson.id}`
        );
    };

    if (isLoading || loadingLessons) {
        return (
            <div className="min-h-screen bg-background">
                <div className="container mx-auto py-10">
                    <Skeleton className="h-[600px] rounded-xl" />
                </div>
            </div>
        );
    }

    if (!lesson) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Lesson not found</h2>
                    <Button asChild>
                        <Link href={`/courses/${courseId}`}>Back to Course</Link>
                    </Button>
                </div>
            </div>
        );
    }

    const progress = enrollment?.progress || 0;
    const isFirst = isFirstLesson(lessons, lessonId as string);
    const isLast = isLastLesson(lessons, lessonId as string);
    const nextLesson = getNextLesson(lessons, lessonId as string);
    const prevLesson = getPreviousLesson(lessons, lessonId as string);

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
            {/* Top Navigation */}
            <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" asChild>
                                <Link href={`/courses/${courseId}`}>
                                    <Home className="h-4 w-4" />
                                </Link>
                            </Button>
                            <div>
                                <h1 className="font-semibold text-lg line-clamp-1">{lesson.title}</h1>
                                <p className="text-sm text-muted-foreground">{chapter?.name}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>{lesson.duration || 10} min</span>
                            </div>
                            <Badge variant="outline">
                                <BookOpen className="mr-1 h-3 w-3" />
                                Lesson {lesson.order || 1}
                            </Badge>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-muted-foreground">Course Progress</span>
                            <span className="font-medium">{progress}% Complete</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-10">
                <div className="max-w-4xl mx-auto">
                    {/* Lesson Card */}
                    <Card className="shadow-2xl border-2">
                        <CardContent className="p-0">
                            {/* Content Area */}
                            <div className="p-8 md:p-12 min-h-[500px]">
                                {/* Render SlideViewer if lesson has slides */}
                                {lesson.slides && Array.isArray(lesson.slides) && lesson.slides.length > 0 ? (
                                    <SlideViewer
                                        slides={lesson.slides as Slide[]}
                                        lessonId={lessonId as string}
                                        onComplete={handleMarkComplete}
                                        onProgressUpdate={(slideIndex) => {
                                            // Optional: Track slide progress
                                            console.log('Current slide:', slideIndex);
                                        }}
                                    />
                                ) : (
                                    /* Fallback to traditional content rendering */
                                    <div className="prose prose-lg dark:prose-invert max-w-none">
                                        <h2 className="text-3xl font-bold mb-6">{lesson.title}</h2>

                                        {lesson.content ? (
                                            <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
                                        ) : (
                                            <div className="space-y-4">
                                                <p className="text-lg leading-relaxed">
                                                    {lesson.description || 'No content available for this lesson.'}
                                                </p>

                                                {/* Placeholder for rich content */}
                                                <div className="bg-secondary/30 rounded-lg p-8 text-center">
                                                    <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                                                    <p className="text-muted-foreground">
                                                        Lesson content will be displayed here
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Action Footer */}
                            <div className="border-t bg-secondary/20 p-6">
                                <div className="flex items-center justify-between">
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        onClick={handlePrevious}
                                        disabled={isFirst}
                                    >
                                        <ChevronLeft className="mr-2 h-4 w-4" />
                                        Previous
                                    </Button>

                                    <Button
                                        size="lg"
                                        onClick={handleMarkComplete}
                                        disabled={isCompleting}
                                        variant="outline"
                                    >
                                        {isCompleting ? (
                                            'Saving...'
                                        ) : (
                                            <>
                                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                                Mark Complete
                                            </>
                                        )}
                                    </Button>

                                    <Button
                                        size="lg"
                                        onClick={handleNext}
                                        disabled={isLast}
                                    >
                                        {isLast ? 'Last Lesson' : 'Next'}
                                        <ChevronRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Key Takeaways */}
                    {lesson.keyPoints && lesson.keyPoints.length > 0 && (
                        <Card className="mt-6">
                            <CardContent className="p-6">
                                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                    <Award className="h-5 w-5 text-primary" />
                                    Key Takeaways
                                </h3>
                                <ul className="space-y-2">
                                    {lesson.keyPoints.map((point: string, index: number) => (
                                        <li key={index} className="flex items-start gap-2">
                                            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                                            <span>{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}

                    {/* Lesson Navigation */}
                    <Card className="mt-6">
                        <CardContent className="p-6">
                            <h3 className="font-semibold text-lg mb-4">Chapter Lessons</h3>
                            <div className="space-y-2">
                                {lessons.map((l) => {
                                    const isCurrent = l.id === lessonId;
                                    const isCompleted = enrollment?.completedLessons?.[l.id];

                                    return (
                                        <Link
                                            key={l.id}
                                            href={`/courses/${courseId}/modules/${moduleId}/chapters/${chapterId}/lessons/${l.id}`}
                                            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isCurrent
                                                ? 'bg-primary/10 border border-primary'
                                                : 'hover:bg-secondary'
                                                }`}
                                        >
                                            {isCompleted ? (
                                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                            ) : (
                                                <Circle className="h-5 w-5 text-muted-foreground" />
                                            )}
                                            <span className={isCurrent ? 'font-medium' : ''}>
                                                {l.title}
                                            </span>
                                            {isCurrent && (
                                                <Badge className="ml-auto">Current</Badge>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
