import { Timestamp } from '@/lib/db/wire';

export interface ExamSchedule {
    id: string;
    examId: string;
    examName: string;
    courseId: string;
    date: Timestamp;
    timeSlot: string;
    capacity: number;
    bookedCount: number;
    status: 'available' | 'full' | 'cancelled';
    createdBy: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface ExamScheduleUpdate {
    date?: Date;
    timeSlot?: string;
    capacity?: number;
    status?: 'available' | 'full' | 'cancelled';
}

export type BookingStatus = 'confirmed' | 'cancelled' | 'completed' | 'no-show';

/**
 * A user's booking of an exam schedule slot, stored in the `bookings`
 * collection. Schedule details (exam name, date, time slot) are copied in so
 * booking lists can render without extra reads.
 */
export interface Booking {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    scheduleId: string;
    examId: string;
    examName: string;
    courseId: string;
    date: Timestamp;
    timeSlot: string;
    bookingDate: Timestamp;
    status: BookingStatus;
    cancelledAt?: Timestamp;
    cancelReason?: string;
}

/** @deprecated use Booking */
export type UserBooking = Booking;

/** A time slot as displayed in the booking calendar. */
export interface TimeSlotInfo {
    slot: string;
    label: string;
    available: boolean;
    capacity: number;
    booked: number;
    scheduleId?: string;
}
