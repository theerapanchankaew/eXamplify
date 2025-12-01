'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Copy, Search } from 'lucide-react';
import { listExams, deleteExam, duplicateExam, ExamWithQuestions } from '@/lib/admin/exams';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function ManageExamsPage() {
    const router = useRouter();
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    const [exams, setExams] = useState<ExamWithQuestions[]>([]);
    const [filteredExams, setFilteredExams] = useState<ExamWithQuestions[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [examToDelete, setExamToDelete] = useState<{ courseId: string; examId: string } | null>(
        null
    );

    // Load exams
    useEffect(() => {
        if (!firestore) return;

        loadExams();
    }, [firestore]);

    // Filter exams
    useEffect(() => {
        let filtered = exams;

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter((exam) => exam.status === statusFilter);
        }

        // Search filter
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(
                (exam) =>
                    exam.name.toLowerCase().includes(searchLower) ||
                    exam.description?.toLowerCase().includes(searchLower)
            );
        }

        setFilteredExams(filtered);
    }, [exams, searchTerm, statusFilter]);

    const loadExams = async () => {
        if (!firestore) return;

        try {
            setLoading(true);
            const examsList = await listExams(firestore);
            setExams(examsList);
            setFilteredExams(examsList);
        } catch (error) {
            console.error('Error loading exams:', error);
            toast({
                title: 'Error',
                description: 'Failed to load exams',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!firestore || !examToDelete) return;

        try {
            await deleteExam(firestore, examToDelete.courseId, examToDelete.examId);
            toast({
                title: 'Success',
                description: 'Exam deleted successfully',
            });
            loadExams();
        } catch (error) {
            console.error('Error deleting exam:', error);
            toast({
                title: 'Error',
                description: 'Failed to delete exam',
                variant: 'destructive',
            });
        } finally {
            setDeleteDialogOpen(false);
            setExamToDelete(null);
        }
    };

    const handleDuplicate = async (courseId: string, examId: string) => {
        if (!firestore) return;

        try {
            const newExamId = await duplicateExam(firestore, courseId, examId);
            toast({
                title: 'Success',
                description: 'Exam duplicated successfully',
            });
            loadExams();
            router.push(`/admin/exams/${newExamId}/edit?courseId=${courseId}`);
        } catch (error) {
            console.error('Error duplicating exam:', error);
            toast({
                title: 'Error',
                description: 'Failed to duplicate exam',
                variant: 'destructive',
            });
        }
    };

    const openDeleteDialog = (courseId: string, examId: string) => {
        setExamToDelete({ courseId, examId });
        setDeleteDialogOpen(true);
    };

    if (loading) {
        return (
            <div className="container mx-auto py-8 px-4">
                <Skeleton className="h-10 w-64 mb-6" />
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Manage Exams</h1>
                    <p className="text-muted-foreground mt-2">
                        Create and manage exams for your courses
                    </p>
                </div>
                <Button onClick={() => router.push('/admin/exams/new')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Exam
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search exams..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="published">Published</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredExams.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">No exams found</p>
                            <Button
                                variant="outline"
                                className="mt-4"
                                onClick={() => router.push('/admin/exams/new')}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Create Your First Exam
                            </Button>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Exam Name</TableHead>
                                        <TableHead>Course</TableHead>
                                        <TableHead className="text-center">Questions</TableHead>
                                        <TableHead className="text-center">Duration</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredExams.map((exam) => (
                                        <TableRow key={exam.id}>
                                            <TableCell className="font-medium">{exam.name}</TableCell>
                                            <TableCell>{exam.courseId}</TableCell>
                                            <TableCell className="text-center">{exam.totalQuestions}</TableCell>
                                            <TableCell className="text-center">{exam.duration} min</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={exam.status === 'published' ? 'default' : 'secondary'}>
                                                    {exam.status || 'draft'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            router.push(`/admin/exams/${exam.id}/edit?courseId=${exam.courseId}`)
                                                        }
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDuplicate(exam.courseId, exam.id)}
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openDeleteDialog(exam.courseId, exam.id)}
                                                        className="text-destructive hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this exam and all its questions. This action cannot be
                            undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
