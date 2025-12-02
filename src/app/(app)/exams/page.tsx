'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collectionGroup, query, doc, writeBatch, collection, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  FileQuestion,
  Clock,
  Award,
  Calendar,
  Search,
  Filter,
  TrendingUp,
  CheckCircle2,
  XCircle,
  ShoppingCart,
  Upload,
  AlertCircle,
  Pencil,
  Trash2
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import Link from 'next/link';
import { ExamStatusBadge } from '@/components/exam/ExamStatusBadge';
import { BookingInfo } from '@/components/exam/BookingInfo';
import { deleteExam } from '@/lib/admin/exams';

export default function ExamsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'difficulty'>('name');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState<{ courseId: string; examId: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch user profile
  const userDocRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc(userDocRef);

  // Fetch all exams
  const examsQuery = useMemoFirebase(
    () => (firestore ? query(collectionGroup(firestore, 'exams')) : null),
    [firestore]
  );
  const { data: exams, isLoading, error } = useCollection(examsQuery);

  // Fetch exam results
  const resultsQuery = useMemoFirebase(
    () => (firestore && user ? query(collectionGroup(firestore, 'examResults'), where('userId', '==', user.uid)) : null),
    [firestore, user]
  );
  const { data: examResults } = useCollection(resultsQuery);

  // Fetch enrollments to check if user has access
  const enrollmentsQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, 'enrollments'), where('userId', '==', user.uid)) : null),
    [firestore, user]
  );
  const { data: enrollments } = useCollection(enrollmentsQuery);

  // Fetch user's bookings
  const bookingsQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, 'bookings'), where('userId', '==', user.uid), where('status', '==', 'confirmed')) : null),
    [firestore, user]
  );
  const { data: bookings } = useCollection(bookingsQuery);

  // Filter and sort exams
  const filteredExams = useMemo(() => {
    if (!exams) return [];

    let filtered = exams.filter(exam => {
      // Search filter
      if (searchQuery && !exam.name?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Status filter
      if (filterStatus !== 'all') {
        const hasCompleted = examResults?.some(
          r => r.examId === exam.id && r.userId === user?.uid
        );
        if (filterStatus === 'completed' && !hasCompleted) return false;
        if (filterStatus === 'available' && hasCompleted) return false;
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'date') return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
      return 0;
    });

    return filtered;
  }, [exams, searchQuery, filterStatus, sortBy, examResults, user]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !firestore || !user) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);

        // Validate JSON structure
        if (!json.name || !json.courseId || !json.questions || !Array.isArray(json.questions)) {
          throw new Error('Invalid JSON structure. Must include name, courseId, and questions array.');
        }

        const batch = writeBatch(firestore);

        // Create Exam Document
        const examRef = doc(collection(firestore, 'courses', json.courseId, 'exams'));
        batch.set(examRef, {
          name: json.name,
          description: json.description || '',
          duration: json.duration || 60,
          passingScore: json.passingScore || 70,
          price: json.price || 0,
          courseId: json.courseId,
          totalQuestions: json.questions.length,
          createdAt: new Date(),
          createdBy: user.uid,
        });

        // Create Questions
        json.questions.forEach((q: any) => {
          const questionRef = doc(collection(firestore, 'courses', json.courseId, 'exams', examRef.id, 'questions'));
          batch.set(questionRef, {
            text: q.text,
            type: q.type || 'Multiple Choice',
            options: q.options || [],
            correctAnswer: q.correctAnswer, // Store correct answer for server-side grading
            points: q.points || 1,
          });
        });

        await batch.commit();

        toast({
          title: 'Exam Imported',
          description: `Successfully imported "${json.name}" with ${json.questions.length} questions.`,
        });

      } catch (error: any) {
        console.error('Import error:', error);
        toast({
          variant: 'destructive',
          title: 'Import Failed',
          description: error.message || 'Failed to parse JSON file.',
        });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // Show error if query failed
  if (error) {
    console.error('Error loading exams:', error);
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Exams</AlertTitle>
          <AlertDescription>
            {error.message}
            {(error as any).code === 'permission-denied' && (
              <div className="mt-2 text-sm">
                Please ensure you are logged in and have the correct permissions.
              </div>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[300px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Exams & Certifications</h1>
          <p className="text-muted-foreground text-lg">
            Test your knowledge and earn certificates
          </p>
        </div>
        {isClient && (userProfile?.role === 'Admin' || userProfile?.role === 'Instructor') && (
          <div>
            <input
              type="file"
              accept=".json"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <Button onClick={handleImportClick}>
              <Upload className="mr-2 h-4 w-4" />
              Import Exam
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <FileQuestion className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{exams?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Total Exams</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {examResults?.filter(r => r.userId === user?.uid && r.passed).length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Passed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <Award className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {examResults?.filter(r => r.userId === user?.uid && r.certificateIssued).length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Certificates</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search exams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Exams</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="date">Date Added</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredExams.length} {filteredExams.length === 1 ? 'exam' : 'exams'}
      </div>

      {/* Exams Grid */}
      {filteredExams.length === 0 ? (
        <div className="text-center py-20">
          <FileQuestion className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No exams found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam) => {
            const examResult = examResults?.find(r => r.examId === exam.id && r.userId === user?.uid);
            const courseEnrollment = enrollments?.find(e => e.courseId === exam.courseId && e.userId === user?.uid);
            const examEnrollment = enrollments?.find(e => e.examId === exam.id && e.userId === user?.uid);
            const hasEnrollment = courseEnrollment || examEnrollment;
            const hasCompleted = !!examResult;

            // Find booking for this exam
            const booking = bookings?.find(b => b.examId === exam.id);

            // Calculate exam status
            const getExamStatus = () => {
              // Completed states
              if (examResult) {
                if (examResult.certificateIssued) {
                  return { state: 'certified', badge: 'certified' };
                }
                if (examResult.passed) {
                  return { state: 'passed', badge: 'passed' };
                }
                return { state: 'failed', badge: 'failed' };
              }

              // Scheduled states
              if (booking) {
                const examTime = booking.date.toDate();
                const now = new Date();
                const hoursUntil = (examTime.getTime() - now.getTime()) / (1000 * 60 * 60);

                if (hoursUntil < 24 && hoursUntil > 0) {
                  return { state: 'upcoming', badge: 'upcoming' };
                }
                if (hoursUntil > 0) {
                  return { state: 'scheduled', badge: 'scheduled' };
                }
              }

              return { state: hasEnrollment ? 'enrolled' : 'not-enrolled', badge: null };
            };

            const status = getExamStatus();

            return (
              <Card key={exam.id} className="flex flex-col h-full hover:shadow-lg transition-all group">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <FileQuestion className="h-5 w-5 text-primary" />
                    </div>
                    {status.badge && (
                      <ExamStatusBadge status={status.badge as any} booking={booking} />
                    )}
                  </div>
                  <CardTitle className="line-clamp-2">{exam.name}</CardTitle>
                  <CardDescription className="line-clamp-3 h-[60px]">
                    {exam.description || 'No description available'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{exam.duration || 60} minutes</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span>Passing: {exam.passingScore || 70}%</span>
                  </div>
                  {booking && (
                    <BookingInfo booking={booking} compact />
                  )}
                  {exam.price && !hasEnrollment && (
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <Award className="h-4 w-4" />
                      <span>{exam.price} tokens</span>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="mt-auto pt-4 flex-wrap gap-2">
                  {hasCompleted ? (
                    // Already completed - show results
                    <Button asChild className="flex-1 min-w-[120px]">
                      <Link href={`/exams/${exam.id}/results?courseId=${exam.courseId}`}>
                        View Results
                      </Link>
                    </Button>
                  ) : status.state === 'scheduled' || status.state === 'upcoming' ? (
                    // Scheduled - show start exam and view booking
                    <>
                      <Button asChild className="flex-1 min-w-[120px]">
                        <Link href={`/exams/${exam.id}/take?courseId=${exam.courseId}`}>
                          Start Exam
                        </Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href={`/exams/${exam.id}/schedule?courseId=${exam.courseId}`}>
                          <Calendar className="h-4 w-4 mr-1" />
                          Reschedule
                        </Link>
                      </Button>
                    </>
                  ) : hasEnrollment ? (
                    // Enrolled (either through course or direct purchase) - can start exam
                    <>
                      <Button asChild className="flex-1 min-w-[120px]">
                        <Link href={`/exams/${exam.id}/take?courseId=${exam.courseId}`}>
                          Start Exam
                        </Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href={`/exams/${exam.id}/schedule?courseId=${exam.courseId}`}>
                          <Calendar className="h-4 w-4 mr-1" />
                          Schedule
                        </Link>
                      </Button>
                    </>
                  ) : (
                    // Not enrolled - show add to cart
                    <>
                      <Button
                        className="flex-1 min-w-[120px]"
                        onClick={async () => {
                          if (!firestore || !user) {
                            toast({
                              variant: 'destructive',
                              title: 'Error',
                              description: 'You must be logged in.',
                            });
                            return;
                          }

                          try {
                            const { addToCart } = await import('@/lib/marketplace');
                            await addToCart(
                              firestore,
                              user.uid,
                              'exam',
                              exam.id,
                              exam.name,
                              exam.price || 0,
                              exam.description
                            );

                            toast({
                              title: 'Added to Cart',
                              description: `${exam.name} has been added to your cart.`,
                            });
                          } catch (error: any) {
                            toast({
                              variant: 'destructive',
                              title: 'Error',
                              description: error.message || 'Failed to add to cart.',
                            });
                          }
                        }}
                      >
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        Add to Cart
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href={`/exams/${exam.id}?courseId=${exam.courseId}`}>
                          Details
                        </Link>
                      </Button>
                    </>
                  )}

                  {/* Admin/Instructor Actions */}
                  {isClient && (userProfile?.role === 'Admin' || userProfile?.role === 'Instructor') && (
                    <div className="flex gap-1 border-l pl-2 ml-auto">
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        title="Edit Exam"
                      >
                        <Link href={`/admin/exams/${exam.id}/edit?courseId=${exam.courseId}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setExamToDelete({ courseId: exam.courseId, examId: exam.id });
                          setDeleteDialogOpen(true);
                        }}
                        title="Delete Exam"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this exam and all its questions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!firestore || !examToDelete) return;
                try {
                  await deleteExam(firestore, examToDelete.courseId, examToDelete.examId);
                  toast({
                    title: 'Success',
                    description: 'Exam deleted successfully',
                  });
                  // Refresh logic is handled by real-time listener in useCollection
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
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
