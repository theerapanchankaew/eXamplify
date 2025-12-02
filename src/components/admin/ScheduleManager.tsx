'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
    createExamSchedule,
    updateExamSchedule,
    deleteExamSchedule,
    bulkCreateExamSchedules,
    bulkDeleteExamSchedules
} from '@/lib/scheduling';
import { Calendar as CalendarIcon, Clock, Users, Plus, CalendarClock, MoreVertical, Edit, Trash2 } from 'lucide-react';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';


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

type TimeSlot = typeof TIME_SLOTS[number]['value'];

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

    const [isProcessing, setIsProcessing] = useState(false);

    // State for create form
    const [createExam, setCreateExam] = useState<string>('');
    const [createDate, setCreateDate] = useState<Date | undefined>(new Date());
    const [createTimeSlot, setCreateTimeSlot] = useState<TimeSlot>('09:00');
    const [createCapacity, setCreateCapacity] = useState<number>(30);

    // State for edit dialog
    const [editSchedule, setEditSchedule] = useState<ExamSchedule | null>(null);
    const [editDate, setEditDate] = useState<Date | undefined>();
    const [editTimeSlot, setEditTimeSlot] = useState<TimeSlot>('09:00');
    const [editCapacity, setEditCapacity] = useState<number>(30);

    // State for delete dialog
    const [deleteTarget, setDeleteTarget] = useState<ExamSchedule | 'selected' | null>(null);

    // State for selection
    const [selectedSchedules, setSelectedSchedules] = useState<Set<string>>(new Set());

    const sortedSchedules = useMemo(() => {
        return [...schedules].sort((a, b) => a.date.toMillis() - b.date.toMillis());
    }, [schedules]);

    const handleSelect = (scheduleId: string) => {
        setSelectedSchedules(prev => {
            const newSet = new Set(prev);
            if (newSet.has(scheduleId)) {
                newSet.delete(scheduleId);
            } else {
                newSet.add(scheduleId);
            }
            return newSet;
        });
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedSchedules(new Set(sortedSchedules.map(s => s.id)));
        } else {
            setSelectedSchedules(new Set());
        }
    };

    const handleCreateSchedule = async () => {
        if (!firestore || !user || !createExam || !createDate) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please fill in all required fields.' });
            return;
        }

        const exam = exams.find(e => e.id === createExam);
        if (!exam) return;

        setIsProcessing(true);
        try {
            await createExamSchedule(
                firestore,
                exam.id,
                exam.name,
                exam.courseId,
                createDate,
                createTimeSlot,
                createCapacity,
                user.uid
            );
            toast({ title: 'Schedule Created', description: `Successfully created schedule for ${exam.name}` });
            window.location.reload();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to create schedule.' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBulkCreate = async () => {
        if (!firestore || !user || !createExam) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select an exam first.' });
            return;
        }

        const exam = exams.find(e => e.id === createExam);
        if (!exam) return;

        setIsProcessing(true);
        try {
            await bulkCreateExamSchedules(firestore, exam, createCapacity, user.uid);
            toast({ title: 'Bulk Creation Complete', description: `Created schedules for the next 30 days.` });
            window.location.reload();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to create schedules.' });
        } finally {
            setIsProcessing(false);
        }
    };

    const openEditDialog = (schedule: ExamSchedule) => {
        setEditSchedule(schedule);
        setEditDate(schedule.date.toDate());
        setEditTimeSlot(schedule.timeSlot as TimeSlot);
        setEditCapacity(schedule.capacity);
    };

    const handleUpdateSchedule = async () => {
        if (!firestore || !editSchedule) return;

        setIsProcessing(true);
        try {
            await updateExamSchedule(firestore, editSchedule.id, {
                date: editDate,
                timeSlot: editTimeSlot,
                capacity: editCapacity,
            });
            toast({ title: 'Schedule Updated', description: 'The schedule has been successfully updated.' });
            setEditSchedule(null);
            window.location.reload();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async () => {
        if (!firestore || !deleteTarget) return;

        setIsProcessing(true);
        try {
            if (deleteTarget === 'selected') {
                await bulkDeleteExamSchedules(firestore, Array.from(selectedSchedules));
                toast({ title: 'Schedules Deleted', description: `${selectedSchedules.size} schedules have been deleted.` });
                setSelectedSchedules(new Set());
            } else {
                await deleteExamSchedule(firestore, (deleteTarget as ExamSchedule).id);
                toast({ title: 'Schedule Deleted', description: 'The schedule has been successfully deleted.' });
            }
            setDeleteTarget(null);
            window.location.reload();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message });
        } finally {
            setIsProcessing(false);
        }
    };

    if (showCreateForm) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Create Exam Schedule</CardTitle>
                    <CardDescription>Set up time slots for students to book exams</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="exam">Exam</Label>
                        <Select value={createExam} onValueChange={setCreateExam}>
                            <SelectTrigger id="exam"><SelectValue placeholder="Select an exam" /></SelectTrigger>
                            <SelectContent>
                                {exams.map((exam) => (
                                    <SelectItem key={exam.id} value={exam.id}>{exam.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Calendar
                                mode="single"
                                selected={createDate}
                                onSelect={setCreateDate}
                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                className="rounded-md border"
                            />
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="timeSlot">Time Slot</Label>
                                <Select value={createTimeSlot} onValueChange={(v) => setCreateTimeSlot(v as TimeSlot)}>
                                    <SelectTrigger id="timeSlot"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {TIME_SLOTS.map((slot) => (
                                            <SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>
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
                                    value={createCapacity}
                                    onChange={(e) => setCreateCapacity(parseInt(e.target.value) || 30)}
                                />
                            </div>
                            <div className="pt-4 space-y-2">
                                <Button onClick={handleCreateSchedule} disabled={isProcessing || !createExam || !createDate} className="w-full">
                                    {isProcessing ? 'Creating...' : 'Create Schedule'}
                                </Button>
                                <Button onClick={handleBulkCreate} disabled={isProcessing || !createExam} variant="outline" className="w-full">
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

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Existing Schedules</CardTitle>
                        <CardDescription>View and manage all exam schedules</CardDescription>
                    </div>
                    {selectedSchedules.size > 0 && (
                        <Button variant="destructive" onClick={() => setDeleteTarget('selected')}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Selected ({selectedSchedules.size})
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {isLoadingSchedules ? (
                        <div className="text-center py-8 text-muted-foreground">Loading schedules...</div>
                    ) : sortedSchedules.length === 0 ? (
                        <div className="text-center py-16 space-y-6">
                            <div className="flex justify-center">
                                <div className="p-4 bg-primary/10 rounded-full"><CalendarClock className="h-12 w-12 text-primary" /></div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-semibold">No Exam Schedules Yet</h3>
                                <p className="text-muted-foreground max-w-md mx-auto">
                                    Create exam schedules to allow students to book time slots for their exams.
                                </p>
                            </div>
                            <Button size="lg" onClick={() => window.location.href = '/admin/schedules/create'} className="gap-2">
                                <Plus className="h-5 w-5" />
                                Create Your First Schedule
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead padding="checkbox">
                                        <Checkbox
                                            checked={selectedSchedules.size === sortedSchedules.length}
                                            onCheckedChange={handleSelectAll}
                                        />
                                    </TableHead>
                                    <TableHead>Exam</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Bookings</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedSchedules.map((schedule) => (
                                    <TableRow key={schedule.id} data-state={selectedSchedules.has(schedule.id) && "selected"}>
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                checked={selectedSchedules.has(schedule.id)}
                                                onCheckedChange={() => handleSelect(schedule.id)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">{schedule.examName}</TableCell>
                                        <TableCell>{format(schedule.date.toDate(), 'MMM d, yyyy')}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                                {TIME_SLOTS.find(t => t.value === schedule.timeSlot)?.label || schedule.timeSlot}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4 text-muted-foreground" />
                                                {schedule.bookedCount}/{schedule.capacity}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={schedule.status === 'available' ? 'default' : schedule.status === 'full' ? 'secondary' : 'destructive'}>
                                                {schedule.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openEditDialog(schedule)}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        <span>Edit</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => setDeleteTarget(schedule)}
                                                        className="text-destructive"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        <span>Delete</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={!!editSchedule} onOpenChange={(open) => !open && setEditSchedule(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Schedule</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Calendar
                                mode="single"
                                selected={editDate}
                                onSelect={setEditDate}
                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                className="rounded-md border"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-timeSlot">Time Slot</Label>
                            <Select value={editTimeSlot} onValueChange={(v) => setEditTimeSlot(v as TimeSlot)}>
                                <SelectTrigger id="edit-timeSlot"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {TIME_SLOTS.map((slot) => (
                                        <SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-capacity">Capacity</Label>
                            <Input
                                id="edit-capacity"
                                type="number"
                                min={editSchedule?.bookedCount ?? 1}
                                max="100"
                                value={editCapacity}
                                onChange={(e) => setEditCapacity(parseInt(e.target.value) || 1)}
                            />
                            <p className="text-sm text-muted-foreground">
                                Cannot be lower than the number of currently booked students ({editSchedule?.bookedCount ?? 0}).
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleUpdateSchedule} disabled={isProcessing}>
                            {isProcessing ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTarget === 'selected'
                                ? `This will permanently delete the ${selectedSchedules.size} selected schedules and any associated bookings.`
                                : 'This action cannot be undone. This will permanently delete the schedule and any associated bookings.'}
                            Booked students will be notified.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isProcessing} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {isProcessing ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
