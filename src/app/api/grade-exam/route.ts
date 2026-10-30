import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

// firebase-admin needs the Node.js runtime (not Edge).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase();

/**
 * Server-side exam grading (portable replacement for the `gradeExam`
 * Cloud Function). Correct answers never leave the server.
 */
export async function POST(req: Request) {
  // 1. Authentication
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  let userId: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(authHeader.slice('Bearer '.length));
    userId = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  let body: GradeExamRequest;
  try {
    body = (await req.json()) as GradeExamRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { examId, courseId, answers, startTime } = body ?? ({} as GradeExamRequest);
  if (
    typeof examId !== 'string' || !examId ||
    typeof courseId !== 'string' || !courseId ||
    typeof answers !== 'object' || answers === null
  ) {
    return NextResponse.json({ error: 'examId, courseId and answers are required.' }, { status: 400 });
  }

  const db = getAdminDb();

  try {
    // 2. Exam details
    const examSnap = await db.doc(`courses/${courseId}/exams/${examId}`).get();
    if (!examSnap.exists) {
      return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });
    }
    const examData = examSnap.data()!;
    const passingScore = examData.passingScore || 50;

    // 3. Questions with answers (server-side only)
    const questionsSnap = await db.collection(`courses/${courseId}/exams/${examId}/questions`).get();
    if (questionsSnap.empty) {
      return NextResponse.json({ error: 'No questions found for this exam.' }, { status: 404 });
    }

    // 4. Grade
    let score = 0;
    let totalPoints = 0;
    questionsSnap.docs.forEach((questionDoc) => {
      const question = questionDoc.data();
      const userAnswer = answers[questionDoc.id];
      const correctAnswer = question.correctAnswer ?? question.answer;
      const points = question.points || 1;

      totalPoints += points;
      if (userAnswer && correctAnswer != null && normalize(userAnswer) === normalize(correctAnswer)) {
        score += points;
      }
    });

    const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;
    const passed = percentage >= passingScore;

    // 5. Save result
    const resultRef = await db.collection('examResults').add({
      userId,
      examId,
      courseId,
      score,
      totalPoints,
      percentage,
      passed,
      answers,
      submittedAt: FieldValue.serverTimestamp(),
      timeSpent: typeof startTime === 'number' ? Math.floor((Date.now() - startTime) / 1000) : null,
    });

    // 6. Issue certificate if passed (once per course)
    let certificateIssued = false;
    if (passed) {
      try {
        const existingCerts = await db
          .collection(`users/${userId}/certificates`)
          .where('courseId', '==', courseId)
          .get();
        if (existingCerts.empty) {
          const courseSnap = await db.doc(`courses/${courseId}`).get();
          const courseName = courseSnap.exists ? courseSnap.data()!.name : 'Course';
          const certId = 'CERT-' + Math.random().toString(36).slice(2, 11).toUpperCase();
          await db.collection(`users/${userId}/certificates`).add({
            userId,
            courseId,
            courseName,
            instructorName: 'eXamplify Instructor',
            issueDate: FieldValue.serverTimestamp(),
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

    // 7. Response
    const response: GradeExamResponse = {
      score,
      totalPoints,
      percentage,
      passed,
      certificateIssued,
      resultId: resultRef.id,
    };
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Grading error:', error);
    return NextResponse.json({ error: 'Failed to grade exam.' }, { status: 500 });
  }
}
