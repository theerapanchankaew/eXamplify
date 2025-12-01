'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { X, Plus, GripVertical } from 'lucide-react';
import { Question } from '@/lib/admin/exams';

interface QuestionBuilderProps {
    question: Question;
    index: number;
    onUpdate: (question: Question) => void;
    onDelete: () => void;
}

export function QuestionBuilder({
    question,
    index,
    onUpdate,
    onDelete,
}: QuestionBuilderProps) {
    const [localQuestion, setLocalQuestion] = useState<Question>(question);

    const handleUpdate = (updates: Partial<Question>) => {
        const updated = { ...localQuestion, ...updates };
        setLocalQuestion(updated);
        onUpdate(updated);
    };

    const handleAddOption = () => {
        const newOptions = [...(localQuestion.options || []), ''];
        handleUpdate({ options: newOptions });
    };

    const handleUpdateOption = (optionIndex: number, value: string) => {
        const newOptions = [...(localQuestion.options || [])];
        newOptions[optionIndex] = value;
        handleUpdate({ options: newOptions });
    };

    const handleDeleteOption = (optionIndex: number) => {
        const newOptions = (localQuestion.options || []).filter((_, i) => i !== optionIndex);
        handleUpdate({ options: newOptions });
    };

    const handleCorrectAnswerChange = (value: string) => {
        handleUpdate({ correctAnswer: value });
    };

    return (
        <Card className="mb-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center gap-2">
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                    <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onDelete}
                    className="text-destructive hover:text-destructive"
                >
                    <X className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Question Text */}
                <div className="space-y-2">
                    <Label htmlFor={`question-text-${question.id}`}>Question Text</Label>
                    <Textarea
                        id={`question-text-${question.id}`}
                        value={localQuestion.text}
                        onChange={(e) => handleUpdate({ text: e.target.value })}
                        placeholder="Enter your question here..."
                        rows={3}
                    />
                </div>

                {/* Question Type and Points */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor={`question-type-${question.id}`}>Type</Label>
                        <Select
                            value={localQuestion.type}
                            onValueChange={(value: Question['type']) =>
                                handleUpdate({ type: value })
                            }
                        >
                            <SelectTrigger id={`question-type-${question.id}`}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                                <SelectItem value="true-false">True/False</SelectItem>
                                <SelectItem value="essay">Essay</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor={`question-points-${question.id}`}>Points</Label>
                        <Input
                            id={`question-points-${question.id}`}
                            type="number"
                            min="1"
                            value={localQuestion.points}
                            onChange={(e) => handleUpdate({ points: parseInt(e.target.value) || 1 })}
                        />
                    </div>
                </div>

                {/* Options (for multiple-choice and true-false) */}
                {(localQuestion.type === 'multiple-choice' || localQuestion.type === 'true-false') && (
                    <div className="space-y-2">
                        <Label>Options</Label>
                        <RadioGroup
                            value={localQuestion.correctAnswer}
                            onValueChange={handleCorrectAnswerChange}
                        >
                            {localQuestion.type === 'true-false' ? (
                                <>
                                    <div className="flex items-center space-x-2 p-3 border rounded-md">
                                        <RadioGroupItem value="True" id={`${question.id}-true`} />
                                        <Label htmlFor={`${question.id}-true`} className="flex-1 cursor-pointer">
                                            True
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2 p-3 border rounded-md">
                                        <RadioGroupItem value="False" id={`${question.id}-false`} />
                                        <Label htmlFor={`${question.id}-false`} className="flex-1 cursor-pointer">
                                            False
                                        </Label>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {(localQuestion.options || []).map((option, optionIndex) => (
                                        <div
                                            key={optionIndex}
                                            className="flex items-center space-x-2 p-2 border rounded-md"
                                        >
                                            <RadioGroupItem
                                                value={option}
                                                id={`${question.id}-option-${optionIndex}`}
                                            />
                                            <Input
                                                value={option}
                                                onChange={(e) => handleUpdateOption(optionIndex, e.target.value)}
                                                placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                                                className="flex-1"
                                            />
                                            {(localQuestion.options?.length || 0) > 2 && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteOption(optionIndex)}
                                                    className="text-destructive"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleAddOption}
                                        className="w-full"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Option
                                    </Button>
                                </>
                            )}
                        </RadioGroup>
                    </div>
                )}

                {/* Correct Answer (for essay) */}
                {localQuestion.type === 'essay' && (
                    <div className="space-y-2">
                        <Label htmlFor={`question-answer-${question.id}`}>Model Answer</Label>
                        <Textarea
                            id={`question-answer-${question.id}`}
                            value={localQuestion.correctAnswer}
                            onChange={(e) => handleUpdate({ correctAnswer: e.target.value })}
                            placeholder="Enter a model answer or grading criteria..."
                            rows={3}
                        />
                    </div>
                )}

                {/* Explanation */}
                <div className="space-y-2">
                    <Label htmlFor={`question-explanation-${question.id}`}>
                        Explanation (Optional)
                    </Label>
                    <Textarea
                        id={`question-explanation-${question.id}`}
                        value={localQuestion.explanation || ''}
                        onChange={(e) => handleUpdate({ explanation: e.target.value })}
                        placeholder="Explain why this is the correct answer..."
                        rows={2}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
