'use client';

import { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useFirestore, useUser } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { bookExamSlot, getAvailableSchedules } from '@/lib/scheduling';
import { Clock, Users, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { useEffect } from 'react';
import { ExamSchedule, TimeSlotInfo } from '@/types/scheduling';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

const TIME_SLOTS: { slot: '09:00' | '13:00' | '17:00'; label: string }[] = [
    { slot: '09:00', label: 'Morning (9:00 AM)' },
    { slot: '13:00', label: 'Afternoon (1:00 PM)' },
    { slot: '17:00', label: 'Evening (5:00 PM)' },
];

export default function ScheduleExamPage() {
    const { examId } = useParams();
    const searchParams = useSearchParams();
    const examName = searchParams.get('name') || 'Exam';
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSchedule, setSelectedSchedule] = useState<ExamSchedule | null>(null);
    const [isBooking, setIsBooking] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    useEffect(() => {
        if (firestore && examId) {
            loadSchedules();
        }
    }, [firestore, examId]);

    const loadSchedules = async () => {
        if (!firestore) return;
        setIsLoading(true);
        try {
            const availableSchedules = await getAvailableSchedules(firestore, examId as string);
            setSchedules(availableSchedules);
        } catch (error) {
            console.error('Error loading schedules:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to load available schedules.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getTimeSlotsForDate = (date: Date): TimeSlotInfo[] => {
        const dateStr = format(date, 'yyyy-MM-dd');

        return TIME_SLOTS.map(({ slot, label }) => {
            const schedule = schedules.find(
                s => format(s.date.toDate(), 'yyyy-MM-dd') === dateStr && s.timeSlot === slot
            );

            return {
                slot,
                label,
                available: schedule ? schedule.bookedCount < schedule.capacity : false,
                capacity: schedule?.capacity || 0,
                booked: schedule?.bookedCount || 0,
                scheduleId: schedule?.id,
            };
        });
    };

    const handleBooking = async () => {
        if (!firestore || !user || !selectedSchedule) return;

        setIsBooking(true);
        try {
            const result = await bookExamSlot(
                firestore,
                user.uid,
                user.displayName || user.email || 'Student',
                user.email || '',
                selectedSchedule.id
            );

            if (result.success) {
                setShowConfirmation(true);
                await loadSchedules(); // Refresh schedules
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Booking Failed',
                    description: result.error,
                });
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to book exam slot.',
            });
        } finally {
            setIsBooking(false);
        }
    };

    const timeSlots = selectedDate ? getTimeSlotsForDate(selectedDate) : [];

    if (isLoading) {
        return (
            <div className="container mx-auto py-10">
                <Skeleton className="h-[600px] rounded-xl" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight">Schedule Exam</h1>
                <p className="text-muted-foreground text-lg">{examName}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Calendar */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5" />
                            Select Date
                        </CardTitle>
                        <CardDescription>Choose a date for your exam</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            disabled={(date) => date < new Date() || date < new Date(new Date().setHours(0, 0, 0, 0))}
                            className="rounded-md border"
                        />
                    </CardContent>
                </Card>

                {/* Time Slots */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Select Time Slot
                        </CardTitle>
                        <CardDescription>
                            {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a date first'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!selectedDate ? (
                            <div className="text-center py-8 text-muted-foreground">
                                Please select a date from the calendar
                            </div>
                        ) : timeSlots.length === 0 || !timeSlots.some(t => t.available) ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No available slots for this date
                            </div>
                        ) : (
                            timeSlots.map((slot) => (
                                <Card
                                    key={slot.slot}
                                    className={`cursor-pointer transition-all ${!slot.available
                                            ? 'opacity-50 cursor-not-allowed'
                                            : selectedSchedule?.timeSlot === slot.slot
                                                ? 'border-primary bg-primary/5'
                                                : 'hover:border-primary/50'
                                        }`}
                                    onClick={() => {
                                        if (slot.available && slot.scheduleId) {
                                            const schedule = schedules.find(s => s.id === slot.scheduleId);
                                            setSelectedSchedule(schedule || null);
                                        }
                                    }}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Clock className="h-5 w-5 text-muted-foreground" />
                                                <div>
                                                    <div className="font-semibold">{slot.label}</div>
                                                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                        <Users className="h-3 w-3" />
                                                        {slot.booked}/{slot.capacity} booked
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge variant={slot.available ? 'default' : 'secondary'}>
                                                {slot.available ? 'Available' : 'Full'}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}

                        {selectedSchedule && (
                            <Button
                                className="w-full"
                                size="lg"
                                onClick={handleBooking}
                                disabled={isBooking}
                            >
                                {isBooking ? 'Booking...' : 'Confirm Booking'}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Confirmation Dialog */}
            <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
                <DialogContent>
                    <DialogHeader>
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                                <CheckCircle2 className="h-12 w-12 text-green-600" />
                            </div>
                        </div>
                        <DialogTitle className="text-center text-2xl">Booking Confirmed!</DialogTitle>
                        <DialogDescription className="text-center">
                            Your exam has been successfully scheduled.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="bg-secondary p-4 rounded-lg space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Exam:</span>
                                <span className="font-semibold">{examName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Date:</span>
                                <span className="font-semibold">
                                    {selectedDate && format(selectedDate, 'MMMM d, yyyy')}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Time:</span>
                                <span className="font-semibold">
                                    {TIME_SLOTS.find(t => t.slot === selectedSchedule?.timeSlot)?.label}
                                </span>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setShowConfirmation(false)} className="w-full">
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
