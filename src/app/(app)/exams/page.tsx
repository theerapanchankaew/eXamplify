'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collectionGroup, query, doc } from 'firebase/firestore';
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
  ShoppingCart
} from 'lucide-react';
import Link from 'next/link';

export default function ExamsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'difficulty'>('name');

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
    () => (firestore && user ? query(collectionGroup(firestore, 'examResults')) : null),
    [firestore, user]
  );
  const { data: examResults } = useCollection(resultsQuery);

  // Fetch enrollments to check if user has access
  const enrollmentsQuery = useMemoFirebase(
    () => (firestore && user ? query(collectionGroup(firestore, 'enrollments')) : null),
    [firestore, user]
  );
  const { data: enrollments } = useCollection(enrollmentsQuery);

  // Show error if query failed
  if (error) {
    console.error('Error loading exams:', error);
  }

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
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Exams & Certifications</h1>
        <p className="text-muted-foreground text-lg">
          Test your knowledge and earn certificates
        </p>
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
          <SelectTrigger className="w-[180px]">
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
          <SelectTrigger className="w-[180px]">
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
            const enrollment = enrollments?.find(e => e.courseId === exam.courseId && e.userId === user?.uid);
            const hasCompleted = !!examResult;
            const hasPassed = examResult?.passed;

            return (
              <Card key={exam.id} className="flex flex-col hover:shadow-lg transition-all group">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <FileQuestion className="h-5 w-5 text-primary" />
                    </div>
                    {hasCompleted && (
                      <Badge variant={hasPassed ? 'default' : 'secondary'}>
                        {hasPassed ? (
                          <><CheckCircle2 className="mr-1 h-3 w-3" /> Passed</>
                        ) : (
                          <><XCircle className="mr-1 h-3 w-3" /> Failed</>
                        )}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="line-clamp-2">{exam.name}</CardTitle>
                  <CardDescription className="line-clamp-3">
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
                  {exam.price && (
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <Award className="h-4 w-4" />
                      <span>{exam.price} tokens</span>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex gap-2">
                  {hasCompleted ? (
                    // Already completed - show results
                    <Button asChild className="flex-1">
                      <Link href={`/exams/${exam.id}`}>
                        View Results
                      </Link>
                    </Button>
                  ) : enrollment ? (
                    // Enrolled but not completed - can start exam
                    <>
                      <Button asChild className="flex-1">
                        <Link href={`/exams/${exam.id}/take`}>
                          Start Exam
                        </Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href={`/exams/${exam.id}/schedule`}>
                          <Calendar className="h-4 w-4 mr-1" />
                          Schedule
                        </Link>
                      </Button>
                    </>
                  ) : (
                    // Not enrolled - show add to cart
                    <>
                      <Button
                        className="flex-1"
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
                        <Link href={`/exams/${exam.id}`}>
                          Details
                        </Link>
                      </Button>
                    </>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
