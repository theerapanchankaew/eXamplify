'use client';

import { doc, setDoc, updateDoc, deleteDoc, Timestamp, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';
import { ExamSchedule, ExamScheduleUpdate } from '@/types/scheduling';

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

    // Optional: Add logic to re-validate status based on capacity and bookedCount

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

    // Optional: Add logic here to handle associated bookings, e.g., notify users.

    await deleteDoc(scheduleRef);
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
