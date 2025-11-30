import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { QuestionCard } from './QuestionCard';
import { ExamResults } from './ExamResults';
import { WebcamMonitor } from './WebcamMonitor';
import { QuestionNavigator } from './QuestionNavigator';
import { ExamReview } from './ExamReview';
import { ArrowRight, ArrowLeft, Timer, AlertTriangle, Flag, LayoutGrid } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useFunctions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import { useExamState } from '@/hooks/use-exam-state';
import { cn } from '@/lib/utils';

interface Question {
    id: string;
    text: string;
    type: 'Multiple Choice' | 'True/False' | 'Short Answer';
    options?: string[];
    points: number;
}

interface Exam {
    id: string;
    name: string;
    description: string;
    courseId: string;
    passingScore?: number;
}

interface ExamTakerProps {
    exam: Exam;
    questions: Question[];
}

export function ExamTaker({ exam, questions }: ExamTakerProps) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useUser();
    const functions = useFunctions();

    // Use custom hook for persistent state
    const {
        state,
        setAnswer,
        toggleFlag,
        setCurrentQuestionIndex,
        clearState,
        finishExam
    } = useExamState({
        examId: exam.id,
        userId: user?.uid || 'anonymous',
        totalQuestions: questions.length
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [view, setView] = useState<'question' | 'review'>('question');
    const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);

    // Calculate total points
    const totalPoints = questions.reduce((acc, q) => acc + (q.points || 1), 0);
    const passingScore = exam.passingScore || 50;

    const handleSelectOption = (value: string) => {
        setAnswer(questions[state.currentQuestionIndex].id, value);
    };

    const handleNext = () => {
        if (state.currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(state.currentQuestionIndex + 1);
        } else {
            setView('review');
        }
    };

    const handlePrevious = () => {
        if (state.currentQuestionIndex > 0) {
            setCurrentQuestionIndex(state.currentQuestionIndex - 1);
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
            const gradeExamFn = httpsCallable(functions, 'gradeExam');

            const result = await gradeExamFn({
                examId: exam.id,
                courseId: exam.courseId,
                answers: state.answers,
                startTime: state.startTime,
            });

            const data = result.data as {
                score: number;
                totalPoints: number;
                percentage: number;
                passed: boolean;
                certificateIssued: boolean;
                resultId: string;
            };

            // Clear local storage state
            clearState();

            // Mark as finished in local state to show results
            finishExam();

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

            // Redirect to results page after a short delay
            setTimeout(() => {
                window.location.href = `/exams/${exam.id}/results?courseId=${exam.courseId}`;
            }, 2000);

        } catch (error: any) {
            console.error("Error submitting exam:", error);
            toast({
                variant: "destructive",
                title: "Submission Failed",
                description: error.message || "Failed to submit exam. Please try again.",
            });
            setIsSubmitting(false);
        }
    };

    const handleRetake = () => {
        clearState();
        window.location.reload();
    };

    if (questions.length === 0) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold">No questions available.</h2>
                <p className="text-muted-foreground">Please contact your instructor.</p>
            </div>
        );
    }

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

    // Since we redirect on success, we don't strictly need to show ExamResults here,
    // but we keep it for immediate feedback if redirect is slow or fails
    if (state.isFinished) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <h2 className="text-xl font-semibold">Processing Results...</h2>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[state.currentQuestionIndex];
    const progress = ((state.currentQuestionIndex + 1) / questions.length) * 100;
    const isFlagged = state.flaggedQuestions.includes(currentQuestion.id);

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 relative pb-20">

            {/* Main Content Area */}
            <div className="flex-1 space-y-6">
                {/* Header / Progress */}
                <div className="space-y-4 bg-white/50 dark:bg-zinc-900/50 p-6 rounded-2xl backdrop-blur-sm border border-border/50">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">{exam.name}</h2>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                {view === 'question' ? (
                                    <span>Question {state.currentQuestionIndex + 1} of {questions.length}</span>
                                ) : (
                                    <span>Review Mode</span>
                                )}
                                {isFlagged && view === 'question' && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                        <Flag className="w-3 h-3 mr-1" /> Flagged
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-secondary/50 px-4 py-2 rounded-full">
                            <Timer className="h-5 w-5 text-primary animate-pulse" />
                            <span className="font-mono font-medium text-lg">
                                {Math.floor((Date.now() - state.startTime) / 60000)}m
                            </span>
                        </div>
                    </div>
                    <Progress value={progress} className="h-2 rounded-full" />
                </div>

                {view === 'review' ? (
                    <ExamReview
                        questions={questions}
                        answers={state.answers}
                        flaggedQuestions={state.flaggedQuestions}
                        onNavigateToQuestion={(index) => {
                            setCurrentQuestionIndex(index);
                            setView('question');
                        }}
                        onSubmit={handleSubmit}
                        isSubmitting={isSubmitting}
                    />
                ) : (
                    <>
                        {/* Question Card */}
                        <div className="min-h-[400px] flex items-center">
                            <QuestionCard
                                question={currentQuestion}
                                selectedOption={state.answers[currentQuestion.id]}
                                onSelectOption={handleSelectOption}
                                questionNumber={state.currentQuestionIndex + 1}
                                totalQuestions={questions.length}
                            />
                        </div>

                        {/* Navigation */}
                        <div className="flex justify-between pt-4 px-2">
                            <Button
                                variant="ghost"
                                size="lg"
                                onClick={handlePrevious}
                                disabled={state.currentQuestionIndex === 0}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <ArrowLeft className="mr-2 h-5 w-5" />
                                Previous
                            </Button>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="lg"
                                    onClick={() => toggleFlag(currentQuestion.id)}
                                    className={cn(
                                        "border-amber-200 hover:bg-amber-50 hover:text-amber-600 dark:border-amber-900 dark:hover:bg-amber-900/20",
                                        isFlagged && "bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400"
                                    )}
                                >
                                    <Flag className={cn("mr-2 h-5 w-5", isFlagged && "fill-current")} />
                                    {isFlagged ? 'Flagged' : 'Flag'}
                                </Button>

                                {state.currentQuestionIndex === questions.length - 1 ? (
                                    <Button
                                        size="lg"
                                        onClick={() => setView('review')}
                                        className="px-8"
                                    >
                                        Review Answers
                                    </Button>
                                ) : (
                                    <Button size="lg" onClick={handleNext} className="px-8 shadow-lg shadow-primary/20">
                                        Next
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Sidebar / Proctoring Feed */}
            <div className="lg:w-80 flex flex-col gap-6">
                {/* Camera Feed - Sticky on Desktop */}
                <div className="sticky top-8 space-y-6">
                    <div>
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="font-semibold">Proctoring Active</h3>
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        </div>

                        <WebcamMonitor
                            onPermissionGranted={() => setCameraPermission(true)}
                            onPermissionDenied={() => setCameraPermission(false)}
                        />
                    </div>

                    {/* Question Navigator */}
                    <div className="bg-card border rounded-xl p-4 shadow-sm">
                        <QuestionNavigator
                            totalQuestions={questions.length}
                            currentIndex={view === 'question' ? state.currentQuestionIndex : -1}
                            answers={state.answers}
                            flaggedQuestions={state.flaggedQuestions}
                            questions={questions}
                            onSelectQuestion={(index) => {
                                setCurrentQuestionIndex(index);
                                setView('question');
                            }}
                        />
                    </div>

                    {/* Exam Rules / Info */}
                    <div className="p-4 bg-secondary/20 rounded-xl border border-border/50 text-sm space-y-3">
                        <div className="font-medium flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            Exam Rules
                        </div>
                        <ul className="space-y-2 text-muted-foreground text-xs list-disc list-inside">
                            <li>Do not switch tabs or windows</li>
                            <li>Keep your face visible in the frame</li>
                            <li>Your progress is saved automatically</li>
                        </ul>
                    </div>

                    {view === 'question' && (
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setView('review')}
                        >
                            <LayoutGrid className="mr-2 h-4 w-4" />
                            Overview & Submit
                        </Button>
                    )}
                </div>
            </div>

        </div>
    );
}
