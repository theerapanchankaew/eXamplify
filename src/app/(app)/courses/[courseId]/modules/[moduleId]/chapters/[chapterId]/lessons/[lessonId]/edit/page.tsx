'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { SlideEditor } from '@/components/lesson/SlideEditor/SlideEditor';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Slide } from '@/types/slides';
import type { SlideEditorHandle } from '@/components/lesson/SlideEditor/SlideEditor';

export default function LessonEditPage() {
    const { courseId, moduleId, chapterId, lessonId } = useParams();
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

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
    const { data: lesson, isLoading: lessonLoading } = useDoc(lessonRef);

    // Fetch course to check ownership
    const courseRef = useMemoFirebase(
        () => (firestore && courseId ? doc(firestore, `courses/${courseId}`) : null),
        [firestore, courseId]
    );
    const { data: course, isLoading: courseLoading } = useDoc(courseRef);

    // Fetch user profile to check role
    const userProfileRef = useMemoFirebase(
        () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
        [firestore, user]
    );
    const { data: userProfile } = useDoc(userProfileRef);

    const isLoading = lessonLoading || courseLoading;

    // Authorization check
    const isAuthorized =
        userProfile?.role === 'Admin' ||
        (userProfile?.role === 'Instructor' && course?.instructorId === user?.uid);

    // Save handler
    const handleSave = async (slides: Slide[]) => {
        if (!firestore || !lessonRef) {
            throw new Error('Firestore not initialized');
        }
        try {
            await updateDoc(lessonRef, { slides, updatedAt: new Date() });
        } catch (error: any) {
            console.error('Error saving slides:', error);
            throw new Error(error.message || 'Failed to save slides');
        }
    };

    // Redirect if not authorized
    useEffect(() => {
        if (!isLoading && !isAuthorized) {
            toast({
                variant: 'destructive',
                title: 'Access Denied',
                description: 'You do not have permission to edit this lesson.',
            });
            router.push(`/courses/${courseId}`);
        }
    }, [isLoading, isAuthorized, courseId, router, toast]);

    if (isLoading) {
        return (
            <div className="container mx-auto py-10">
                <Skeleton className="h-8 w-64 mb-6" />
                <Skeleton className="h-[600px] rounded-xl" />
            </div>
        );
    }

    if (!lesson) {
        return (
            <div className="container mx-auto py-10">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Lesson not found</h2>
                    <Button asChild>
                        <Link href={`/courses/${courseId}`}>Back to Course</Link>
                    </Button>
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return null; // Redirect handled in effect
    }

    const editorRef = React.useRef<SlideEditorHandle>(null);

    return (
        <div className="container mx-auto py-10">
            {/* Header */}
            <div className="mb-6">
                <Button variant="ghost" asChild className="mb-4">
                    <Link href={`/courses/${courseId}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Course
                    </Link>
                </Button>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl">Edit Lesson Slides</CardTitle>
                        <p className="text-muted-foreground mt-2">{lesson.title}</p>
                    </CardHeader>
                </Card>
            </div>

            {/* Add Slide Button */}
            <div className="mb-4">
                <Button onClick={() => editorRef.current?.addSlide()}>Add Slide</Button>
            </div>

            {/* Slide Editor */}
            <SlideEditor
                ref={editorRef}
                initialSlides={lesson.slides || []}
                lessonId={lessonId as string}
                onSave={handleSave}
            />
        </div>
    );
}

