'use client';

import {
  Activity,
  ArrowUpRight,
  BookOpen,
  CircleDollarSign,
  Users,
  PlayCircle,
  Trophy
} from 'lucide-react';
import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { OverviewChart } from '@/components/dashboard/overview-chart';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, collectionGroup, where, orderBy, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';


export default function DashboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const usersCollectionQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'users')) : null),
    [firestore]
  );

  const { data: users, isLoading: isLoadingUsers } = useCollection(
    usersCollectionQuery
  );

  const coursesCollectionQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'courses')) : null),
    [firestore]
  );

  const { data: courses, isLoading: isLoadingCourses } = useCollection(
    coursesCollectionQuery
  );

  const examsCollectionQuery = useMemoFirebase(
    () => (firestore ? query(collectionGroup(firestore, 'exams')) : null),
    [firestore]
  );

  const { data: exams, isLoading: isLoadingExams } = useCollection(
    examsCollectionQuery
  );

  const tokenTransactionsQuery = useMemoFirebase(
    () => (firestore ? query(collectionGroup(firestore, 'tokenTransactions')) : null),
    [firestore]
  );

  const { data: tokenTransactions, isLoading: isLoadingTokenTransactions } = useCollection(
    tokenTransactionsQuery
  );

  const totalTokens = tokenTransactions?.reduce((sum, transaction) => sum + (transaction.amount || 0), 0) || 0;
  const totalValueTHB = totalTokens * 0.01;



  const recentEnrollmentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'enrollments'), orderBy('enrolledAt', 'desc'), limit(5)) : null),
    [firestore]
  );
  const { data: recentEnrollments, isLoading: isLoadingRecentEnrollments } = useCollection(recentEnrollmentsQuery);


  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 md:gap-8">
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tokens Transacted</CardTitle>
              <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingTokenTransactions ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{totalTokens.toLocaleString()} Tokens</div>
                  <p className="text-xs text-muted-foreground">
                    ≈ {totalValueTHB.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {users?.length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total registered users
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingCourses ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{courses?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">Total available courses</p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Exams</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingExams ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{exams?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Total active exams
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader className="flex flex-row items-center">
              <div className="grid gap-2">
                <CardTitle>Course Overview</CardTitle>
                <CardDescription>
                  Overview of available courses and their details.
                </CardDescription>
              </div>
              <Button asChild size="sm" className="ml-auto gap-1">
                <Link href="/courses">
                  View All
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingCourses ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : courses && courses.length > 0 ? (
                <div className="space-y-6">
                  {courses.slice(0, 5).map((course) => (
                    <div key={course.id} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="hidden h-9 w-9 items-center justify-center rounded-full border border-primary/10 bg-primary/10 sm:flex">
                          <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div className="grid gap-1">
                          <p className="text-sm font-medium leading-none">
                            {course.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-5">
                              {course.category || 'Uncategorized'}
                            </Badge>
                            <span>{course.difficulty || 'General'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="font-medium">
                          {course.price ? `${course.price.toFixed(2)} THB` : 'Free'}
                        </div>
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/courses/${course.id}`}>
                            View
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <BookOpen className="h-10 w-10 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No Courses Available</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mb-4">
                    No courses have been created yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Enrollments</CardTitle>
              <CardDescription>
                Recent student enrollments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {isLoadingRecentEnrollments ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[150px]" />
                          <Skeleton className="h-4 w-[100px]" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentEnrollments && recentEnrollments.length > 0 ? (
                  recentEnrollments.map((enrollment) => {
                    const user = users?.find((u) => u.id === enrollment.userId);
                    const course = courses?.find((c) => c.id === enrollment.courseId);
                    const userInitials = user?.displayName
                      ? user.displayName
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                      : '??';

                    return (
                      <div key={enrollment.id} className="flex items-center">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user?.photoURL || ''} alt="Avatar" />
                          <AvatarFallback>{userInitials}</AvatarFallback>
                        </Avatar>
                        <div className="ml-4 space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {user?.displayName || 'Unknown User'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {user?.email || 'No email'}
                          </p>
                        </div>
                        <div className="ml-auto font-medium">
                          {course?.price ? `+${course.price.toFixed(2)} THB` : 'Free'}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-sm text-muted-foreground py-4">
                    No recent enrollments found.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
