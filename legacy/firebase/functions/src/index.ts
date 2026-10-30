import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import cors from 'cors'; // Corrected import

admin.initializeApp();
const db = admin.firestore();

// Initialize CORS middleware with default options (allows all origins)
const corsHandler = cors({ origin: true });

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
 * Server-side exam grading function (HTTP Request)
 * Prevents answer exposure to client
 */
export const gradeExam = functions.https.onRequest((req, res) => {
    // Use the CORS middleware
    corsHandler(req, res, async () => {
        // 1. Authentication check
        if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
            res.status(403).send('Unauthorized');
            return;
        }

        const idToken = req.headers.authorization.split('Bearer ')[1];
        let decodedIdToken;
        try {
            decodedIdToken = await admin.auth().verifyIdToken(idToken);
        } catch (error) {
            res.status(403).send('Unauthorized');
            return;
        }

        const userId = decodedIdToken.uid;
        const { examId, courseId, answers, startTime } = req.body as GradeExamRequest;

        try {
            // 2. Fetch exam details
            const examRef = db.doc(`courses/${courseId}/exams/${examId}`);
            const examSnap = await examRef.get();

            if (!examSnap.exists) {
                res.status(404).json({ error: 'Exam not found.' });
                return;
            }

            const examData = examSnap.data()!;
            const passingScore = examData.passingScore || 50;

            // 3. Fetch questions with answers (server-side only)
            const questionsSnap = await db
                .collection(`courses/${courseId}/exams/${examId}/questions`)
                .get();

            if (questionsSnap.empty) {
                res.status(404).json({ error: 'No questions found for this exam.' });
                return;
            }

            // 4. Grade answers
            let score = 0;
            let totalPoints = 0;

            questionsSnap.docs.forEach((questionDoc) => {
                const question = questionDoc.data();
                const questionId = questionDoc.id;
                const userAnswer = answers[questionId];
                const correctAnswer = question.correctAnswer || question.answer;
                const points = question.points || 1;

                totalPoints += points;

                if (userAnswer && userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()) {
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
                answers,
                submittedAt: admin.firestore.FieldValue.serverTimestamp(),
                timeSpent: Math.floor((Date.now() - startTime) / 1000),
            });

            // 6. Issue certificate if passed
            let certificateIssued = false;
            if (passed) {
              try {
                  const existingCerts = await db.collection(`users/${userId}/certificates`).where('courseId', '==', courseId).get();
                  if (existingCerts.empty) {
                      const courseSnap = await db.doc(`courses/${courseId}`).get();
                      const courseName = courseSnap.exists ? courseSnap.data()!.name : 'Course';
                      const certId = 'CERT-' + Math.random().toString(36).substr(2, 9).toUpperCase();
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
                  }
              } catch (certError) {
                  console.error('Certificate issuance error:', certError);
              }
            }

            // 7. Return result
            const response: GradeExamResponse = {
                score,
                totalPoints,
                percentage,
                passed,
                certificateIssued,
                resultId: resultRef.id,
            };

            res.status(200).json(response);

        } catch (error: any) {
            console.error('Grading error:', error);
            res.status(500).json({ error: error.message || 'Failed to grade exam.' });
        }
    });
});
