'use client';

import { useEffect, useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getUserBookings, cancelBooking } from '@/lib/scheduling';
import { Calendar, Clock, XCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Booking } from '@/types/scheduling';
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

export default function MyBookingsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

    useEffect(() => {
        if (firestore && user) {
            loadBookings();
        }
    }, [firestore, user]);

    const loadBookings = async () => {
        if (!firestore || !user) return;
        setIsLoading(true);
        try {
            const userBookings = await getUserBookings(firestore, user.uid);
            setBookings(userBookings);
        } catch (error) {
            console.error('Error loading bookings:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to load your bookings.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelClick = (booking: Booking) => {
        setSelectedBooking(booking);
        setShowCancelDialog(true);
    };

    const handleCancelConfirm = async () => {
        if (!firestore || !selectedBooking) return;

        setCancellingId(selectedBooking.id);
        try {
            const result = await cancelBooking(firestore, selectedBooking.id, 'Cancelled by user');

            if (result.success) {
                toast({
                    title: 'Booking Cancelled',
                    description: 'Your exam booking has been cancelled.',
                });
                await loadBookings(); // Refresh bookings
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Cancellation Failed',
                    description: result.error,
                });
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to cancel booking.',
            });
        } finally {
            setCancellingId(null);
            setShowCancelDialog(false);
            setSelectedBooking(null);
        }
    };

    const getStatusBadge = (status: Booking['status']) => {
        const variants: Record<Booking['status'], { variant: any; icon: any; label: string }> = {
            confirmed: { variant: 'default', icon: CheckCircle2, label: 'Confirmed' },
            cancelled: { variant: 'secondary', icon: XCircle, label: 'Cancelled' },
            completed: { variant: 'default', icon: CheckCircle2, label: 'Completed' },
            'no-show': { variant: 'destructive', icon: AlertCircle, label: 'No Show' },
        };

        const { variant, icon: Icon, label } = variants[status];
        return (
            <Badge variant={variant} className="flex items-center gap-1">
                <Icon className="h-3 w-3" />
                {label}
            </Badge>
        );
    };

    const upcomingBookings = bookings.filter(
        b => b.status === 'confirmed' && b.date.toMillis() > Date.now()
    );
    const pastBookings = bookings.filter(
        b => b.status !== 'confirmed' || b.date.toMillis() <= Date.now()
    );

    if (isLoading) {
        return (
            <div className="container mx-auto py-10 space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-[200px] rounded-xl" />
                <Skeleton className="h-[200px] rounded-xl" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight">My Exam Bookings</h1>
                <p className="text-muted-foreground text-lg">
                    View and manage your scheduled exams
                </p>
            </div>

            {/* Upcoming Bookings */}
            <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Upcoming Exams</h2>
                {upcomingBookings.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            No upcoming exams scheduled
                        </CardContent>
                    </Card>
                ) : (
                    upcomingBookings.map((booking) => (
                        <Card key={booking.id} className="hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <CardTitle>{booking.examName}</CardTitle>
                                        <CardDescription>Booking ID: {booking.id.slice(0, 8)}</CardDescription>
                                    </div>
                                    {getStatusBadge(booking.status)}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">
                                            {format(booking.date.toDate(), 'EEEE, MMMM d, yyyy')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">
                                            {booking.timeSlot === '09:00' && 'Morning (9:00 AM)'}
                                            {booking.timeSlot === '13:00' && 'Afternoon (1:00 PM)'}
                                            {booking.timeSlot === '17:00' && 'Evening (5:00 PM)'}
                                        </span>
                                    </div>
                                </div>

                                {booking.status === 'confirmed' && (
                                    <div className="flex gap-2">
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleCancelClick(booking)}
                                            disabled={cancellingId === booking.id}
                                        >
                                            {cancellingId === booking.id ? 'Cancelling...' : 'Cancel Booking'}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Past Bookings */}
            {pastBookings.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-2xl font-semibold">Past Exams</h2>
                    {pastBookings.map((booking) => (
                        <Card key={booking.id} className="opacity-75">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <CardTitle>{booking.examName}</CardTitle>
                                        <CardDescription>Booking ID: {booking.id.slice(0, 8)}</CardDescription>
                                    </div>
                                    {getStatusBadge(booking.status)}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span>{format(booking.date.toDate(), 'MMMM d, yyyy')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span>{booking.timeSlot}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Cancel Confirmation Dialog */}
            <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Exam Booking?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to cancel your booking for "{selectedBooking?.examName}"?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancelConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Cancel Booking
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
