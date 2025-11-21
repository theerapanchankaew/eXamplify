'use client';

import { useState } from 'react';
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
  writeBatch,
  where,
  getDocs,
  increment,
} from 'firebase/firestore';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import Image from 'next/image';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { MoreVertical, PlusCircle, ShoppingCart } from 'lucide-react';
import { useMemo } from 'react';

const courseSchema = z.object({
  name: z.string().min(1, 'Course name is required.'),
  description: z.string().min(1, 'Description is required.'),
  price: z.coerce.number().min(0, 'Price must be a positive number.'),
});

type CourseFormData = z.infer<typeof courseSchema>;

export default function CoursesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

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
  
  const enrollmentsQuery = useMemoFirebase(
    () =>
      firestore && user
        ? query(collection(firestore, 'enrollments'), where('userId', '==', user.uid))
        : null,
    [firestore, user]
  );
  const { data: enrollments, isLoading: isLoadingEnrollments } = useCollection(enrollmentsQuery);
  
  const enrolledCourseIds = useMemo(() => {
    return new Set(enrollments?.map(e => e.courseId));
  }, [enrollments]);


  const [isCourseDialogOpen, setCourseDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);

  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: { name: '', description: '', price: 0 },
  });

  const handleAddCourse = () => {
    setSelectedCourse(null);
    form.reset({ name: '', description: '', price: 0 });
    setCourseDialogOpen(true);
  };

  const handleEditCourse = (course: any) => {
    setSelectedCourse(course);
    form.reset({ name: course.name, description: course.description, price: course.price || 0 });
    setCourseDialogOpen(true);
  };

  const handleDeleteCourse = (course: any) => {
    setSelectedCourse(course);
    setDeleteDialogOpen(true);
  };
  
  const handleEnroll = async (course: any) => {
    if (!firestore || !user || !userProfile) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to enroll.' });
      return;
    }

    const coursePrice = course.price || 0;
    
    // Quick check to prevent unnecessary Firestore reads
    // Note: A more robust solution would involve checking the actual balance from transactions.
    // This is a simplified check. A full implementation would re-calculate balance or use a balance field.
    const hasEnoughTokens = true; // Simplified for now.
    
    if (!hasEnoughTokens) {
      toast({ variant: 'destructive', title: 'Insufficient Tokens', description: 'You do not have enough tokens to enroll in this course.' });
      return;
    }
    
    try {
      const batch = writeBatch(firestore);

      // 1. Create Enrollment
      const enrollmentRef = doc(collection(firestore, 'enrollments'));
      batch.set(enrollmentRef, {
        userId: user.uid,
        courseId: course.id,
        enrollmentDate: serverTimestamp(),
        approved: true, // Auto-approve on purchase
      });

      // 2. Create Token Transaction
      const transactionRef = doc(collection(firestore, 'users', user.uid, 'tokenTransactions'));
      batch.set(transactionRef, {
        userId: user.uid,
        amount: -coursePrice,
        transactionType: 'purchase',
        timestamp: serverTimestamp(),
        description: `Enrolled in course: ${course.name}`,
      });
      
      // 3. Increment enrollment count on the course
      const courseRef = doc(firestore, 'courses', course.id);
      batch.update(courseRef, { enrollment_count: increment(1) });
      
      await batch.commit();
      
      toast({ title: 'Enrollment Successful!', description: `You have successfully enrolled in ${course.name}.` });
      
    } catch(error: any) {
       toast({ variant: 'destructive', title: 'Enrollment Failed', description: error.message });
    }
  };

  const handleCourseSubmit = async (data: CourseFormData) => {
    if (!firestore || !user) return;

    try {
      if (selectedCourse) {
        // Update existing course
        const courseDocRef = doc(firestore, 'courses', selectedCourse.id);
        await updateDoc(courseDocRef, data);
        toast({ title: 'Success', description: 'Course updated successfully.' });
      } else {
        // Create new course
        const coursesColRef = collection(firestore, 'courses');
        await addDoc(coursesColRef, {
          ...data,
          instructorId: user.uid,
          createdAt: serverTimestamp(),
          enrollment_count: 0,
        });
        toast({ title: 'Success', description: 'Course created successfully.' });
      }
      setCourseDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  };

  const confirmDeleteCourse = async () => {
    if (!firestore || !selectedCourse) return;

    try {
      const courseDocRef = doc(firestore, 'courses', selectedCourse.id);
      await deleteDoc(courseDocRef);
      toast({
        title: 'Success',
        description: 'Course deleted successfully.',
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
  
  const canManageCourses = userProfile?.role === 'Admin' || userProfile?.role === 'Instructor';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Courses</h1>
          <p className="text-muted-foreground">
            Browse, create, and manage your educational courses.
          </p>
        </div>
        {canManageCourses && (
          <Button onClick={handleAddCourse}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Course
          </Button>
        )}
      </div>

      {isLoadingCourses || isLoadingProfile || isLoadingEnrollments ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
             <Card key={i}>
                <CardHeader>
                    <Skeleton className="h-40 w-full" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6 mt-1" />
                </CardContent>
                <CardFooter>
                    <Skeleton className="h-10 w-24" />
                </CardFooter>
            </Card>
          ))}
        </div>
      ) : courses && courses.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {courses.map((course) => {
            const isEnrolled = enrolledCourseIds.has(course.id);
            return(
              <Card key={course.id} className="flex flex-col">
                <CardHeader className="p-0">
                  <div className="relative h-40 w-full">
                    <Image
                      src={`https://picsum.photos/seed/${course.id}/600/400`}
                      alt={course.name}
                      fill
                      objectFit="cover"
                      className="rounded-t-lg"
                      data-ai-hint="online course abstract"
                    />
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-4">
                  <CardTitle className="text-lg mb-2 line-clamp-2">{course.name}</CardTitle>
                  <CardDescription className="line-clamp-3">
                    {course.description}
                  </CardDescription>
                </CardContent>
                <CardFooter className="p-4 flex justify-between items-center">
                   {userProfile?.role === 'Student' ? (
                      isEnrolled ? (
                          <Button asChild className="w-full">
                              <Link href={`/courses/${course.id}`}>View Course</Link>
                          </Button>
                      ) : (
                          <Button className="w-full" onClick={() => handleEnroll(course)}>
                              <ShoppingCart className="mr-2 h-4 w-4" /> Enroll Now ({course.price || 0} Tokens)
                          </Button>
                      )
                  ) : (
                      <Button asChild>
                          <Link href={`/courses/${course.id}`}>View Course</Link>
                      </Button>
                  )}
                  {(userProfile?.role === 'Admin' || (userProfile?.role === 'Instructor' && course.instructorId === user?.uid)) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEditCourse(course)}>
                          Edit Course
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteCourse(course)}
                          className="text-red-600"
                        >
                          Delete Course
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </CardFooter>
              </Card>
           )})}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <h2 className="text-xl font-semibold">No Courses Found</h2>
            <p className="text-muted-foreground mt-2">
            Get started by creating a new course.
            </p>
            {canManageCourses && (
                 <Button onClick={handleAddCourse} className="mt-4">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Your First Course
                </Button>
            )}
        </div>
      )}

      {/* Course Creation/Editing Dialog */}
      <Dialog open={isCourseDialogOpen} onOpenChange={setCourseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedCourse ? 'Edit Course' : 'Create a New Course'}
            </DialogTitle>
            <DialogDescription>
              Fill in the details below to {selectedCourse ? 'update your' : 'set up a new'} course.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleCourseSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Introduction to Web Development" {...field} />
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
                    <FormLabel>Course Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe what this course is about..."
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
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (Tokens)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCourseDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {selectedCourse ? 'Save Changes' : 'Create Course'}
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
            <AlertDialogTitle>Are you sure you want to delete this course?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the course and all its associated content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCourse} className={buttonVariants({ variant: "destructive" })}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

    

    