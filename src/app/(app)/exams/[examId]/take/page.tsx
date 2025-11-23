'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query } from 'firebase/firestore';
import { ExamTaker } from '@/components/exam/ExamTaker';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Lock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { canAccessExam } from '@/lib/enrollment';

export default function TakeExamPage() {
    const { examId } = useParams();
    const searchParams = useSearchParams();
    const courseId = searchParams.get('courseId');
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const [accessCheck, setAccessCheck] = useState<{
        loading: boolean;
        canAccess: boolean;
        reason?: string;
        examName?: string;
    }>({
        loading: true,
        canAccess: false,
    });

    // Verify enrollment on mount
    useEffect(() => {
        async function verifyAccess() {
            if (!firestore || !user || !examId) {
                setAccessCheck({
                    loading: false,
                    canAccess: false,
                    reason: 'Please log in to take this exam',
                });
                return;
            }

            const result = await canAccessExam(firestore, user.uid, examId as string);

            setAccessCheck({
                loading: false,
                canAccess: result.canAccess,
                reason: result.reason,
                examName: result.examName,
            });

            // Redirect if no access
            if (!result.canAccess) {
                setTimeout(() => {
                    router.push(`/exams/${examId}`);
                }, 3000);
            }
        }

        verifyAccess();
    }, [firestore, user, examId, router]);

    // Exam Data
    const examDocRef = useMemoFirebase(
        () =>
            firestore && courseId && examId
                ? doc(firestore, 'courses', courseId as string, 'exams', examId as string)
                : null,
        [firestore, courseId, examId]
    );
    const { data: exam, isLoading: isLoadingExam } = useDoc(examDocRef);

    // Questions Data
    const questionsQuery = useMemoFirebase(
        () =>
            firestore && courseId && examId
                ? query(collection(firestore, 'courses', courseId as string, 'exams', examId as string, 'questions'))
                : null,
        [firestore, courseId, examId]
    );
    const { data: questions, isLoading: isLoadingQuestions } = useCollection(questionsQuery);

    const isLoading = isLoadingExam || isLoadingQuestions || accessCheck.loading;

    // Loading state
    if (isLoading) {
        return (
            <div className="container mx-auto py-10 space-y-8">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-4 w-full max-w-2xl" />
                <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
        );
    }

    // Access denied
    if (!accessCheck.canAccess) {
        return (
            <div className="container mx-auto py-20 max-w-2xl">
                <Card className="border-destructive">
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-destructive/10 rounded-full">
                                <Lock className="h-8 w-8 text-destructive" />
                            </div>
                            <div>
                                <CardTitle>Access Denied</CardTitle>
                                <CardDescription>
                                    {accessCheck.examName || 'This exam'}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Cannot Access Exam</AlertTitle>
                            <AlertDescription>
                                {accessCheck.reason || 'You do not have permission to take this exam.'}
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                                To take this exam, you need to:
                            </p>
                            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                <li>Be enrolled in the course</li>
                                <li>Not have completed the exam already</li>
                                <li>Have an active enrollment status</li>
                            </ul>
                        </div>

                        <div className="flex gap-2">
                            <Button asChild>
                                <Link href={`/exams/${examId}`}>
                                    View Exam Details
                                </Link>
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href="/marketplace">
                                    Browse Marketplace
                                </Link>
                            </Button>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Redirecting to exam details in 3 seconds...
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Exam not found
    if (!exam) {
        return (
            <div className="container mx-auto py-20 text-center">
                <h2 className="text-2xl font-bold">Exam not found</h2>
                <Button asChild className="mt-4">
                    <Link href="/exams">Back to Exams</Link>
                </Button>
            </div>
        );
    }

    // All checks passed - show exam
    return (
        <div className="container mx-auto py-8 px-4 min-h-screen bg-background">
            <div className="mb-8">
                <Link href="/exams" className="text-sm text-muted-foreground hover:text-primary flex items-center mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Exit Exam
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">{exam.name}</h1>
                <p className="text-muted-foreground mt-2 max-w-3xl">{exam.description}</p>
            </div>

            <ExamTaker
                exam={{ ...exam, id: examId as string, courseId: courseId as string }}
                questions={questions?.map(q => ({ ...q, id: q.id })) || []}
            />
        </div>
    );
}
