import {
    Firestore,
    collection,
    doc,
    addDoc,
    updateDoc,
    getDoc,
    getDocs,
    query,
    where,
    serverTimestamp,
    Timestamp,
    increment,
    writeBatch,
} from 'firebase/firestore';
import { ExamSchedule, Booking } from '@/types/scheduling';

/**
 * Create exam schedule (Admin/Instructor only)
 */
export async function createExamSchedule(
    firestore: Firestore,
    examId: string,
    examName: string,
    courseId: string,
    date: Date,
    timeSlot: '09:00' | '13:00' | '17:00',
    capacity: number,
    createdBy: string
): Promise<string> {
    const scheduleRef = await addDoc(collection(firestore, 'examSchedules'), {
        examId,
        examName,
        courseId,
        date: Timestamp.fromDate(date),
        timeSlot,
        capacity,
        bookedCount: 0,
        status: 'available',
        createdAt: serverTimestamp(),
        createdBy,
    });

    return scheduleRef.id;
}

/**
 * Get available schedules for an exam
 */
export async function getAvailableSchedules(
    firestore: Firestore,
    examId: string
): Promise<ExamSchedule[]> {
    const q = query(
        collection(firestore, 'examSchedules'),
        where('examId', '==', examId),
        where('status', '==', 'available')
    );

    const snapshot = await getDocs(q);
    const now = Date.now();

    return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as ExamSchedule))
        .filter(schedule => schedule.date.toMillis() > now) // Only future dates
        .sort((a, b) => a.date.toMillis() - b.date.toMillis());
}

/**
 * Book exam slot
 */
export async function bookExamSlot(
    firestore: Firestore,
    userId: string,
    userName: string,
    userEmail: string,
    scheduleId: string
): Promise<{ success: boolean; bookingId?: string; error?: string }> {
    try {
        // Get schedule
        const scheduleRef = doc(firestore, 'examSchedules', scheduleId);
        const scheduleSnap = await getDoc(scheduleRef);

        if (!scheduleSnap.exists()) {
            return { success: false, error: 'Schedule not found' };
        }

        const schedule = scheduleSnap.data() as ExamSchedule;

        // Check availability
        if (schedule.status !== 'available') {
            return { success: false, error: 'This slot is no longer available' };
        }

        if (schedule.bookedCount >= schedule.capacity) {
            return { success: false, error: 'This slot is full' };
        }

        // Check if user already booked this exam
        const existingBookingQuery = query(
            collection(firestore, 'bookings'),
            where('userId', '==', userId),
            where('examId', '==', schedule.examId),
            where('status', '==', 'confirmed')
        );
        const existingBookings = await getDocs(existingBookingQuery);

        if (!existingBookings.empty) {
            return { success: false, error: 'You already have a booking for this exam' };
        }

        // Create booking
        const batch = writeBatch(firestore);

        const bookingRef = doc(collection(firestore, 'bookings'));
        batch.set(bookingRef, {
            userId,
            userName,
            userEmail,
            examId: schedule.examId,
            examName: schedule.examName,
            courseId: schedule.courseId,
            scheduleId,
            date: schedule.date,
            timeSlot: schedule.timeSlot,
            status: 'confirmed',
            bookedAt: serverTimestamp(),
            reminderSent: false,
        });

        // Update schedule booked count
        batch.update(scheduleRef, {
            bookedCount: increment(1),
            status: schedule.bookedCount + 1 >= schedule.capacity ? 'full' : 'available',
        });

        await batch.commit();

        return { success: true, bookingId: bookingRef.id };
    } catch (error: any) {
        console.error('Booking error:', error);
        return { success: false, error: error.message || 'Failed to book exam slot' };
    }
}

/**
 * Cancel booking
 */
export async function cancelBooking(
    firestore: Firestore,
    bookingId: string,
    reason?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const bookingRef = doc(firestore, 'bookings', bookingId);
        const bookingSnap = await getDoc(bookingRef);

        if (!bookingSnap.exists()) {
            return { success: false, error: 'Booking not found' };
        }

        const booking = bookingSnap.data() as Booking;

        if (booking.status !== 'confirmed') {
            return { success: false, error: 'This booking cannot be cancelled' };
        }

        const batch = writeBatch(firestore);

        // Update booking
        batch.update(bookingRef, {
            status: 'cancelled',
            cancelledAt: serverTimestamp(),
            cancellationReason: reason || 'Cancelled by user',
        });

        // Update schedule
        const scheduleRef = doc(firestore, 'examSchedules', booking.scheduleId);
        batch.update(scheduleRef, {
            bookedCount: increment(-1),
            status: 'available',
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error('Cancellation error:', error);
        return { success: false, error: error.message || 'Failed to cancel booking' };
    }
}

/**
 * Get user's bookings
 */
export async function getUserBookings(
    firestore: Firestore,
    userId: string
): Promise<Booking[]> {
    const q = query(
        collection(firestore, 'bookings'),
        where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Booking))
        .sort((a, b) => b.bookedAt.toMillis() - a.bookedAt.toMillis());
}
