import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Flag } from 'lucide-react';

interface ExamReviewProps {
    questions: { id: string; text: string }[];
    answers: Record<string, string>;
    flaggedQuestions: string[];
    onNavigateToQuestion: (index: number) => void;
    onSubmit: () => void;
    isSubmitting: boolean;
}

export function ExamReview({
    questions,
    answers,
    flaggedQuestions,
    onNavigateToQuestion,
    onSubmit,
    isSubmitting
}: ExamReviewProps) {
    const answeredCount = Object.keys(answers).length;
    const flaggedCount = flaggedQuestions.length;
    const unansweredCount = questions.length - answeredCount;

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold">Review Your Answers</h2>
                <p className="text-muted-foreground">
                    Please review your answers before submitting. You can go back to any question to make changes.
                </p>
            </div>

            <div className="flex flex-wrap gap-4">
                <div className="flex-1 basis-64 bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border border-green-200 dark:border-green-900 text-center">
                    <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mb-3">
                        <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-400">{answeredCount}</div>
                    <div className="text-sm text-green-600 dark:text-green-500">Answered</div>
                </div>

                <div className="flex-1 basis-64 bg-amber-50 dark:bg-amber-900/20 p-6 rounded-xl border border-amber-200 dark:border-amber-900 text-center">
                    <div className="mx-auto w-12 h-12 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center mb-3">
                        <Flag className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{flaggedCount}</div>
                    <div className="text-sm text-amber-600 dark:text-amber-500">Flagged</div>
                </div>

                <div className="flex-1 basis-64 bg-slate-50 dark:bg-slate-900/20 p-6 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                    <div className="mx-auto w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                        <AlertCircle className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div className="text-2xl font-bold text-slate-700 dark:text-slate-400">{unansweredCount}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-500">Unanswered</div>
                </div>
            </div>

            <div className="bg-card border rounded-xl overflow-hidden">
                <div className="p-4 bg-muted/50 border-b font-medium flex items-center gap-4">
                    <div className="w-12 text-center">#</div>
                    <div className="flex-1">Question</div>
                    <div className="w-32 text-center">Status</div>
                </div>
                <div className="divide-y max-h-[400px] overflow-y-auto">
                    {questions.map((q, index) => {
                        const isAnswered = !!answers[q.id];
                        const isFlagged = flaggedQuestions.includes(q.id);

                        return (
                            <div
                                key={q.id}
                                className="p-4 flex items-center gap-4 hover:bg-muted/50 cursor-pointer transition-colors"
                                onClick={() => onNavigateToQuestion(index)}
                            >
                                <div className="w-12 text-center font-medium text-muted-foreground">
                                    {index + 1}
                                </div>
                                <div className="flex-1 line-clamp-1 font-medium">
                                    {q.text}
                                </div>
                                <div className="w-32 flex justify-center gap-2">
                                    {isFlagged && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                            Flagged
                                        </span>
                                    )}
                                    {isAnswered ? (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                            Answered
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400">
                                            Skipped
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
                <Button
                    size="lg"
                    onClick={onSubmit}
                    disabled={isSubmitting}
                    className="bg-green-600 hover:bg-green-700 px-8 min-w-[200px]"
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Exam'}
                </Button>
            </div>
        </div>
    );
}
