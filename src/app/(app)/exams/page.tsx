'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  collection,
  query,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  collectionGroup,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Import, MoreHorizontal, PlusCircle } from 'lucide-react';
import { useDoc } from '@/firebase/firestore/use-doc';

const examSchema = z.object({
  name: z.string().min(1, 'Exam name is required.'),
  description: z.string().min(1, 'Description is required.'),
  courseId: z.string().min(1, 'You must select a course.'),
});

const importedExamSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  questions: z.array(
    z.object({
      id: z.string().optional(),
      type: z.enum(['mcq']),
      text: z.string().min(1),
      options: z.array(z.string()).min(2),
      answer: z.string().min(1),
      points: z.number().positive(),
    })
  ),
});


type ExamFormData = z.infer<typeof examSchema>;

interface ExamWithQuestionCount {
  id: string;
  name: string;
  description: string;
  courseId: string;
  questionCount: number;
}

export default function ExamsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [examsWithCounts, setExamsWithCounts] = useState<ExamWithQuestionCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const userDocRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isLoadingProfile } = useDoc(userDocRef);

  const coursesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'courses')) : null),
    [firestore]
  );
  const { data: courses, isLoading: isLoadingCourses } = useCollection(coursesQuery);

  const [isExamDialogOpen, setExamDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  
  const userOwnedCourses = useMemo(() => {
    if (!courses || !user) return [];
    if (userProfile?.role === 'Admin') return courses;
    return courses.filter(course => course.instructorId === user.uid);
  }, [courses, user, userProfile]);

  useEffect(() => {
    if (!firestore) return;
    setIsLoading(true);

    const fetchExamsAndCounts = async () => {
        const examsGroupQuery = query(collectionGroup(firestore, 'exams'));
        const querySnapshot = await getDocs(examsGroupQuery);
        
        const examsData = await Promise.all(
            querySnapshot.docs.map(async (examDoc) => {
                const questionsColRef = collection(examDoc.ref, 'questions');
                const questionsSnapshot = await getDocs(questionsColRef);
                return {
                    ...examDoc.data(),
                    id: examDoc.id,
                    courseId: examDoc.data().courseId,
                    questionCount: questionsSnapshot.size,
                } as ExamWithQuestionCount;
            })
        );
        setExamsWithCounts(examsData);
        setIsLoading(false);
    };

    fetchExamsAndCounts();

  }, [firestore]);


  const form = useForm<ExamFormData>({
    resolver: zodResolver(examSchema),
    defaultValues: { name: '', description: '', courseId: '' },
  });

  const handleAddExam = () => {
    setSelectedExam(null);
    form.reset({ name: '', description: '', courseId: '' });
    setExamDialogOpen(true);
  };

  const handleEditExam = (exam: any) => {
    setSelectedExam(exam);
    form.reset({
      name: exam.name,
      description: exam.description,
      courseId: exam.courseId,
    });
    setExamDialogOpen(true);
  };

  const handleDeleteExam = (exam: any) => {
    setSelectedExam(exam);
    setDeleteDialogOpen(true);
  };

  const handleExamSubmit = async (data: ExamFormData) => {
    if (!firestore || !user) return;

    try {
      if (selectedExam) {
        // Update existing exam
        const examDocRef = doc(firestore, 'courses', selectedExam.courseId, 'exams', selectedExam.id);
        await updateDoc(examDocRef, { name: data.name, description: data.description });
        toast({ title: 'Success', description: 'Exam updated successfully.' });
      } else {
        // Create new exam
        const examsColRef = collection(firestore, 'courses', data.courseId, 'exams');
        await addDoc(examsColRef, {
          ...data,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Success', description: 'Exam created successfully.' });
      }
      setExamDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  };

  const confirmDeleteExam = async () => {
    if (!firestore || !selectedExam) return;

    try {
      const examDocRef = doc(firestore, 'courses', selectedExam.courseId, 'exams', selectedExam.id);
      await deleteDoc(examDocRef);
      // This will trigger a re-fetch via useEffect, no need to manually update state
      toast({
        title: 'Success',
        description: 'Exam deleted successfully.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleImportClick = () => {
    if (userOwnedCourses.length === 0) {
        toast({
            variant: 'destructive',
            title: 'No Courses Available',
            description: 'You must own at least one course to import an exam. Please create a course first.',
        });
        return;
    }
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!firestore || !user || userOwnedCourses.length === 0) return;
    const file = event.target.files?.[0];
    if (!file) return;
  
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result;
        if (typeof content !== 'string') throw new Error('Failed to read file content.');
        
        const parsedJson = JSON.parse(content);
        const validatedExam = importedExamSchema.parse(parsedJson);
  
        // For simplicity, we'll assign the imported exam to the user's first owned course.
        // A better UX would be to ask the user to select a course.
        const targetCourseId = userOwnedCourses[0].id;
  
        const batch = writeBatch(firestore);
        
        // 1. Create the new exam document
        const examsColRef = collection(firestore, 'courses', targetCourseId, 'exams');
        const newExamRef = doc(examsColRef);
        batch.set(newExamRef, {
          name: validatedExam.title,
          description: validatedExam.description,
          courseId: targetCourseId,
          createdAt: serverTimestamp(),
        });
  
        // 2. Create all the question documents within the new exam
        const questionsColRef = collection(newExamRef, 'questions');
        validatedExam.questions.forEach(q => {
          const newQuestionRef = doc(questionsColRef);
          batch.set(newQuestionRef, {
            text: q.text,
            type: 'Multiple Choice', // Convert from 'mcq'
            options: q.options,
            answer: q.answer,
            points: q.points,
            examId: newExamRef.id,
            createdAt: serverTimestamp(),
          });
        });
  
        await batch.commit();
        
        toast({
          title: 'Import Successful',
          description: `Exam "${validatedExam.title}" with ${validatedExam.questions.length} questions has been imported.`,
        });

        // Optional: Redirect user to the newly created exam page
        router.push(`/exams/${newExamRef.id}?courseId=${targetCourseId}`);
  
      } catch (error: any) {
        let description = 'An unknown error occurred.';
        if (error instanceof z.ZodError) {
          description = 'JSON format is invalid. Please check the file structure and content.';
        } else if (error instanceof SyntaxError) {
          description = 'Invalid JSON file. Please ensure the file is correctly formatted.';
        } else {
          description = error.message;
        }
        toast({
          variant: 'destructive',
          title: 'Import Failed',
          description: description,
        });
      } finally {
        if(fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };
  
  const canManageExams = userProfile?.role === 'Admin' || userProfile?.role === 'Instructor';
  const pageIsLoading = isLoading || isLoadingProfile || isLoadingCourses;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Exams</h1>
          <p className="text-muted-foreground">
            Browse, create, and manage your question-based assessments.
          </p>
        </div>
        {canManageExams && (
          <div className="flex items-center gap-2">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileImport}
                accept=".json"
                className="hidden"
            />
            <Button variant="outline" onClick={handleImportClick}>
                <Import className="mr-2 h-4 w-4" />
                Import Exam
            </Button>
            <Button onClick={handleAddExam}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Exam
            </Button>
          </div>
        )}
      </div>

    <Card>
        <CardHeader>
            <CardTitle>Exam Bank</CardTitle>
            <CardDescription>A list of all exams in the system.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[30%]">Exam Name</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Questions</TableHead>
                        <TableHead className="hidden md:table-cell w-[30%]">Description</TableHead>
                        <TableHead><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                     {pageIsLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                            <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                        </TableRow>
                        ))
                    ) : examsWithCounts && examsWithCounts.length > 0 ? (
                        examsWithCounts.map((exam) => {
                            const canManageThisExam = userProfile?.role === 'Admin' || userOwnedCourses.some(c => c.id === exam.courseId);
                            const courseName = courses?.find(c => c.id === exam.courseId)?.name || 'N/A';
                            return (
                                <TableRow key={exam.id}>
                                    <TableCell className="font-medium">
                                        <Link href={`/exams/${exam.id}?courseId=${exam.courseId}`} className="hover:underline">
                                            {exam.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell>{courseName}</TableCell>
                                    <TableCell>{exam.questionCount}</TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground truncate">{exam.description}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/exams/${exam.id}?courseId=${exam.courseId}`}>View</Link>
                                            </Button>
                                            {canManageThisExam && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => handleEditExam(exam)}>
                                                    Edit Exam
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => handleDeleteExam(exam)}
                                                    className="text-red-600"
                                                >
                                                    Delete Exam
                                                </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    ) : (
                         <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                No exams found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
    </Card>

      {/* Exam Creation/Editing Dialog */}
      <Dialog open={isExamDialogOpen} onOpenChange={setExamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedExam ? 'Edit Exam' : 'Create a New Exam'}
            </DialogTitle>
            <DialogDescription>
              Fill in the details below to {selectedExam ? 'update your' : 'set up a new'} exam.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleExamSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exam Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Mid-term Web Dev Exam" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exam Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe what this exam covers..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                  control={form.control}
                  name="courseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!selectedExam}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a course for this exam" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {userOwnedCourses.length > 0 ? (
                            userOwnedCourses.map(course => (
                              <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                            ))
                          ) : (
                            <div className="p-4 text-sm text-muted-foreground">
                                You don't own any courses. Please create a course first.
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setExamDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {selectedExam ? 'Save Changes' : 'Create Exam'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this exam?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the exam and all its associated questions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteExam} className={buttonVariants({ variant: "destructive" })}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
