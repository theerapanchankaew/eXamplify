'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Skeleton } from '../ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { BookOpen, MoreVertical, PlusCircle, Edit, Eye } from 'lucide-react';
import Link from 'next/link';

interface LessonListProps {
    courseId: string;
    moduleId: string;
    chapterId: string;
    isCourseOwner: boolean;
    isEnrolled?: boolean;
}

export function LessonList({
    courseId,
    moduleId,
    chapterId,
    isCourseOwner,
    isEnrolled,
}: LessonListProps) {
    const firestore = useFirestore();

    const lessonsQuery = useMemoFirebase(
        () =>
            firestore
                ? query(
                    collection(
                        firestore,
                        'courses',
                        courseId,
                        'modules',
                        moduleId,
                        'chapters',
                        chapterId,
                        'lessons'
                    )
                )
                : null,
        [firestore, courseId, moduleId, chapterId]
    );

    const { data: lessons, isLoading } = useCollection(lessonsQuery);

    if (isLoading) {
        return (
            <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        );
    }

    return (
        <div className="border-l-2 pl-4 ml-4 space-y-2">
            {lessons && lessons.length > 0 ? (
                lessons.map((lesson) => {
                    const hasSlides = lesson.slides && lesson.slides.length > 0;
                    return (
                        <div
                            key={lesson.id}
                            className="flex items-center group bg-background hover:bg-muted/50 rounded-md p-2"
                        >
                            <BookOpen className="h-5 w-5 mr-3 text-muted-foreground" />
                            <div className="flex-1">
                                <p className="font-medium">{lesson.title}</p>
                                <p className="text-xs text-muted-foreground">
                                    {hasSlides ? `${lesson.slides.length} slides` : 'No slides yet'}
                                </p>
                            </div>

                            {/* View Button for Students */}
                            {isEnrolled && !isCourseOwner && (
                                <Button variant="outline" size="sm" asChild className="mr-2">
                                    <Link
                                        href={`/courses/${courseId}/modules/${moduleId}/chapters/${chapterId}/lessons/${lesson.id}`}
                                    >
                                        <Eye className="mr-2 h-4 w-4" />
                                        View Lesson
                                    </Link>
                                </Button>
                            )}

                            {/* Instructor Actions */}
                            {isCourseOwner && (
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" asChild>
                                        <Link
                                            href={`/courses/${courseId}/modules/${moduleId}/chapters/${chapterId}/lessons/${lesson.id}/edit`}
                                        >
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit Slides
                                        </Link>
                                    </Button>
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link
                                            href={`/courses/${courseId}/modules/${moduleId}/chapters/${chapterId}/lessons/${lesson.id}`}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </div>
                    );
                })
            ) : (
                <p className="text-muted-foreground text-sm">No lessons in this chapter yet.</p>
            )}
        </div>
    );
}
