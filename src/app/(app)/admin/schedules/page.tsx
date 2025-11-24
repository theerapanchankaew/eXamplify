'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, collectionGroup, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Plus, List } from 'lucide-react';
import { ScheduleManager } from '@/components/admin/ScheduleManager';

export default function AdminSchedulesPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [showCreateForm, setShowCreateForm] = useState(false);

    // Fetch user profile to check role
    const userDocRef = useMemoFirebase(
        () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
        [firestore, user]
    );
    const { data: userProfile, isLoading: isLoadingProfile } = useDoc(userDocRef);

    // Fetch all exams for schedule creation
    const examsQuery = useMemoFirebase(
        () => (firestore ? query(collectionGroup(firestore, 'exams')) : null),
        [firestore]
    );
    const { data: exams, isLoading: isLoadingExams } = useCollection(examsQuery);

    // Fetch all schedules
    const schedulesQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'examSchedules')) : null),
        [firestore]
    );
    const { data: schedules, isLoading: isLoadingSchedules } = useCollection(schedulesQuery);

    // Check authorization
    const isAuthorized = userProfile?.role === 'Admin' || userProfile?.role === 'Instructor';

    if (isLoadingProfile) {
        return (
            <div className="container mx-auto py-10">
                <Skeleton className="h-[600px] rounded-xl" />
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="container mx-auto py-20 text-center">
                <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
                <p className="text-muted-foreground">
                    You don't have permission to access this page.
                </p>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10 space-y-8">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">Exam Schedules</h1>
                    <p className="text-muted-foreground text-lg">
                        Manage exam time slots and availability
                    </p>
                </div>
                <Button onClick={() => setShowCreateForm(!showCreateForm)}>
                    {showCreateForm ? (
                        <>
                            <List className="mr-2 h-4 w-4" />
                            View Schedules
                        </>
                    ) : (
                        <>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Schedule
                        </>
                    )}
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <Calendar className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">
                                    {schedules?.length || 0}
                                </div>
                                <div className="text-sm text-muted-foreground">Total Schedules</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-500/10 rounded-lg">
                                <Calendar className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">
                                    {schedules?.filter(s => s.status === 'available').length || 0}
                                </div>
                                <div className="text-sm text-muted-foreground">Available</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-amber-500/10 rounded-lg">
                                <Calendar className="h-6 w-6 text-amber-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">
                                    {schedules?.filter(s => s.status === 'full').length || 0}
                                </div>
                                <div className="text-sm text-muted-foreground">Full</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Schedule Manager */}
            <ScheduleManager
                exams={exams || []}
                schedules={schedules || []}
                showCreateForm={showCreateForm}
                isLoadingExams={isLoadingExams}
                isLoadingSchedules={isLoadingSchedules}
            />
        </div>
    );
}
