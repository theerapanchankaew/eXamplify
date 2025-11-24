'use client';

import { useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { createExamSchedule } from '@/lib/scheduling';
import { Calendar as CalendarIcon, Clock, Users, Plus, CalendarClock } from 'lucide-react';
import { format } from 'date-fns';
import { ExamSchedule } from '@/types/scheduling';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface ScheduleManagerProps {
    exams: any[];
    schedules: ExamSchedule[];
    showCreateForm: boolean;
    isLoadingExams: boolean;
    isLoadingSchedules: boolean;
}

const TIME_SLOTS = [
    { value: '09:00', label: 'Morning (9:00 AM)' },
    { value: '13:00', label: 'Afternoon (1:00 PM)' },
    { value: '17:00', label: 'Evening (5:00 PM)' },
] as const;

export function ScheduleManager({
    exams,
    schedules,
    showCreateForm,
    isLoadingExams,
    isLoadingSchedules,
}: ScheduleManagerProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [selectedExam, setSelectedExam] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<'09:00' | '13:00' | '17:00'>('09:00');
    const [capacity, setCapacity] = useState<number>(30);
    const [isCreating, setIsCreating] = useState(false);

    const handleCreateSchedule = async () => {
        if (!firestore || !user || !selectedExam || !selectedDate) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Please fill in all required fields.',
            });
            return;
        }

        const exam = exams.find(e => e.id === selectedExam);
        if (!exam) return;

        setIsCreating(true);
        try {
            await createExamSchedule(
                firestore,
                exam.id,
                exam.name,
                exam.courseId,
                selectedDate,
                selectedTimeSlot,
                capacity,
                user.uid
            );

            toast({
                title: 'Schedule Created',
                description: `Successfully created schedule for ${exam.name}`,
            });

            // Reset form
            setSelectedExam('');
            setSelectedDate(new Date());
            setSelectedTimeSlot('09:00');
            setCapacity(30);

            // Refresh page to show new schedule
            window.location.reload();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to create schedule.',
            });
        } finally {
            setIsCreating(false);
        }
    };

    const handleBulkCreate = async () => {
        if (!firestore || !user || !selectedExam) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Please select an exam first.',
            });
            return;
        }

        const exam = exams.find(e => e.id === selectedExam);
        if (!exam) return;

        setIsCreating(true);
        try {
            const promises = [];
            const startDate = new Date();

            // Create schedules for next 30 days
            for (let i = 0; i < 30; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);

                // Create all 3 time slots for each day
                for (const slot of TIME_SLOTS) {
                    promises.push(
                        createExamSchedule(
                            firestore,
                            exam.id,
                            exam.name,
                            exam.courseId,
                            date,
                            slot.value as '09:00' | '13:00' | '17:00',
                            capacity,
                            user.uid
                        )
                    );
                }
            }

            await Promise.all(promises);

            toast({
                title: 'Bulk Creation Complete',
                description: `Created ${promises.length} schedules for the next 30 days.`,
            });

            window.location.reload();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to create schedules.',
            });
        } finally {
            setIsCreating(false);
        }
    };

    if (showCreateForm) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Create Exam Schedule</CardTitle>
                    <CardDescription>
                        Set up time slots for students to book exams
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Exam Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="exam">Exam</Label>
                        <Select value={selectedExam} onValueChange={setSelectedExam}>
                            <SelectTrigger id="exam">
                                <SelectValue placeholder="Select an exam" />
                            </SelectTrigger>
                            <SelectContent>
                                {exams.map((exam) => (
                                    <SelectItem key={exam.id} value={exam.id}>
                                        {exam.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Date Selection */}
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                disabled={(date) => date < new Date()}
                                className="rounded-md border"
                            />
                        </div>

                        {/* Time Slot and Capacity */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="timeSlot">Time Slot</Label>
                                <Select
                                    value={selectedTimeSlot}
                                    onValueChange={(v) => setSelectedTimeSlot(v as any)}
                                >
                                    <SelectTrigger id="timeSlot">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TIME_SLOTS.map((slot) => (
                                            <SelectItem key={slot.value} value={slot.value}>
                                                {slot.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="capacity">Capacity</Label>
                                <Input
                                    id="capacity"
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={capacity}
                                    onChange={(e) => setCapacity(parseInt(e.target.value) || 30)}
                                />
                            </div>

                            <div className="pt-4 space-y-2">
                                <Button
                                    onClick={handleCreateSchedule}
                                    disabled={isCreating || !selectedExam || !selectedDate}
                                    className="w-full"
                                >
                                    {isCreating ? 'Creating...' : 'Create Schedule'}
                                </Button>

                                <Button
                                    onClick={handleBulkCreate}
                                    disabled={isCreating || !selectedExam}
                                    variant="outline"
                                    className="w-full"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Bulk Create (30 Days)
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Schedule List View
    return (
        <Card>
            <CardHeader>
                <CardTitle>Existing Schedules</CardTitle>
                <CardDescription>
                    View and manage all exam schedules
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoadingSchedules ? (
                    <div className="text-center py-8 text-muted-foreground">
                        Loading schedules...
                    </div>
                ) : schedules.length === 0 ? (
                    <div className="text-center py-16 space-y-6">
                        <div className="flex justify-center">
                            <div className="p-4 bg-primary/10 rounded-full">
                                <CalendarClock className="h-12 w-12 text-primary" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold">No Exam Schedules Yet</h3>
                            <p className="text-muted-foreground max-w-md mx-auto">
                                Create exam schedules to allow students to book time slots for their exams.
                                You can create individual schedules or bulk create for multiple days.
                            </p>
                        </div>
                        <div className="flex gap-3 justify-center">
                            <Button
                                size="lg"
                                onClick={() => window.location.reload()}
                                className="gap-2"
                            >
                                <Plus className="h-5 w-5" />
                                Create Your First Schedule
                            </Button>
                        </div>
                        <div className="pt-4 border-t max-w-md mx-auto">
                            <p className="text-sm text-muted-foreground">
                                💡 <strong>Tip:</strong> Use the "Create Schedule" button at the top right to get started,
                                or use "Bulk Create" to set up schedules for the next 30 days automatically.
                            </p>
                        </div>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Exam</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Time</TableHead>
                                <TableHead>Capacity</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {schedules
                                .sort((a, b) => a.date.toMillis() - b.date.toMillis())
                                .map((schedule) => (
                                    <TableRow key={schedule.id}>
                                        <TableCell className="font-medium">
                                            {schedule.examName}
                                        </TableCell>
                                        <TableCell>
                                            {format(schedule.date.toDate(), 'MMM d, yyyy')}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                                {TIME_SLOTS.find(t => t.value === schedule.timeSlot)?.label}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4 text-muted-foreground" />
                                                {schedule.bookedCount}/{schedule.capacity}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    schedule.status === 'available'
                                                        ? 'default'
                                                        : schedule.status === 'full'
                                                            ? 'secondary'
                                                            : 'destructive'
                                                }
                                            >
                                                {schedule.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
