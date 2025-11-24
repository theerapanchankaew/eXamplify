import { Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Booking } from '@/types/scheduling';

interface BookingInfoProps {
    booking: Booking;
    compact?: boolean;
}

const TIME_SLOTS = [
    { value: '09:00', label: 'Morning (9:00 AM)' },
    { value: '13:00', label: 'Afternoon (1:00 PM)' },
    { value: '17:00', label: 'Evening (5:00 PM)' },
] as const;

export function BookingInfo({ booking, compact = false }: BookingInfoProps) {
    const examDate = booking.date.toDate();
    const timeSlotLabel = TIME_SLOTS.find(t => t.value === booking.timeSlot)?.label;

    if (compact) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{format(examDate, 'MMM d')} at {booking.timeSlot}</span>
            </div>
        );
    }

    return (
        <div className="space-y-2 p-3 bg-secondary/20 rounded-lg border border-border/50">
            <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="font-medium">{format(examDate, 'EEEE, MMMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-primary" />
                <span className="font-medium">{timeSlotLabel}</span>
            </div>
        </div>
    );
}
