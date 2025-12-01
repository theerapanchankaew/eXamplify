'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
    Trophy,
    XCircle,
    ArrowLeft,
    Download,
    RotateCcw,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import Link from 'next/link';

export default function ExamResultsPage() {
    const { examId } = useParams();
    const searchParams = useSearchParams();
    const courseId = searchParams.get('courseId');
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    // Fetch exam results for this user and exam
    const resultsQuery = useMemoFirebase(
        () =>
            firestore && user && examId
                ? query(
                    collection(firestore, 'examResults'),
                    where('userId', '==', user.uid),
                    where('examId', '==', examId),
                    orderBy('submittedAt', 'desc'),
                    limit(1)
                )
                : null,
        [firestore, user, examId]
    );

    const { data: results, isLoading, error } = useCollection(resultsQuery);
    const result = results && results.length > 0 ? results[0] : null;

    // Fetch certificates if passed
    const certificatesQuery = useMemoFirebase(
        () =>
            firestore && user && result?.passed
                ? query(
                    collection(firestore, `users/${user.uid}/certificates`),
                    where('examId', '==', examId)
                )
                : null,
        [firestore, user, examId, result]
    );

    const { data: certificates } = useCollection(certificatesQuery);
    const certificate = certificates && certificates.length > 0 ? certificates[0] : null;

    if (isLoading) {
        return (
            <div className="container mx-auto py-10 space-y-6">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-[400px] rounded-xl" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto py-20 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                <h2 className="text-2xl font-bold mb-2">Error Loading Results</h2>
                <p className="text-muted-foreground mb-4">{error.message}</p>
                <Button asChild>
                    <Link href="/exams">Back to Exams</Link>
                </Button>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="container mx-auto py-20 text-center space-y-6">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold">No Results Found</h2>
                <p className="text-muted-foreground">
                    You haven't taken this exam yet or results are not available.
                </p>
                <Button asChild>
                    <Link href={`/exams/${examId}${courseId ? `?courseId=${courseId}` : ''}`}>
                        View Exam Details
                    </Link>
                </Button>
            </div>
        );
    }

    const percentage = result.totalPoints > 0
        ? Math.round((result.score / result.totalPoints) * 100)
        : 0;

    return (
        <div className="container mx-auto py-10 space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/exams">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Exam Results</h1>
                    <p className="text-muted-foreground text-lg">{result.examName || 'Your Exam'}</p>
                </div>
            </div>

            {/* Results Card */}
            <Card className={result.passed ? 'border-green-500' : 'border-destructive'}>
                <CardHeader className="text-center pb-4">
                    <div className="flex justify-center mb-4">
                        {result.passed ? (
                            <div className="p-4 bg-green-500/10 rounded-full">
                                <Trophy className="h-16 w-16 text-green-600" />
                            </div>
                        ) : (
                            <div className="p-4 bg-destructive/10 rounded-full">
                                <XCircle className="h-16 w-16 text-destructive" />
                            </div>
                        )}
                    </div>
                    <CardTitle className="text-3xl">
                        {result.passed ? 'Congratulations! 🎉' : 'Not Passed'}
                    </CardTitle>
                    <CardDescription className="text-lg">
                        {result.passed
                            ? 'You have successfully passed this exam!'
                            : 'Keep practicing and try again!'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Score Display */}
                    <div className="text-center space-y-2">
                        <div className="text-6xl font-bold text-primary">
                            {percentage}%
                        </div>
                        <p className="text-muted-foreground">
                            {result.score} out of {result.totalPoints} points
                        </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <Progress value={percentage} className="h-4" />
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Passing Score: {result.passingScore || 70}%</span>
                            <span>Your Score: {percentage}%</span>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div className="text-center p-4 bg-secondary rounded-lg">
                            <div className="text-2xl font-bold">{result.totalQuestions || 0}</div>
                            <div className="text-sm text-muted-foreground">Total Questions</div>
                        </div>
                        <div className="text-center p-4 bg-secondary rounded-lg">
                            <div className="text-2xl font-bold">
                                {result.submittedAt?.toDate().toLocaleDateString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Submitted On</div>
                        </div>
                    </div>

                    {/* Certificate Section */}
                    {result.passed && (
                        <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertTitle className="text-green-800 dark:text-green-200">
                                Certificate Earned!
                            </AlertTitle>
                            <AlertDescription className="text-green-700 dark:text-green-300">
                                {certificate
                                    ? 'Your certificate is ready to download.'
                                    : 'Your certificate is being generated and will be available shortly.'}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        {result.passed ? (
                            <>
                                {certificate && (
                                    <Button className="flex-1" asChild>
                                        <Link href="/certificates">
                                            <Download className="mr-2 h-4 w-4" />
                                            View Certificate
                                        </Link>
                                    </Button>
                                )}
                                <Button variant="outline" className="flex-1" asChild>
                                    <Link href="/exams">
                                        Back to Exams
                                    </Link>
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    className="flex-1"
                                    onClick={() => router.push(`/exams/${examId}/take${courseId ? `?courseId=${courseId}` : ''}`)}
                                >
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    Retake Exam
                                </Button>
                                <Button variant="outline" className="flex-1" asChild>
                                    <Link href="/exams">
                                        Back to Exams
                                    </Link>
                                </Button>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Performance Breakdown (Optional) */}
            {result.passed && (
                <Card>
                    <CardHeader>
                        <CardTitle>Performance Summary</CardTitle>
                        <CardDescription>Your exam performance breakdown</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Overall Performance</span>
                                <Badge variant={percentage >= 90 ? 'default' : percentage >= 70 ? 'secondary' : 'destructive'}>
                                    {percentage >= 90 ? 'Excellent' : percentage >= 70 ? 'Good' : 'Needs Improvement'}
                                </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                You scored {result.score} points out of a possible {result.totalPoints} points,
                                achieving a {percentage}% success rate.
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
