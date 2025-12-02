'use client';

import { doc, setDoc, updateDoc, deleteDoc, Timestamp, collection, query, where, getDocs, writeBatch, runTransaction } from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';
import { ExamSchedule, ExamScheduleUpdate, UserBooking } from '@/types/scheduling';

const TIME_SLOTS = [
    { value: '09:00', label: 'Morning (9:00 AM)' },
    { value: '13:00', label: 'Afternoon (1:00 PM)' },
    { value: '17:00', label: 'Evening (5:00 PM)' },
] as const;

/**
 * Creates a new exam schedule in Firestore.
 */
export const createExamSchedule = async (
    firestore: Firestore,
    examId: string,
    examName: string,
    courseId: string,
    date: Date,
    timeSlot: '09:00' | '13:00' | '17:00',
    capacity: number,
    createdBy: string
): Promise<string> => {
    const scheduleId = `${examId}_${date.toISOString().split('T')[0]}_${timeSlot}`;
    const scheduleRef = doc(firestore, 'examSchedules', scheduleId);

    const newSchedule: ExamSchedule = {
        id: scheduleId,
        examId,
        examName,
        courseId,
        date: Timestamp.fromDate(date),
        timeSlot,
        capacity,
        bookedCount: 0,
        status: 'available',
        createdBy,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    };

    await setDoc(scheduleRef, newSchedule);
    return scheduleId;
};

/**
 * Updates an existing exam schedule in Firestore.
 */
export const updateExamSchedule = async (
    firestore: Firestore,
    scheduleId: string,
    updates: ExamScheduleUpdate
): Promise<void> => {
    const scheduleRef = doc(firestore, 'examSchedules', scheduleId);

    const finalUpdates: any = { ...updates, updatedAt: Timestamp.now() };

    if (updates.date) {
        finalUpdates.date = Timestamp.fromDate(updates.date);
    }

    await updateDoc(scheduleRef, finalUpdates);
};

/**
 * Deletes an exam schedule from Firestore.
 */
export const deleteExamSchedule = async (
    firestore: Firestore,
    scheduleId: string
): Promise<void> => {
    const scheduleRef = doc(firestore, 'examSchedules', scheduleId);
    await deleteDoc(scheduleRef);
};

/**
 * Bulk deletes multiple exam schedules.
 */
export const bulkDeleteExamSchedules = async (
    firestore: Firestore,
    scheduleIds: string[]
): Promise<void> => {
    const batch = writeBatch(firestore);
    scheduleIds.forEach(id => {
        const scheduleRef = doc(firestore, 'examSchedules', id);
        batch.delete(scheduleRef);
    });
    await batch.commit();
};


/**
 * Bulk creates exam schedules for a given exam for the next 30 days.
 */
export const bulkCreateExamSchedules = async (
    firestore: Firestore,
    exam: { id: string, name: string, courseId: string },
    capacity: number,
    createdBy: string
): Promise<void> => {
    const batch = writeBatch(firestore);
    const today = new Date();

    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);

        for (const slot of TIME_SLOTS) {
            const scheduleId = `${exam.id}_${date.toISOString().split('T')[0]}_${slot.value}`;
            const scheduleRef = doc(firestore, 'examSchedules', scheduleId);

            const newSchedule: ExamSchedule = {
                id: scheduleId,
                examId: exam.id,
                examName: exam.name,
                courseId: exam.courseId,
                date: Timestamp.fromDate(date),
                timeSlot: slot.value,
                capacity,
                bookedCount: 0,
                status: 'available',
                createdBy,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            };

            batch.set(scheduleRef, newSchedule);
        }
    }

    await batch.commit();
};

/**
 * Retrieves all exam schedules for a given course.
 */
export const getSchedulesByCourse = async (firestore: Firestore, courseId: string): Promise<ExamSchedule[]> => {
    const schedulesRef = collection(firestore, 'examSchedules');
    const q = query(schedulesRef, where('courseId', '==', courseId));

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as ExamSchedule);
};

