'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { useForm, useFieldArray, Controller, FormProvider } from 'react-hook-form';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Save } from 'lucide-react';
import Link from 'next/link';
import { QuestionBuilder } from '@/components/admin/QuestionBuilder';
import { getExamWithQuestions, updateExam, Question, ExamData } from '@/lib/admin/exams';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface ExamFormValues extends Omit<ExamData, 'totalQuestions'> {
  questions: Question[];
}

export default function EditExamPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const firestore = useFirestore();
    const { toast } = useToast();

    const examId = params.examId as string;
    const courseId = searchParams.get('courseId') || '';

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const methods = useForm<ExamFormValues>({
      defaultValues: {
        name: '',
        description: '',
        courseId: courseId,
        duration: 60,
        passingScore: 70,
        price: 99,
        status: 'draft',
        questions: [],
      }
    });

    const { control, register, handleSubmit, reset, watch } = methods;

    const { fields, append, remove } = useFieldArray({
        control,
        name: "questions",
    });

    const questions = watch("questions");

    useEffect(() => {
        if (!firestore || !examId || !courseId) return;

        const loadExam = async () => {
            try {
                setLoading(true);
                const exam = await getExamWithQuestions(firestore, courseId, examId);

                if (!exam) {
                    toast({ title: 'Error', description: 'Exam not found', variant: 'destructive' });
                    router.push('/admin/exams');
                    return;
                }

                reset({
                    name: exam.name,
                    description: exam.description,
                    courseId: exam.courseId,
                    duration: exam.duration,
                    passingScore: exam.passingScore,
                    price: exam.price || 0,
                    status: exam.status || 'draft',
                    questions: exam.questions,
                });

            } catch (error) {
                console.error('Error loading exam:', error);
                toast({ title: 'Error', description: 'Failed to load exam', variant: 'destructive' });
            } finally {
                setLoading(false);
            }
        };

        loadExam();
    }, [firestore, examId, courseId, reset, router, toast]);

    const handleAddQuestion = () => {
        append({
            id: `q${Date.now()}`,
            text: '',
            type: 'multiple-choice',
            options: ['', '', '', ''],
            correctAnswer: '',
            explanation: '',
            points: 1,
        });
    };

    const processSave = async (data: ExamFormValues) => {
        if (!firestore) return;

        setSaving(true);
        try {
            const { questions, ...examDataPart } = data;
            const examDataToSave = {
                ...examDataPart,
                totalQuestions: questions.length,
            };

            await updateExam(firestore, courseId, examId, examDataToSave, questions);
            toast({ title: 'Success', description: 'Exam updated successfully' });
            router.push('/admin/exams');

        } catch (error) {
            console.error('Error updating exam:', error);
            toast({ title: 'Error', description: 'Failed to update exam', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto py-8 px-4 max-w-5xl">
                <Skeleton className="h-10 w-64 mb-6" />
                <Skeleton className="h-[600px] w-full" />
            </div>
        );
    }

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(processSave)} className="container mx-auto py-8 px-4 max-w-5xl">
                <div className="mb-6">
                    <Link
                        href="/admin/exams"
                        className="text-sm text-muted-foreground hover:text-primary flex items-center mb-4"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Exams
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight">Edit Exam</h1>
                    <p className="text-muted-foreground mt-2">Update exam settings and questions</p>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Exam Settings</CardTitle>
                            <CardDescription>Basic information about the exam</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="exam-name">Exam Name *</Label>
                                <Input
                                    id="exam-name"
                                    {...register("name")}
                                    placeholder="e.g., ความรู้ทั่วไป ชุดที่ 1"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="exam-description">Description</Label>
                                <Textarea
                                    id="exam-description"
                                    {...register("description")}
                                    placeholder="Brief description of the exam..."
                                    rows={3}
                                />
                            </div>

                            <div className="flex flex-wrap gap-4">
                                <div className="space-y-2 flex-1 basis-48">
                                    <Label htmlFor="exam-duration">Duration (minutes)</Label>
                                    <Input
                                        id="exam-duration"
                                        type="number"
                                        min="1"
                                        {...register("duration", { valueAsNumber: true })}
                                    />
                                </div>

                                <div className="space-y-2 flex-1 basis-48">
                                    <Label htmlFor="exam-passing-score">Passing Score (%)</Label>
                                    <Input
                                        id="exam-passing-score"
                                        type="number"
                                        min="0"
                                        max="100"
                                        {...register("passingScore", { valueAsNumber: true })}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-4">
                                <div className="space-y-2 flex-1 basis-48">
                                    <Label htmlFor="exam-price">Price (tokens)</Label>
                                    <Input
                                        id="exam-price"
                                        type="number"
                                        min="0"
                                        {...register("price", { valueAsNumber: true })}
                                    />
                                </div>

                                <div className="space-y-2 flex-1 basis-48">
                                    <Label htmlFor="exam-status">Status</Label>
                                    <Controller
                                        name="status"
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger id="exam-status">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="draft">Draft</SelectItem>
                                                    <SelectItem value="published">Published</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Questions ({questions.length})</CardTitle>
                                    <CardDescription>Add and configure exam questions</CardDescription>
                                </div>
                                <Button type="button" onClick={handleAddQuestion} variant="outline">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Question
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {fields.map((field, index) => (
                                <QuestionBuilder
                                    key={field.id}
                                    index={index}
                                    onRemove={() => remove(index)}
                                />
                            ))}
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-4">
                        <Button type="button" variant="outline" onClick={() => router.push('/admin/exams')}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                        </Button>
                    </div>
                </div>
            </form>
        </FormProvider>
    );
}
