'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import {
  collection,
  query,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import Link from 'next/link';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
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
import { ArrowLeft, FileJson, Import, MoreHorizontal, PlusCircle } from 'lucide-react';
import { CodeBlock } from '@/components/ui/code-block';

const questionSchema = z.object({
  text: z.string().min(1, 'Question text is required.'),
  type: z.enum(['Multiple Choice', 'True/False', 'Short Answer']),
});

// Schema for validating imported questions
const importedQuestionSchema = z.array(
  z.object({
    text: z.string().min(1),
    type: z.enum(['Multiple Choice', 'True/False', 'Short Answer']),
  })
);

const exampleJson = `[
  {
    "text": "What is the capital of France?",
    "type": "Multiple Choice"
  },
  {
    "text": "The Earth is flat.",
    "type": "True/False"
  },
  {
    "text": "Explain the concept of photosynthesis in one sentence.",
    "type": "Short Answer"
  }
]`;

type QuestionFormData = z.infer<typeof questionSchema>;

export default function ExamDetailPage() {
  const { examId } = useParams();
  const searchParams = useSearchParams();
  const courseId = searchParams.get('courseId');
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dialog states
  const [isQuestionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isExampleJsonDialogOpen, setExampleJsonDialogOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);

  // User Profile for permissions
  const userDocRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isLoadingProfile } = useDoc(userDocRef);

  // Exam Data
  const examDocRef = useMemoFirebase(
    () =>
      firestore && courseId && examId
        ? doc(firestore, 'courses', courseId as string, 'exams', examId as string)
        : null,
    [firestore, courseId, examId]
  );
  const { data: exam, isLoading: isLoadingExam } = useDoc(examDocRef);
  
  // Course Data for permissions
   const courseDocRef = useMemoFirebase(
    () => (firestore && courseId ? doc(firestore, 'courses', courseId as string) : null),
    [firestore, courseId]
  );
  const { data: course } = useDoc(courseDocRef);

  // Questions Data
  const questionsQuery = useMemoFirebase(
    () =>
      firestore && courseId && examId
        ? query(collection(firestore, 'courses', courseId as string, 'exams', examId as string, 'questions'))
        : null,
    [firestore, courseId, examId]
  );
  const { data: questions, isLoading: isLoadingQuestions } = useCollection(questionsQuery);

  const form = useForm<QuestionFormData>({
    resolver: zodResolver(questionSchema),
    defaultValues: { text: '', type: 'Multiple Choice' },
  });

  const isOwner = userProfile?.role === 'Admin' || (course && course.instructorId === user?.uid);
  const isLoading = isLoadingProfile || isLoadingExam || isLoadingQuestions;

  const handleAddQuestion = () => {
    setSelectedQuestion(null);
    form.reset({ text: '', type: 'Multiple Choice' });
    setQuestionDialogOpen(true);
  };

  const handleEditQuestion = (question: any) => {
    setSelectedQuestion(question);
    form.reset({ text: question.text, type: question.type });
    setQuestionDialogOpen(true);
  };

  const handleDeleteQuestion = (question: any) => {
    setSelectedQuestion(question);
    setDeleteDialogOpen(true);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!firestore || !courseId || !examId) return;
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result;
        if (typeof content !== 'string') throw new Error('Failed to read file content.');
        
        const parsedJson = JSON.parse(content);
        const validatedQuestions = importedQuestionSchema.parse(parsedJson);

        const batch = writeBatch(firestore);
        const questionsColRef = collection(firestore, 'courses', courseId as string, 'exams', examId as string, 'questions');

        validatedQuestions.forEach(q => {
          const newQuestionRef = doc(questionsColRef);
          batch.set(newQuestionRef, {
            ...q,
            examId: examId,
            createdAt: serverTimestamp(),
          });
        });

        await batch.commit();
        toast({
          title: 'Import Successful',
          description: `${validatedQuestions.length} questions have been imported.`,
        });

      } catch (error: any) {
        let description = 'An unknown error occurred.';
        if (error instanceof z.ZodError) {
          description = 'JSON format is invalid. Please check the file structure.';
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
        // Reset file input
        if(fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };


  const handleQuestionSubmit = async (data: QuestionFormData) => {
    if (!firestore || !courseId || !examId) return;
    const questionsColRef = collection(firestore, 'courses', courseId as string, 'exams', examId as string, 'questions');
    try {
      if (selectedQuestion) {
        const questionDocRef = doc(questionsColRef, selectedQuestion.id);
        await updateDoc(questionDocRef, data);
        toast({ title: 'Success', description: 'Question updated successfully.' });
      } else {
        await addDoc(questionsColRef, {
          ...data,
          examId: examId,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Success', description: 'Question created successfully.' });
      }
      setQuestionDialogOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const confirmDelete = async () => {
    if (!firestore || !courseId || !examId || !selectedQuestion) return;
    try {
        const questionDocRef = doc(firestore, 'courses', courseId as string, 'exams', examId as string, 'questions', selectedQuestion.id);
        await deleteDoc(questionDocRef);
        toast({ title: 'Success', description: 'Question deleted successfully.' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setDeleteDialogOpen(false);
        setSelectedQuestion(null);
    }
  };
  
  const copyExampleJson = () => {
    navigator.clipboard.writeText(exampleJson);
    toast({ title: 'Copied!', description: 'Example JSON copied to clipboard.' });
  };

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <Skeleton className="h-8 w-40" />
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-5 w-3/4" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-40 w-full" />
            </CardContent>
        </Card>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-semibold">Exam not found</h2>
        <p className="text-muted-foreground mt-2">
          The exam you are looking for does not exist or you do not have permission to view it.
        </p>
        <Button asChild className="mt-4">
            <Link href="/exams">Go back to Exams</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Link href="/exams" className={buttonVariants({ variant: 'ghost', className: 'mb-4' })}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Exams
      </Link>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-3xl font-bold">{exam.name}</CardTitle>
            <CardDescription className="mt-2 text-base">{exam.description}</CardDescription>
          </div>
          {isOwner && (
             <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setExampleJsonDialogOpen(true)}>
                    <FileJson className="mr-2 h-4 w-4" />
                    JSON Example
                </Button>
                 <Button variant="secondary" onClick={handleImportClick}>
                    <Import className="mr-2 h-4 w-4" />
                    Import Questions
                </Button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileImport}
                    accept=".json"
                    className="hidden"
                />
                <Button onClick={handleAddQuestion}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Question
                </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60%]">Question Text</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingQuestions ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : questions && questions.length > 0 ? (
                questions.map((question) => (
                  <TableRow key={question.id}>
                    <TableCell className="font-medium line-clamp-2">{question.text}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{question.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {isOwner && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditQuestion(question)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteQuestion(question)} className="text-red-600">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24">
                    No questions found. Get started by adding a question or importing from JSON.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Question Dialog */}
      <Dialog open={isQuestionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedQuestion ? 'Edit Question' : 'Add New Question'}</DialogTitle>
            <DialogDescription>
              Fill in the details for the question.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleQuestionSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question Text</FormLabel>
                    <FormControl>
                      <Textarea placeholder="What is the capital of Thailand?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a question type" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Multiple Choice">Multiple Choice</SelectItem>
                            <SelectItem value="True/False">True/False</SelectItem>
                            <SelectItem value="Short Answer">Short Answer</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setQuestionDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {selectedQuestion ? 'Save Changes' : 'Create Question'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                This action cannot be undone and will permanently delete the question.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className={buttonVariants({ variant: "destructive" })}>
                Delete
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      {/* Example JSON Dialog */}
      <Dialog open={isExampleJsonDialogOpen} onOpenChange={setExampleJsonDialogOpen}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Example JSON Structure</DialogTitle>
                <DialogDescription>
                    Your JSON file should be an array of question objects with 'text' and 'type' keys.
                </DialogDescription>
            </DialogHeader>
            <CodeBlock code={exampleJson} />
            <DialogFooter>
                <Button type="button" variant="secondary" onClick={copyExampleJson}>Copy Code</Button>
                <Button type="button" onClick={() => setExampleJsonDialogOpen(false)}>Close</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
