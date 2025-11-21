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
} from 'firebase/firestore';

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
  const [itemToDelete, setItemToDelete] = useState<{type: 'module' | 'chapter', data: any} | null>(null);

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


  const moduleForm = useForm<ModuleFormData>({
    resolver: zodResolver(moduleSchema),
    defaultValues: { name: '', description: '' },
  });

  const chapterForm = useForm<ChapterFormData>({
    resolver: zodResolver(chapterSchema),
    defaultValues: { name: '', content: '' },
  });

  const isCourseOwner = userProfile?.role === 'Admin' || (userProfile?.role === 'Instructor' && course?.instructorId === user?.uid);
  const isLoading = isLoadingProfile || isLoadingCourse || isLoadingModules;

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
          <h3 className="text-xl font-semibold mb-4">Modules</h3>
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
    </div>
  );
}

    