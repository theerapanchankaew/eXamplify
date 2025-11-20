'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from '@/firebase';
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

const moduleSchema = z.object({
  name: z.string().min(1, 'Module name is required.'),
  description: z.string().min(1, 'Description is required.'),
});

type ModuleFormData = z.infer<typeof moduleSchema>;

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

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

  const [isModuleDialogOpen, setModuleDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<any>(null);

  const form = useForm<ModuleFormData>({
    resolver: zodResolver(moduleSchema),
    defaultValues: { name: '', description: '' },
  });

  const handleAddModule = () => {
    setSelectedModule(null);
    form.reset({ name: '', description: '' });
    setModuleDialogOpen(true);
  };

  const handleEditModule = (module: any) => {
    setSelectedModule(module);
    form.reset({ name: module.name, description: module.description });
    setModuleDialogOpen(true);
  };

  const handleDeleteModule = (module: any) => {
    setSelectedModule(module);
    setDeleteDialogOpen(true);
  };

  const handleModuleSubmit = async (data: ModuleFormData) => {
    if (!firestore || !courseId) return;
    const modulesColRef = collection(firestore, 'courses', courseId as string, 'modules');
    try {
      if (selectedModule) {
        const moduleDocRef = doc(modulesColRef, selectedModule.id);
        await updateDoc(moduleDocRef, data);
        toast({ title: 'Success', description: 'Module updated successfully.' });
      } else {
        await addDoc(modulesColRef, {
          ...data,
          courseId: courseId,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Success', description: 'Module created successfully.' });
      }
      setModuleDialogOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const confirmDeleteModule = async () => {
    if (!firestore || !courseId || !selectedModule) return;
    try {
      const moduleDocRef = doc(
        firestore,
        'courses',
        courseId as string,
        'modules',
        selectedModule.id
      );
      await deleteDoc(moduleDocRef);
      toast({ title: 'Success', description: 'Module deleted successfully.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const isCourseOwner = userProfile?.role === 'Admin' || (userProfile?.role === 'Instructor' && course?.instructorId === user?.uid);
  const isLoading = isLoadingProfile || isLoadingCourse || isLoadingModules;

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
                           <DropdownMenuItem onClick={() => { /* Add Chapter */ }}>Add Chapter</DropdownMenuItem>
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
                    <div className="border-l-2 pl-4 space-y-2">
                        {/* Chapters will be rendered here */}
                        <p className="text-muted-foreground text-sm">No chapters in this module yet.</p>
                         {isCourseOwner && (
                            <Button variant="outline" size="sm">
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Chapter
                            </Button>
                         )}
                    </div>
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleModuleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
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
                control={form.control}
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
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {selectedModule ? 'Save Changes' : 'Create Module'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Module Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this module?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone and will permanently delete the module and all its contents (chapters, lessons, etc.).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteModule} className={buttonVariants({ variant: "destructive" })}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
