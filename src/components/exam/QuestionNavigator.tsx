import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Flag } from 'lucide-react';

interface QuestionNavigatorProps {
    totalQuestions: number;
    currentIndex: number;
    answers: Record<string, string>;
    flaggedQuestions: string[];
    onSelectQuestion: (index: number) => void;
    questions: { id: string }[];
}

export function QuestionNavigator({
    totalQuestions,
    currentIndex,
    answers,
    flaggedQuestions,
    onSelectQuestion,
    questions
}: QuestionNavigatorProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold">Questions</h3>
                <span className="text-xs text-muted-foreground">
                    {Object.keys(answers).length}/{totalQuestions} Answered
                </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
                {questions.map((q, index) => {
                    const isAnswered = !!answers[q.id];
                    const isFlagged = flaggedQuestions.includes(q.id);
                    const isCurrent = currentIndex === index;

                    return (
                        <Button
                            key={q.id}
                            variant="outline"
                            size="sm"
                            onClick={() => onSelectQuestion(index)}
                            className={cn(
                                "relative h-10 w-full p-0 font-medium transition-all",
                                isCurrent && "ring-2 ring-primary ring-offset-2 border-primary",
                                isAnswered && !isCurrent && "bg-primary/10 border-primary/50 text-primary",
                                isFlagged && "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30"
                            )}
                        >
                            {index + 1}
                            {isFlagged && (
                                <div className="absolute -top-1 -right-1">
                                    <Flag className="h-3 w-3 text-amber-600 fill-amber-600" />
                                </div>
                            )}
                        </Button>
                    );
                })}
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full border border-primary/50 bg-primary/10" />
                    <span>Answered</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full border border-amber-500 bg-amber-50" />
                    <span>Flagged</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full border border-input" />
                    <span>Unanswered</span>
                </div>
            </div>
        </div>
    );
}
