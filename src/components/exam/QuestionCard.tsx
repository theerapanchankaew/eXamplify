import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

interface Question {
    id: string;
    text: string;
    type: 'Multiple Choice' | 'True/False' | 'Short Answer';
    options?: string[];
    points: number;
}

interface QuestionCardProps {
    question: Question;
    selectedOption: string | undefined;
    onSelectOption: (value: string) => void;
    questionNumber: number;
    totalQuestions: number;
}

export function QuestionCard({
    question,
    selectedOption,
    onSelectOption,
    questionNumber,
    totalQuestions,
}: QuestionCardProps) {
    return (
        <Card className="w-full max-w-3xl mx-auto shadow-2xl border-0 bg-white/80 backdrop-blur-xl dark:bg-zinc-900/80 overflow-hidden transition-all duration-500 hover:shadow-primary/20">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

            <CardHeader className="pb-2">
                <div className="flex justify-between items-center mb-6">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] bg-secondary/50 px-3 py-1 rounded-full">
                        Question {questionNumber} / {totalQuestions}
                    </span>
                    <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                        {question.points} Point{question.points !== 1 && 's'}
                    </span>
                </div>
                <CardTitle className="text-2xl md:text-3xl font-bold leading-tight tracking-tight text-foreground/90">
                    {question.text}
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                {question.type === 'Multiple Choice' || question.type === 'True/False' ? (
                    <RadioGroup
                        value={selectedOption}
                        onValueChange={onSelectOption}
                        className="space-y-4"
                    >
                        {(question.options || ['True', 'False']).map((option, index) => (
                            <div
                                key={index}
                                className={cn(
                                    "relative flex items-center space-x-4 border-2 rounded-xl p-5 cursor-pointer transition-all duration-300 group overflow-hidden",
                                    selectedOption === option
                                        ? "border-primary bg-primary/5 shadow-lg scale-[1.02]"
                                        : "border-transparent bg-secondary/30 hover:bg-secondary/60 hover:border-primary/30"
                                )}
                                onClick={() => onSelectOption(option)}
                            >
                                <div className={cn(
                                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors duration-300",
                                    selectedOption === option ? "border-primary bg-primary" : "border-muted-foreground/30 group-hover:border-primary/50"
                                )}>
                                    {selectedOption === option && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                                </div>

                                <RadioGroupItem value={option} id={`option-${index}`} className="sr-only" />
                                <Label
                                    htmlFor={`option-${index}`}
                                    className="flex-grow cursor-pointer font-medium text-lg text-foreground/80 group-hover:text-foreground transition-colors"
                                >
                                    {option}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                ) : (
                    <div className="space-y-3">
                        <Label htmlFor="answer" className="text-lg font-medium">Your Answer</Label>
                        <textarea
                            id="answer"
                            className="flex min-h-[160px] w-full rounded-xl border-2 border-input bg-white/50 dark:bg-black/20 px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary transition-all resize-none"
                            placeholder="Type your answer here..."
                            value={selectedOption || ''}
                            onChange={(e) => onSelectOption(e.target.value)}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
