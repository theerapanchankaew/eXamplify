'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useParams, useRouter } from 'next/navigation';
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
  increment,
  where,
} from 'firebase/firestore';
import { getUserTokenBalance } from '@/lib/tokens';
import { calculateCourseProgress, getNextAction } from '@/lib/lesson-progress';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, Trophy, PlayCircle, BookOpen } from 'lucide-react';
import { issueCertificate } from '@/lib/certificates';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, GripVertical, MoreVertical, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { ChapterList } from '@/components/course/ChapterList';

const moduleSchema = z.object({
  name: z.string().min(1, 'Module name is required.'),
  description: z.string().min(1, 'Description is required.'),
});

const chapterSchema = z.object({
  name: z.string().min(1, 'Chapter name is required.'),
  content: z.string().min(1, 'Content is required.'),
});

type ModuleFormData = z.infer<typeof moduleSchema>;
type ChapterFormData = z.infer<typeof chapterSchema>;

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  // Dialog states
  const [isModuleDialogOpen, setModuleDialogOpen] = useState(false);
  const [isChapterDialogOpen, setChapterDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Selected items for dialogs
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [selectedChapter, setSelectedChapter] = useState<any>(null);
  const [currentModuleForChapter, setCurrentModuleForChapter] = useState<any>(null);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'module' | 'chapter', data: any } | null>(null);

  // User Profile
  const userDocRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isLoadingProfile } = useDoc(userDocRef);

  // Course Data
  const courseDocRef = useMemoFirebase(
    () => (firestore && courseId ? doc(firestore, 'courses', courseId as string) : null),
    [firestore, courseId]
  );
  const { data: course, isLoading: isLoadingCourse } = useDoc(courseDocRef);

  // Modules Data
  const modulesQuery = useMemoFirebase(
    () =>
      firestore && courseId
        ? query(collection(firestore, 'courses', courseId as string, 'modules'))
        : null,
    [firestore, courseId]
  );
  const { data: modules, isLoading: isLoadingModules } = useCollection(modulesQuery);

  // Enrollment Data
  const enrollmentQuery = useMemoFirebase(
    () =>
      firestore && user && courseId
        ? query(collection(firestore, 'enrollments'), where('userId', '==', user.uid), where('courseId', '==', courseId))
        : null,
    [firestore, user, courseId]
  );
  const { data: enrollments, isLoading: isLoadingEnrollment } = useCollection(enrollmentQuery);

  const isEnrolled = enrollments && enrollments.length > 0;
  const enrollmentData = isEnrolled ? enrollments[0] : null;

  // Calculate Progress
  const totalChapters = modules?.reduce((acc, module) => acc + (module.chapters?.length || 0), 0) || 0;
  // Note: In a real app, we'd query a 'progress' subcollection or field. 
  // For this MVP, let's assume we store completed chapter IDs in the enrollment document.
  const completedChapters = enrollmentData?.completedChapters || [];
  const progress = totalChapters > 0 ? (completedChapters.length / totalChapters) * 100 : 0;
  const isCompleted = progress === 100 && totalChapters > 0;

  const handleCompleteChapter = async (chapterId: string) => {
    if (!firestore || !user || !courseId || !enrollmentData) return;

    const currentCompleted = enrollmentData.completedChapters || [];
    if (currentCompleted.includes(chapterId)) return;

    const newCompleted = [...currentCompleted, chapterId];
    const newProgress = totalChapters > 0 ? (newCompleted.length / totalChapters) * 100 : 0;

    try {
      const enrollmentRef = doc(firestore, 'enrollments', enrollmentData.id);
      await updateDoc(enrollmentRef, {
        completedChapters: newCompleted,
        progress: newProgress,
        status: newProgress === 100 ? 'completed' : 'active',
        completedAt: newProgress === 100 ? serverTimestamp() : null
      });

      if (newProgress === 100) {
        await issueCertificate(
          firestore,
          user.uid,
          courseId as string,
          course?.name || 'Course',
          'eXamplify Instructor' // Ideally fetch instructor name
        );
        toast({
          title: 'Course Completed!',
          description: 'Congratulations! You have completed the course and earned a certificate.',
        });
      } else {
        toast({ title: 'Progress Saved', description: 'Chapter marked as completed.' });
      }
    } catch (error: any) {
      console.error("Error updating progress:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save progress.' });
    }
  };

  const moduleForm = useForm<ModuleFormData>({
    resolver: zodResolver(moduleSchema),
    defaultValues: { name: '', description: '' },
  });

  const chapterForm = useForm<ChapterFormData>({
    resolver: zodResolver(chapterSchema),
    defaultValues: { name: '', content: '' },
  });

  const isCourseOwner = userProfile?.role === 'Admin' || (userProfile?.role === 'Instructor' && course?.instructorId === user?.uid);
  const isLoading = isLoadingProfile || isLoadingCourse || isLoadingModules || isLoadingEnrollment;

  const handleEnroll = async () => {
    if (!firestore || !user || !course) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to enroll.' });
      return;
    }

    const coursePrice = course.price || 0;

    try {
      // 1. Check token balance if course is paid
      if (coursePrice > 0) {
        const currentBalance = await getUserTokenBalance(firestore, user.uid);

        if (currentBalance < coursePrice) {
          toast({
            variant: 'destructive',
            title: 'Insufficient Tokens',
            description: `You need ${coursePrice} tokens to enroll. Your current balance is ${currentBalance} tokens.`
          });
          return;
        }
      }

      const batch = writeBatch(firestore);

      // 2. Create Enrollment
      const enrollmentRef = doc(collection(firestore, 'enrollments'), `${user.uid}_${course.id}`);
      batch.set(enrollmentRef, {
        userId: user.uid,
        courseId: course.id,
        enrolledAt: serverTimestamp(),
        status: 'active',
        progress: 0,
      });

      // 3. Create Token Transaction (if paid course)
      if (coursePrice > 0) {
        const transactionRef = doc(collection(firestore, 'users', user.uid, 'tokenTransactions'));
        batch.set(transactionRef, {
          amount: -coursePrice,
          type: 'deduction',
          description: `Enrolled in course: ${course.name}`,
          courseId: course.id,
          timestamp: serverTimestamp(),
        });
      }

      // 4. Increment enrollment count on the course
      const courseRef = doc(firestore, 'courses', course.id);
      batch.update(courseRef, { enrollment_count: increment(1) });

      await batch.commit();

      toast({
        title: 'Enrollment Successful!',
        description: coursePrice > 0
          ? `You have successfully enrolled in ${course.name}. ${coursePrice} tokens have been deducted.`
          : `You have successfully enrolled in ${course.name}.`
      });

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Enrollment Failed', description: error.message });
    }
  };

  // Module handlers
  const handleAddModule = () => {
    setSelectedModule(null);
    moduleForm.reset({ name: '', description: '' });
    setModuleDialogOpen(true);
  };

  const handleEditModule = (module: any) => {
    setSelectedModule(module);
    moduleForm.reset({ name: module.name, description: module.description });
    setModuleDialogOpen(true);
  };

  const handleDeleteModule = (module: any) => {
    setItemToDelete({ type: 'module', data: module });
    setDeleteDialogOpen(true);
  };

  const handleModuleSubmit = async (data: ModuleFormData) => {
    if (!firestore || !courseId) return;
    const modulesColRef = collection(firestore, 'courses', courseId as string, 'modules');

    const submissionData = {
      ...data,
      courseId: courseId,
      ...(selectedModule ? {} : { createdAt: serverTimestamp() }),
    };

    try {
      if (selectedModule) {
        const moduleDocRef = doc(modulesColRef, selectedModule.id);
        await updateDoc(moduleDocRef, submissionData);
        toast({ title: 'Success', description: 'Module updated successfully.' });
      } else {
        await addDoc(modulesColRef, submissionData);
        toast({ title: 'Success', description: 'Module created successfully.' });
      }
      setModuleDialogOpen(false);
    } catch (error: any) {
      const permissionError = new FirestorePermissionError({
        path: selectedModule ? doc(modulesColRef, selectedModule.id).path : modulesColRef.path,
        operation: selectedModule ? 'update' : 'create',
        requestResourceData: submissionData,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  };

  // Chapter handlers
  const handleAddChapter = (module: any) => {
    setSelectedChapter(null);
    setCurrentModuleForChapter(module);
    chapterForm.reset({ name: '', content: '' });
    setChapterDialogOpen(true);
  };

  const handleEditChapter = (chapter: any, module: any) => {
    setSelectedChapter(chapter);
    setCurrentModuleForChapter(module);
    chapterForm.reset({ name: chapter.name, content: chapter.content });
    setChapterDialogOpen(true);
  };

  const handleDeleteChapter = (chapter: any, module: any) => {
    setItemToDelete({ type: 'chapter', data: { chapter, module } });
    setDeleteDialogOpen(true);
  };

  const handleChapterSubmit = async (data: ChapterFormData) => {
    if (!firestore || !courseId || !currentModuleForChapter) return;
    const chaptersColRef = collection(firestore, 'courses', courseId as string, 'modules', currentModuleForChapter.id, 'chapters');

    const submissionData = {
      ...data,
      moduleId: currentModuleForChapter.id,
      ...(selectedChapter ? {} : { createdAt: serverTimestamp() }),
    };

    try {
      if (selectedChapter) {
        const chapterDocRef = doc(chaptersColRef, selectedChapter.id);
        await updateDoc(chapterDocRef, submissionData);
        toast({ title: 'Success', description: 'Chapter updated successfully.' });
      } else {
        await addDoc(chaptersColRef, submissionData);
        toast({ title: 'Success', description: 'Chapter created successfully.' });
      }
      setChapterDialogOpen(false);
    } catch (error: any) {
      const permissionError = new FirestorePermissionError({
        path: selectedChapter ? doc(chaptersColRef, selectedChapter.id).path : chaptersColRef.path,
        operation: selectedChapter ? 'update' : 'create',
        requestResourceData: submissionData,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  };


  const confirmDelete = async () => {
    if (!firestore || !courseId || !itemToDelete) return;
    const { type, data } = itemToDelete;

    try {
      if (type === 'module') {
        const moduleDocRef = doc(firestore, 'courses', courseId as string, 'modules', data.id);
        await deleteDoc(moduleDocRef);
        toast({ title: 'Success', description: 'Module deleted successfully.' });
      } else if (type === 'chapter') {
        const { chapter, module } = data;
        const chapterDocRef = doc(firestore, 'courses', courseId as string, 'modules', module.id, 'chapters', chapter.id);
        await deleteDoc(chapterDocRef);
        toast({ title: 'Success', description: 'Chapter deleted successfully.' });
      }
    } catch (error: any) {
      const docRefPath = type === 'module'
        ? `courses/${courseId}/modules/${data.id}`
        : `courses/${courseId}/modules/${data.module.id}/chapters/${data.chapter.id}`;

      const permissionError = new FirestorePermissionError({
        path: docRefPath,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-semibold">Course not found</h2>
        <p className="text-muted-foreground mt-2">
          The course you are looking for does not exist.
        </p>
        <Button asChild className="mt-4">
          <Link href="/courses">Go back to Courses</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Link href="/courses" className={buttonVariants({ variant: 'ghost', className: 'mb-4' })}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Courses
      </Link>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-3xl font-bold">{course.name}</CardTitle>
            <CardDescription className="mt-2 text-base">{course.description}</CardDescription>
          </div>
          {isCourseOwner && (
            <Button onClick={handleAddModule}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Module
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!isEnrolled && !isCourseOwner ? (
            <div className="text-center py-8">
              <p className="mb-6 text-lg">{course.description}</p>
              <div className="flex flex-col items-center gap-4">
                <p className="text-muted-foreground">Enroll to access the course content.</p>
                <Button size="lg" onClick={handleEnroll}>
                  Enroll Now ({course.price || 0} Tokens)
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold">Course Content</h3>
                  <p className="text-sm text-muted-foreground">
                    {Math.round(progress)}% Completed
                  </p>
                </div>
                {isCompleted && (
                  <Button variant="outline" className="border-green-500 text-green-600 hover:bg-green-50" asChild>
                    <Link href="/certificates">
                      <Trophy className="mr-2 h-4 w-4" />
                      View Certificate
                    </Link>
                  </Button>
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-secondary h-2 rounded-full mb-6 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-500 ease-in-out"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Next Action Button */}
              {isEnrolled && (
                <div className="mb-8">
                  {(() => {
                    const courseProgress = calculateCourseProgress(enrollmentData, modules || []);
                    const nextAction = getNextAction(courseId as string, true, courseProgress, modules || []);

                    return (
                      <Button asChild className="w-full" size="lg">
                        <Link href={nextAction.link} className="flex items-center justify-center gap-2">
                          {nextAction.type === 'certificate' && <Trophy className="h-5 w-5" />}
                          {nextAction.type === 'exam' && <BookOpen className="h-5 w-5" />}
                          {(nextAction.type === 'start' || nextAction.type === 'continue') && <PlayCircle className="h-5 w-5" />}
                          {nextAction.label}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    );
                  })()}
                </div>
              )}

              {modules && modules.length > 0 ? (
                <Accordion type="multiple" className="w-full">
                  {modules.map((module) => (
                    <AccordionItem value={module.id} key={module.id}>
                      <div className="flex items-center group">
                        <GripVertical className="h-5 w-5 text-muted-foreground mr-2 cursor-grab" />
                        <AccordionTrigger className="flex-1 text-lg">
                          {module.name}
                        </AccordionTrigger>
                        {isCourseOwner && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="opacity-50 group-hover:opacity-100">
                                <MoreVertical className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Module Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleAddChapter(module)}>Add Chapter</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditModule(module)}>Edit Module</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteModule(module)}
                                className="text-red-600"
                              >
                                Delete Module
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      <AccordionContent className="pl-8">
                        <p className="mb-4">{module.description}</p>
                        <ChapterList
                          courseId={courseId as string}
                          module={module}
                          isCourseOwner={isCourseOwner}
                          onEditChapter={handleEditChapter}
                          onDeleteChapter={handleDeleteChapter}
                          onAddChapter={() => handleAddChapter(module)}
                          isEnrolled={isEnrolled}
                          completedChapters={completedChapters}
                          onCompleteChapter={handleCompleteChapter}
                        />
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="text-center py-10 border-2 border-dashed rounded-lg">
                  <h2 className="text-lg font-semibold">No Modules Yet</h2>
                  <p className="text-muted-foreground mt-1">
                    Get started by adding modules to this course.
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Module Dialog */}
      <Dialog open={isModuleDialogOpen} onOpenChange={setModuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedModule ? 'Edit Module' : 'Add New Module'}</DialogTitle>
            <DialogDescription>
              Fill in the details for your module.
            </DialogDescription>
          </DialogHeader>
          <Form {...moduleForm}>
            <form onSubmit={moduleForm.handleSubmit(handleModuleSubmit)} className="space-y-4">
              <FormField
                control={moduleForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Module Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Getting Started" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={moduleForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Module Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="What is this module about?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setModuleDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={moduleForm.formState.isSubmitting}>
                  {selectedModule ? 'Save Changes' : 'Create Module'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Chapter Dialog */}
      <Dialog open={isChapterDialogOpen} onOpenChange={setChapterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedChapter ? 'Edit Chapter' : 'Add New Chapter'}</DialogTitle>
            <DialogDescription>
              Fill in the details for your chapter.
            </DialogDescription>
          </DialogHeader>
          <Form {...chapterForm}>
            <form onSubmit={chapterForm.handleSubmit(handleChapterSubmit)} className="space-y-4">
              <FormField
                control={chapterForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chapter Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Understanding HTML" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={chapterForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chapter Content</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Explain the main concepts of this chapter." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setChapterDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={chapterForm.formState.isSubmitting}>
                  {selectedChapter ? 'Save Changes' : 'Create Chapter'}
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
              This action cannot be undone and will permanently delete the {itemToDelete?.type} and all its contents.
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
    </div >
  );
}
