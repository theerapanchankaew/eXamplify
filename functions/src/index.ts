import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

interface GradeExamRequest {
    examId: string;
    courseId: string;
    answers: Record<string, string>; // questionId -> userAnswer
    startTime: number;
}

interface GradeExamResponse {
    score: number;
    totalPoints: number;
    percentage: number;
    passed: boolean;
    certificateIssued: boolean;
    resultId: string;
}

/**
 * Server-side exam grading function
 * Prevents answer exposure to client
 */
export const gradeExam = functions.https.onCall(
    async (data: GradeExamRequest, context): Promise<GradeExamResponse> => {
        // 1. Authentication check
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'User must be authenticated to submit exam.'
            );
        }

        const userId = context.auth.uid;
        const { examId, courseId, answers, startTime } = data;

        try {
            // 2. Fetch exam details
            const examRef = db.doc(`courses/${courseId}/exams/${examId}`);
            const examSnap = await examRef.get();

            if (!examSnap.exists) {
                throw new functions.https.HttpsError('not-found', 'Exam not found.');
            }

            const examData = examSnap.data()!;
            const passingScore = examData.passingScore || 50;

            // 3. Fetch questions with answers (server-side only)
            const questionsSnap = await db
                .collection(`courses/${courseId}/exams/${examId}/questions`)
                .get();

            if (questionsSnap.empty) {
                throw new functions.https.HttpsError('not-found', 'No questions found for this exam.');
            }

            // 4. Grade answers
            let score = 0;
            let totalPoints = 0;

            questionsSnap.docs.forEach((questionDoc) => {
                const question = questionDoc.data();
                const questionId = questionDoc.id;
                const userAnswer = answers[questionId];
                const correctAnswer = question.answer;
                const points = question.points || 1;

                totalPoints += points;

                // Case-insensitive comparison
                if (
                    userAnswer &&
                    userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
                ) {
                    score += points;
                }
            });

            const percentage = (score / totalPoints) * 100;
            const passed = percentage >= passingScore;

            // 5. Save exam result
            const resultRef = await db.collection('examResults').add({
                userId,
                examId,
                courseId,
                score,
                totalPoints,
                percentage,
                passed,
                answers, // Store for review (instructor only)
                submittedAt: admin.firestore.FieldValue.serverTimestamp(),
                timeSpent: Math.floor((Date.now() - startTime) / 1000),
            });

            // 6. Issue certificate if passed
            let certificateIssued = false;
            if (passed) {
                try {
                    // Check if certificate already exists
                    const existingCerts = await db
                        .collection(`users/${userId}/certificates`)
                        .where('courseId', '==', courseId)
                        .get();

                    if (existingCerts.empty) {
                        // Fetch course name
                        const courseSnap = await db.doc(`courses/${courseId}`).get();
                        const courseName = courseSnap.exists ? courseSnap.data()!.name : 'Course';

                        // Generate certificate ID
                        const certId = 'CERT-' + Math.random().toString(36).substr(2, 9).toUpperCase();

                        // Create certificate
                        await db.collection(`users/${userId}/certificates`).add({
                            userId,
                            courseId,
                            courseName,
                            instructorName: 'eXamplify Instructor',
                            issueDate: admin.firestore.FieldValue.serverTimestamp(),
                            certificateId: certId,
                            metadata: {
                                version: '1.0',
                                issuer: 'eXamplify Platform',
                                examScore: percentage,
                            },
                        });

                        certificateIssued = true;
                        console.log(`Certificate issued for user ${userId}, course ${courseId}`);
                    } else {
                        console.log(`Certificate already exists for user ${userId}, course ${courseId}`);
                    }
                } catch (certError) {
                    console.error('Certificate issuance error:', certError);
                    // Don't fail the entire grading if certificate fails
                }
            }

            // 7. Return result (NO ANSWERS!)
            return {
                score,
                totalPoints,
                percentage,
                passed,
                certificateIssued,
                resultId: resultRef.id,
            };
        } catch (error: any) {
            console.error('Grading error:', error);
            throw new functions.https.HttpsError('internal', error.message || 'Failed to grade exam.');
        }
    }
);
