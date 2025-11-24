'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
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
import { ArrowLeft, MoreHorizontal, PlusCircle, Import, FileJson } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { CodeBlock } from '@/components/ui/code-block';

const questionSchema = z.object({
  text: z.string().min(1, 'Question text is required.'),
  type: z.enum(['Multiple Choice', 'True/False', 'Short Answer']),
  points: z.coerce.number().min(0, 'Points cannot be negative.'),
  answer: z.string().min(1, 'Answer is required.'),
  options: z.array(z.string()).optional(),
});

const importedQuestionsSchema = z.array(
  z.object({
    text: z.string().min(1),
    type: z.enum(['Multiple Choice', 'True/False', 'Short Answer']),
    points: z.number().positive(),
    answer: z.string().min(1),
    options: z.array(z.string()).optional(),
  })
);

const exampleJson = JSON.stringify([
  {
    "text": "What is 2 + 2?",
    "type": "Multiple Choice",
    "points": 1,
    "answer": "4",
    "options": ["2", "3", "4", "5"]
  },
  {
    "text": "The sky is blue.",
    "type": "True/False",
    "points": 1,
    "answer": "True"
  }
], null, 2);


type QuestionFormData = z.infer<typeof questionSchema>;

export default function ExamDetailPage() {
  const { examId } = useParams();
  const searchParams = useSearchParams();
  const courseId = searchParams.get('courseId');
  const handleEditQuestion = (question: any) => {
    setSelectedQuestion(question);
    form.reset({
      text: question.text,
      type: question.type,
      points: question.points || 1,
      answer: question.answer || '',
      options: question.options || ['', '', '', '']
    });
    setQuestionDialogOpen(true);
  };

  const handleDeleteQuestion = (question: any) => {
    setSelectedQuestion(question);
    setDeleteDialogOpen(true);
  };


  const handleQuestionSubmit = async (data: QuestionFormData) => {
    if (!firestore || !resolvedCourseId || !examId) return;
    const questionsColRef = collection(firestore, 'courses', resolvedCourseId, 'exams', examId as string, 'questions');

    const submissionData: any = {
      ...data,
      examId: examId,
    };

    if (data.type !== 'Multiple Choice') {
      delete submissionData.options;
    }

    try {
      if (selectedQuestion) {
        const questionDocRef = doc(questionsColRef, selectedQuestion.id);
        await updateDoc(questionDocRef, submissionData);
        toast({ title: 'Success', description: 'Question updated successfully.' });
      } else {
        await addDoc(questionsColRef, {
          ...submissionData,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Success', description: 'Question created successfully.' });
      }
      setQuestionDialogOpen(false);
    } catch (error: any) {
      const permissionError = new FirestorePermissionError({
        path: selectedQuestion ? doc(questionsColRef, selectedQuestion.id).path : questionsColRef.path,
        operation: selectedQuestion ? 'update' : 'create',
        requestResourceData: submissionData,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  };

  const confirmDelete = async () => {
    if (!firestore || !resolvedCourseId || !examId || !selectedQuestion) return;
    const questionDocRef = doc(firestore, 'courses', resolvedCourseId, 'exams', examId as string, 'questions', selectedQuestion.id);
    try {
      await deleteDoc(questionDocRef);
      toast({ title: 'Success', description: 'Question deleted successfully.' });
    } catch (error: any) {
      const permissionError = new FirestorePermissionError({
        path: questionDocRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setDeleteDialogOpen(false);
      setSelectedQuestion(null);
    }
  };
  examId: examId,
    createdAt: serverTimestamp(),
          });
        });

await batch.commit();

toast({
  title: 'Import Successful',
  description: `${validatedQuestions.length} questions have been imported to this exam.`,
});
      } catch (error: any) {
  let description = 'An unknown error occurred.';
  if (error instanceof z.ZodError) {
    description = 'JSON format is invalid. Please check the file structure, keys, and data types.';
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
  if (fileInputRef.current) fileInputRef.current.value = '';
}
    };
reader.readAsText(file);
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
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileImport}
              accept=".json"
              className="hidden"
            />
            <Button variant="outline" onClick={handleImportClick}>
              <Import className="mr-2 h-4 w-4" />
              Import Questions
            </Button>
            <Button onClick={handleAddQuestion}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Question
            </Button>
            <Button variant="secondary" onClick={() => setJsonExampleDialogOpen(true)}>
              <FileJson className="mr-2 h-4 w-4" />
              JSON Example
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50%]">Question Text</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Points</TableHead>
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
                  <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : questions && questions.length > 0 ? (
              questions.map((question) => (
                <Accordion type="single" collapsible className="w-full" key={question.id}>
                  <AccordionItem value={question.id} className="border-b-0">
                    <TableRow className="border-b hover:bg-transparent">
                      <TableCell className="font-medium w-[50%] align-top">
                        <AccordionTrigger className="text-left p-0 hover:no-underline [&>svg]:mt-1">{question.text}</AccordionTrigger>
                      </TableCell>
                      <TableCell className="align-top"><Badge variant="outline">{question.type}</Badge></TableCell>
                      <TableCell className="align-top">{question.points}</TableCell>
                      <TableCell className="text-right align-top">
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
                    <AccordionContent asChild>
                      <tr>
                        <td colSpan={4} className="p-4 bg-muted/50">
                          <div className="grid gap-2">
                            <h4 className="font-semibold">Correct Answer:</h4>
                            <p className="text-sm text-green-700 font-mono p-2 bg-green-100 rounded-md">{question.answer}</p>
                            {question.options && question.options.length > 0 && (
                              <>
                                <h4 className="font-semibold mt-2">Options:</h4>
                                <ul className="list-disc pl-5 space-y-1">
                                  {question.options.map((opt: string, i: number) => <li key={i} className="text-sm">{opt}</li>)}
                                </ul>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24">
                  No questions found. Get started by adding a question.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    {/* Question Dialog */}
    <Dialog open={isQuestionDialogOpen} onOpenChange={setQuestionDialogOpen}>
      <DialogContent className="max-w-2xl">
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
            <div className="grid grid-cols-2 gap-4">
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
              <FormField
                control={form.control}
                name="points"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="answer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correct Answer</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter the exact correct answer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch('type') === 'Multiple Choice' && (
              <div className="space-y-2">
                <FormLabel>Options</FormLabel>
                <div className="grid grid-cols-2 gap-4">
                  {[0, 1, 2, 3].map(i => (
                    <FormField
                      key={i}
                      control={form.control}
                      name={`options.${i}` as const}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder={`Option ${i + 1}`} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>
            )}


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

    {/* JSON Example Dialog */}
    <Dialog open={isJsonExampleDialogOpen} onOpenChange={setJsonExampleDialogOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Questions - JSON Format</DialogTitle>
          <DialogDescription>
            Your JSON file should be an array of question objects with the following structure.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <CodeBlock code={exampleJson} />
        </div>
        <DialogFooter>
          <Button onClick={() => setJsonExampleDialogOpen(false)}>Close</Button>
        </DialogFooter>
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
  </div>
);
}