/**
 * Retrieves all bookings for a specific user.
 */
export const getUserBookings = async (firestore: Firestore, userId: string): Promise<UserBooking[]> => {
    const bookingsRef = collection(firestore, 'userBookings');
    const q = query(bookingsRef, where('userId', '==', userId));
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as UserBooking);
};

/**
 * Cancels a user's exam booking.
 */
export const cancelBooking = async (
    firestore: Firestore,
    bookingId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await runTransaction(firestore, async (transaction) => {
        const bookingRef = doc(firestore, 'userBookings', bookingId);
        const bookingDoc = await transaction.get(bookingRef);
  
        if (!bookingDoc.exists()) {
          throw new Error('Booking not found.');
        }
  
        const booking = bookingDoc.data() as UserBooking;
        const scheduleRef = doc(firestore, 'examSchedules', booking.scheduleId);
        const scheduleDoc = await transaction.get(scheduleRef);
  
        if (!scheduleDoc.exists()) {
          // If schedule is not found, the booking is orphaned, but we can still cancel it.
          transaction.update(bookingRef, { status: 'cancelled' });
          return;
        }
  
        const schedule = scheduleDoc.data() as ExamSchedule;
  
        // Update booking status
        transaction.update(bookingRef, { status: 'cancelled' });
  
        // Decrement booked count and update schedule status
        const newBookedCount = Math.max(0, schedule.bookedCount - 1);
        const newStatus = newBookedCount < schedule.capacity ? 'available' : 'full';
  
        transaction.update(scheduleRef, {
          bookedCount: newBookedCount,
          status: newStatus,
          updatedAt: Timestamp.now(),
        });
      });
  
      return { success: true };
    } catch (error: any) {
      console.error("Error cancelling booking: ", error);
      return { success: false, error: error.message };
    }
  };

/**
 * Retrieves all available exam schedules for a given exam.
 */
export const getAvailableSchedules = async (firestore: Firestore, examId: string): Promise<ExamSchedule[]> => {
    const schedulesRef = collection(firestore, 'examSchedules');
    const q = query(schedulesRef, where('examId', '==', examId), where('status', '==', 'available'));

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as ExamSchedule);
};

/**
 * Books an exam slot for a user.
 */
export const bookExamSlot = async (
    firestore: Firestore,
    userId: string,
    scheduleId: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        await runTransaction(firestore, async (transaction) => {
            const scheduleRef = doc(firestore, 'examSchedules', scheduleId);
            const scheduleDoc = await transaction.get(scheduleRef);

            if (!scheduleDoc.exists()) {
                throw new Error('Schedule not found.');
            }

            const schedule = scheduleDoc.data() as ExamSchedule;

            if (schedule.status !== 'available' || schedule.bookedCount >= schedule.capacity) {
                throw new Error('This slot is no longer available.');
            }

            // Check if user has already booked this exam
            const userBookingsRef = collection(firestore, 'userBookings');
            const q = query(userBookingsRef, where('userId', '==', userId), where('examId', '==', schedule.examId));
            const existingBooking = await getDocs(q);

            if (!existingBooking.isEmpty) {
                throw new Error('You have already booked this exam.');
            }


            const newBookedCount = schedule.bookedCount + 1;
            const newStatus = newBookedCount >= schedule.capacity ? 'full' : 'available';

            transaction.update(scheduleRef, {
                bookedCount: newBookedCount,
                status: newStatus,
                updatedAt: Timestamp.now(),
            });

            const bookingId = `${userId}_${scheduleId}`;
            const bookingRef = doc(firestore, 'userBookings', bookingId);

            const newBooking: UserBooking = {
                id: bookingId,
                userId,
                scheduleId,
                examId: schedule.examId,
                courseId: schedule.courseId,
                bookingDate: Timestamp.now(),
                status: 'confirmed',
            };

            transaction.set(bookingRef, newBooking);
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error booking exam slot: ", error);
        return { success: false, error: error.message };
    }
};