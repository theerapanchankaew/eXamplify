'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useFirestore } from '@/firebase';
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
import {
    getExamWithQuestions,
    updateExam,
    Question,
    ExamData,
    ExamWithQuestions,
} from '@/lib/admin/exams';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

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
    const [examData, setExamData] = useState<ExamData>({
        name: '',
        description: '',
        courseId: courseId,
        duration: 60,
        passingScore: 70,
        price: 99,
        totalQuestions: 0,
        status: 'draft',
    });

    const [questions, setQuestions] = useState<Question[]>([]);

    useEffect(() => {
        if (!firestore || !examId || !courseId) return;

        loadExam();
    }, [firestore, examId, courseId]);

    const loadExam = async () => {
        if (!firestore || !examId || !courseId) return;

        try {
            setLoading(true);
            const exam = await getExamWithQuestions(firestore, courseId, examId);

            if (!exam) {
                toast({
                    title: 'Error',
                    description: 'Exam not found',
                    variant: 'destructive',
                });
                router.push('/admin/exams');
                return;
            }

            setExamData({
                name: exam.name,
                description: exam.description,
                courseId: exam.courseId,
                duration: exam.duration,
                passingScore: exam.passingScore,
                price: exam.price,
                totalQuestions: exam.totalQuestions,
                status: exam.status,
            });

            setQuestions(exam.questions);
        } catch (error) {
            console.error('Error loading exam:', error);
            toast({
                title: 'Error',
                description: 'Failed to load exam',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAddQuestion = () => {
        const newQuestion: Question = {
            id: `q${questions.length + 1}`,
            text: '',
            type: 'multiple-choice',
            options: ['', '', '', ''],
            correctAnswer: '',
            explanation: '',
            points: 1,
        };
        setQuestions([...questions, newQuestion]);
    };

    const handleUpdateQuestion = (index: number, updatedQuestion: Question) => {
        const newQuestions = [...questions];
        newQuestions[index] = updatedQuestion;
        setQuestions(newQuestions);
    };

    const handleDeleteQuestion = (index: number) => {
        if (questions.length === 1) {
            toast({
                title: 'Error',
                description: 'Exam must have at least one question',
                variant: 'destructive',
            });
            return;
        }
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const validateForm = (): boolean => {
        if (!examData.name.trim()) {
            toast({
                title: 'Validation Error',
                description: 'Exam name is required',
                variant: 'destructive',
            });
            return false;
        }

        if (questions.length === 0) {
            toast({
                title: 'Validation Error',
                description: 'Exam must have at least one question',
                variant: 'destructive',
            });
            return false;
        }

        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.text.trim()) {
                toast({
                    title: 'Validation Error',
                    description: `Question ${i + 1} text is required`,
                    variant: 'destructive',
                });
                return false;
            }

            if (q.type === 'multiple-choice') {
                if (!q.options || q.options.length < 2) {
                    toast({
                        title: 'Validation Error',
                        description: `Question ${i + 1} must have at least 2 options`,
                        variant: 'destructive',
                    });
                    return false;
                }

                if (!q.correctAnswer) {
                    toast({
                        title: 'Validation Error',
                        description: `Question ${i + 1} must have a correct answer selected`,
                        variant: 'destructive',
                    });
                    return false;
                }
            }
        }

        return true;
    };

    const handleSave = async (status?: 'draft' | 'published') => {
        if (!firestore || !validateForm()) return;

        try {
            setSaving(true);

            const examDataToSave = {
                ...examData,
                ...(status && { status }),
                totalQuestions: questions.length,
            };

            await updateExam(firestore, courseId, examId, examDataToSave, questions);

            toast({
                title: 'Success',
                description: 'Exam updated successfully',
            });

            router.push('/admin/exams');
        } catch (error) {
            console.error('Error updating exam:', error);
            toast({
                title: 'Error',
                description: 'Failed to update exam',
                variant: 'destructive',
            });
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
        <div className="container mx-auto py-8 px-4 max-w-5xl">
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
                {/* Exam Settings */}
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
                                value={examData.name}
                                onChange={(e) => setExamData({ ...examData, name: e.target.value })}
                                placeholder="e.g., ความรู้ทั่วไป ชุดที่ 1"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="exam-description">Description</Label>
                            <Textarea
                                id="exam-description"
                                value={examData.description}
                                onChange={(e) => setExamData({ ...examData, description: e.target.value })}
                                placeholder="Brief description of the exam..."
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="exam-duration">Duration (minutes)</Label>
                                <Input
                                    id="exam-duration"
                                    type="number"
                                    min="1"
                                    value={examData.duration}
                                    onChange={(e) =>
                                        setExamData({ ...examData, duration: parseInt(e.target.value) || 60 })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="exam-passing-score">Passing Score (%)</Label>
                                <Input
                                    id="exam-passing-score"
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={examData.passingScore}
                                    onChange={(e) =>
                                        setExamData({ ...examData, passingScore: parseInt(e.target.value) || 70 })
                                    }
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="exam-price">Price (tokens)</Label>
                                <Input
                                    id="exam-price"
                                    type="number"
                                    min="0"
                                    value={examData.price}
                                    onChange={(e) =>
                                        setExamData({ ...examData, price: parseInt(e.target.value) || 0 })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="exam-status">Status</Label>
                                <Select
                                    value={examData.status}
                                    onValueChange={(value: 'draft' | 'published') =>
                                        setExamData({ ...examData, status: value })
                                    }
                                >
                                    <SelectTrigger id="exam-status">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="published">Published</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Questions */}
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Questions ({questions.length})</CardTitle>
                                <CardDescription>Add and configure exam questions</CardDescription>
                            </div>
                            <Button onClick={handleAddQuestion} variant="outline">
                                <Plus className="mr-2 h-4 w-4" />
                                Add Question
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {questions.map((question, index) => (
                            <QuestionBuilder
                                key={question.id}
                                question={question}
                                index={index}
                                onUpdate={(updated) => handleUpdateQuestion(index, updated)}
                                onDelete={() => handleDeleteQuestion(index)}
                            />
                        ))}
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex justify-end gap-4">
                    <Button variant="outline" onClick={() => router.push('/admin/exams')}>
                        Cancel
                    </Button>
                    <Button onClick={() => handleSave()} disabled={saving}>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                    </Button>
                </div>
            </div>
        </div>
    );
}
