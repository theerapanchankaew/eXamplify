import { Timestamp } from 'firebase/firestore';

/**
 * Exam Schedule - Available time slots for exams
 */
export interface ExamSchedule {
    id: string;
    examId: string;
    examName: string;
    courseId: string;
    date: Timestamp; // Exam date
    timeSlot: '09:00' | '13:00' | '17:00'; // Morning, Afternoon, Evening
    capacity: number; // Maximum students per slot
    bookedCount: number; // Current bookings
    status: 'available' | 'full' | 'cancelled';
    createdAt: Timestamp;
    createdBy: string; // Instructor/Admin ID
}

/**
 * Booking - Student's exam appointment
 */
export interface Booking {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    examId: string;
    examName: string;
    courseId: string;
    scheduleId: string; // Reference to ExamSchedule
    date: Timestamp;
    timeSlot: '09:00' | '13:00' | '17:00';
    status: 'confirmed' | 'cancelled' | 'completed' | 'no-show';
    bookedAt: Timestamp;
    completedAt?: Timestamp;
    cancelledAt?: Timestamp;
    cancellationReason?: string;
    reminderSent?: boolean;
}

/**
 * Time Slot Info (for UI display)
 */
export interface TimeSlotInfo {
    slot: '09:00' | '13:00' | '17:00';
    label: string;
    available: boolean;
    capacity: number;
    booked: number;
    scheduleId?: string;
}
