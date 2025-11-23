import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { QuestionCard } from './QuestionCard';
import { ExamResults } from './ExamResults';
import { WebcamMonitor } from './WebcamMonitor';
import { ArrowRight, ArrowLeft, Timer, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFirestore, useUser } from '@/firebase';

interface Question {
    id: string;
    text: string;
    type: 'Multiple Choice' | 'True/False' | 'Short Answer';
    options?: string[];
    points: number;
    // NO answer field - this is server-side only!
}

interface Exam {
    id: string;
    name: string;
    description: string;
    courseId: string;
    passingScore?: number; // Optional, default to 50%
}

interface ExamTakerProps {
    exam: Exam;
    questions: Question[];
}

export function ExamTaker({ exam, questions }: ExamTakerProps) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useUser();
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [startTime] = useState(Date.now());
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Proctoring State
    const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);

    // Calculate total points
    const totalPoints = questions.reduce((acc, q) => acc + (q.points || 1), 0);
    const passingScore = exam.passingScore || 50;

    const handleSelectOption = (value: string) => {
        setAnswers((prev) => ({
            ...prev,
            [questions[currentQuestionIndex].id]: value,
        }));
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex((prev) => prev + 1);
        }
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex((prev) => prev - 1);
        }
    };

    const handleSubmit = async () => {
        if (!firestore || !user) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "You must be logged in to submit the exam.",
            });
            return;
        }

        setIsSubmitting(true);

        try {
            // Call server-side grading function
            const { httpsCallable } = await import('firebase/functions');
            const { getFunctions } = await import('firebase/functions');
            const functions = getFunctions();
            const gradeExamFn = httpsCallable(functions, 'gradeExam');

            const result = await gradeExamFn({
                examId: exam.id,
                courseId: exam.courseId,
                answers: answers,
                startTime: startTime,
            });

            const data = result.data as {
                score: number;
                totalPoints: number;
                percentage: number;
                passed: boolean;
                certificateIssued: boolean;
                resultId: string;
            };

            setScore(data.score);
            setIsSubmitted(true);

            // Show success message
            if (data.passed && data.certificateIssued) {
                toast({
                    title: "🎉 Congratulations!",
                    description: "You passed the exam and earned a certificate!",
                });
            } else if (data.passed) {
                toast({
                    title: "Exam Passed!",
                    description: `You scored ${data.percentage.toFixed(1)}%`,
                });
            } else {
                toast({
                    title: "Exam Submitted",
                    description: `You scored ${data.percentage.toFixed(1)}%. Keep practicing!`,
                });
            }
        } catch (error: any) {
            console.error("Error submitting exam:", error);
            toast({
                variant: "destructive",
                title: "Submission Failed",
                description: error.message || "Failed to submit exam. Please try again.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRetake = () => {
        setAnswers({});
        setCurrentQuestionIndex(0);
        setIsSubmitted(false);
        setScore(0);
    };

    if (questions.length === 0) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold">No questions available.</h2>
                <p className="text-muted-foreground">Please contact your instructor.</p>
            </div>
        );
    }

    // Block access until camera is granted
    if (cameraPermission === false) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center px-4">
                <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-full">
                    <AlertTriangle className="h-12 w-12 text-red-500" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight">Camera Access Required</h2>
                <p className="text-muted-foreground max-w-md">
                    To ensure exam integrity, this exam requires webcam monitoring.
                    Please allow camera access in your browser settings and refresh the page.
                </p>
                <Button onClick={() => window.location.reload()}>Refresh Page</Button>
            </div>
        );
    }

    if (isSubmitted) {
        return (
            <ExamResults
                score={score}
                totalQuestions={totalPoints}
                passingScore={passingScore}
                onRetake={handleRetake}
                courseId={exam.courseId}
            />
        );
    }

    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
        <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 relative">

            {/* Main Content Area */}
            <div className="flex-1 space-y-8">
                {/* Header / Progress */}
                <div className="space-y-4 bg-white/50 dark:bg-zinc-900/50 p-6 rounded-2xl backdrop-blur-sm border border-border/50">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">{exam.name}</h2>
                            <p className="text-sm text-muted-foreground">Question {currentQuestionIndex + 1} of {questions.length}</p>
                        </div>
                        <div className="flex items-center gap-3 bg-secondary/50 px-4 py-2 rounded-full">
                            <Timer className="h-5 w-5 text-primary animate-pulse" />
                            <span className="font-mono font-medium text-lg">
                                {Math.floor((Date.now() - startTime) / 60000)}m
                            </span>
                        </div>
                    </div>
                    <Progress value={progress} className="h-3 rounded-full" />
                </div>

                {/* Question Card */}
                <div className="min-h-[400px] flex items-center">
                    <QuestionCard
                        question={currentQuestion}
                        selectedOption={answers[currentQuestion.id]}
                        onSelectOption={handleSelectOption}
                        questionNumber={currentQuestionIndex + 1}
                        totalQuestions={questions.length}
                    />
                </div>

                {/* Navigation */}
                <div className="flex justify-between pt-4 px-2">
                    <Button
                        variant="ghost"
                        size="lg"
                        onClick={handlePrevious}
                        disabled={currentQuestionIndex === 0}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="mr-2 h-5 w-5" />
                        Previous
                    </Button>

                    {currentQuestionIndex === questions.length - 1 ? (
                        <Button
                            size="lg"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="bg-green-600 hover:bg-green-700 px-8 shadow-lg shadow-green-600/20"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Exam'}
                        </Button>
                    ) : (
                        <Button size="lg" onClick={handleNext} className="px-8 shadow-lg shadow-primary/20">
                            Next
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Sidebar / Proctoring Feed */}
            <div className="lg:w-64 flex flex-col gap-6">
                {/* Camera Feed - Sticky on Desktop */}
                <div className="sticky top-8">
                    <div className="mb-4">
                        <h3 className="font-semibold mb-1">Proctoring Active</h3>
                        <p className="text-xs text-muted-foreground">Your session is being monitored.</p>
                    </div>

                    <WebcamMonitor
                        onPermissionGranted={() => setCameraPermission(true)}
                        onPermissionDenied={() => setCameraPermission(false)}
                    />

                    {/* Exam Rules / Info */}
                    <div className="mt-6 space-y-4 p-4 bg-secondary/20 rounded-xl border border-border/50 text-sm">
                        <div className="flex gap-2 text-muted-foreground">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span>Do not switch tabs</span>
                        </div>
                        <div className="flex gap-2 text-muted-foreground">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span>Keep face in frame</span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
