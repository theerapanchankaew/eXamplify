import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, RotateCcw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ExamResultsProps {
    score: number;
    totalQuestions: number;
    passingScore: number;
    onRetake: () => void;
    courseId: string;
}

export function ExamResults({
    score,
    totalQuestions,
    passingScore,
    onRetake,
    courseId,
}: ExamResultsProps) {
    const percentage = Math.round((score / totalQuestions) * 100);
    const isPassed = percentage >= passingScore;

    return (
        <div className="w-full max-w-md mx-auto text-center space-y-6 animate-in fade-in zoom-in duration-500">
            <Card className="border-t-8 border-t-primary shadow-xl">
                <CardHeader>
                    <div className="mx-auto mb-4">
                        {isPassed ? (
                            <CheckCircle className="h-20 w-20 text-green-500" />
                        ) : (
                            <XCircle className="h-20 w-20 text-red-500" />
                        )}
                    </div>
                    <CardTitle className="text-3xl font-bold">
                        {isPassed ? 'Exam Passed!' : 'Exam Failed'}
                    </CardTitle>
                    <CardDescription className="text-lg">
                        {isPassed
                            ? 'Congratulations! You have successfully completed this exam.'
                            : 'Don\'t worry, you can try again to improve your score.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex justify-center items-end gap-2">
                        <span className="text-6xl font-extrabold text-primary">{score}</span>
                        <span className="text-xl text-muted-foreground mb-2">/ {totalQuestions}</span>
                    </div>
                    <div className="w-full bg-secondary h-4 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-1000 ease-out ${isPassed ? 'bg-green-500' : 'bg-red-500'
                                }`}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        You scored {percentage}%. Passing score is {passingScore}%.
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Button onClick={onRetake} variant="outline" className="w-full sm:w-auto">
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Retake Exam
                    </Button>
                    <Button asChild className="w-full sm:w-auto">
                        <Link href={`/courses/${courseId}`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Course
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
