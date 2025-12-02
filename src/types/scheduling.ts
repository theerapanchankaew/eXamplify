import { Timestamp } from 'firebase/firestore';

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

export interface UserBooking {
    id: string;
    userId: string;
    scheduleId: string;
    examId: string;
    courseId: string;
    bookingDate: Timestamp;
    status: 'confirmed' | 'cancelled'; // e.g., if user cancels
}
