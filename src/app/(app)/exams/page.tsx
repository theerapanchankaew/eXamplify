'use client';

import { useState, useMemo, useRef } from 'react';
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
} from 'firebase/firestore';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import Link from 'next/link';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Import, MoreVertical, PlusCircle } from 'lucide-react';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useRouter } from 'next/navigation';

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

export default function ExamsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);


  const userDocRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isLoadingProfile } = useDoc(userDocRef);

  const examsQuery = useMemoFirebase(
    () => (firestore ? query(collectionGroup(firestore, 'exams')) : null),
    [firestore]
  );
  const { data: exams, isLoading: isLoadingExams } = useCollection(examsQuery);

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
        await updateDoc(examDocRef, data);
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

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Exams</h1>
          <p className="text-muted-foreground">
            Design and deploy question-based assessments.
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

      {isLoadingExams || isLoadingProfile || isLoadingCourses ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
             <Card key={i}>
                <CardHeader>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6 mt-1" />
                </CardContent>
                <CardFooter>
                    <Skeleton className="h-10 w-24" />
                </CardFooter>
            </Card>
          ))}
        </div>
      ) : exams && exams.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {exams.map((exam) => {
            const canManageThisExam = userProfile?.role === 'Admin' || userOwnedCourses.some(c => c.id === exam.courseId);
            return (
                <Card key={exam.id} className="flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-lg line-clamp-2">{exam.name}</CardTitle>
                        <CardDescription>
                            In course: {courses?.find(c => c.id === exam.courseId)?.name || 'N/A'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <p className="line-clamp-3 text-sm">{exam.description}</p>
                    </CardContent>
                    <CardFooter className="p-4 flex justify-between items-center">
                        <Button asChild>
                            <Link href={`/exams/${exam.id}?courseId=${exam.courseId}`}>View Exam</Link>
                        </Button>
                        {canManageThisExam && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreVertical className="h-5 w-5" />
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
                    </CardFooter>
                </Card>
            )
        })}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <h2 className="text-xl font-semibold">No Exams Found</h2>
            <p className="text-muted-foreground mt-2">
              Get started by creating a new exam or importing from JSON.
            </p>
            {canManageExams && (
              <div className="flex justify-center gap-4 mt-4">
                 <Button variant="outline" onClick={handleImportClick}>
                    <Import className="mr-2 h-4 w-4" />
                    Import Exam
                </Button>
                 <Button onClick={handleAddExam}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Your First Exam
                </Button>
              </div>
            )}
        </div>
      )}

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
