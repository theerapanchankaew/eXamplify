'use client';

import { useFieldArray, useFormContext, Controller } from 'react-hook-form';
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

interface QuestionBuilderProps {
    index: number;
    onRemove: () => void;
}

export function QuestionBuilder({ index, onRemove }: QuestionBuilderProps) {
    const { control, register, watch } = useFormContext();
    const questionPath = `questions.${index}` as const;
    const question = watch(questionPath);
    const questionType = question.type;

    const { fields: options, append, remove } = useFieldArray({
        control,
        name: `${questionPath}.options`,
    });

    return (
        <Card className="mb-4 relative">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center gap-2">
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                    <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={onRemove}
                    className="text-destructive hover:text-destructive"
                >
                    <X className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Question Text */}
                <div className="space-y-2">
                    <Label htmlFor={`${questionPath}.text`}>Question Text</Label>
                    <Textarea
                        id={`${questionPath}.text`}
                        {...register(`${questionPath}.text`)}
                        placeholder="Enter your question here..."
                        rows={3}
                    />
                </div>

                {/* Question Type and Points */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Type</Label>
                        <Controller
                            name={`${questionPath}.type`}
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                                        <SelectItem value="true-false">True/False</SelectItem>
                                        <SelectItem value="essay">Essay</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor={`${questionPath}.points`}>Points</Label>
                        <Input
                            id={`${questionPath}.points`}
                            type="number"
                            min="1"
                            {...register(`${questionPath}.points`, { valueAsNumber: true })}
                        />
                    </div>
                </div>

                {/* --- Options & Correct Answer Logic --- */}

                {/* Multiple Choice */}
                {questionType === 'multiple-choice' && (
                     <Controller
                        name={`${questionPath}.correctAnswer`}
                        control={control}
                        render={({ field: correctAnswerField }) => {
                            const selectedIndex = (question.options || []).indexOf(correctAnswerField.value);
                            const handleRadioChange = (selectedIndexStr: string) => {
                                const index = parseInt(selectedIndexStr, 10);
                                const options = watch(`${questionPath}.options`);
                                if (options && options[index] !== undefined) {
                                    correctAnswerField.onChange(options[index]);
                                }
                            };

                            return (
                                <div className="space-y-2">
                                  <Label>Options & Correct Answer</Label>
                                  <RadioGroup
                                    onValueChange={handleRadioChange}
                                    value={selectedIndex > -1 ? selectedIndex.toString() : undefined}
                                    className="space-y-2"
                                  >
                                    {options.map((option, optionIndex) => (
                                        <div key={option.id} className="flex items-center space-x-2 p-2 border rounded-md">
                                            <RadioGroupItem value={optionIndex.toString()} id={`${questionPath}-opt-${optionIndex}`} />
                                            <Input
                                                {...register(`${questionPath}.options.${optionIndex}` as const)}
                                                placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                                                className="flex-1"
                                            />
                                            {options.length > 2 && (
                                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(optionIndex)} className="text-destructive">
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                  </RadioGroup>
                                  <Button type="button" variant="outline" size="sm" onClick={() => append('')} className="w-full mt-2">
                                      <Plus className="h-4 w-4 mr-2" />
                                      Add Option
                                  </Button>
                                </div>
                            );
                        }}
                    />
                )}

                {/* True/False */}
                {questionType === 'true-false' && (
                    <Controller
                        name={`${questionPath}.correctAnswer`}
                        control={control}
                        render={({ field }) => (
                            <div className="space-y-2">
                                <Label>Correct Answer</Label>
                                <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-2">
                                    <div className="flex items-center space-x-2 p-3 border rounded-md">
                                        <RadioGroupItem value="True" id={`${questionPath}-true`} />
                                        <Label htmlFor={`${questionPath}-true`} className="flex-1 cursor-pointer">True</Label>
                                    </div>
                                    <div className="flex items-center space-x-2 p-3 border rounded-md">
                                        <RadioGroupItem value="False" id={`${questionPath}-false`} />
                                        <Label htmlFor={`${questionPath}-false`} className="flex-1 cursor-pointer">False</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        )}
                    />
                )}

                {/* Essay Answer */}
                {questionType === 'essay' && (
                    <div className="space-y-2">
                        <Label htmlFor={`${questionPath}.correctAnswer`}>Model Answer</Label>
                        <Textarea
                            id={`${questionPath}.correctAnswer`}
                            {...register(`${questionPath}.correctAnswer`)}
                            placeholder="Enter a model answer or grading criteria..."
                            rows={3}
                        />
                    </div>
                )}

                {/* Explanation */}
                <div className="space-y-2">
                    <Label htmlFor={`${questionPath}.explanation`}>Explanation (Optional)</Label>
                    <Textarea
                        id={`${questionPath}.explanation`}
                        {...register(`${questionPath}.explanation`)}
                        placeholder="Explain why this is the correct answer..."
                        rows={2}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
