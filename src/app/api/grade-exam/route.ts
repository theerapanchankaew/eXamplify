import { NextResponse } from 'next/server';
import { assertSameOrigin, currentAuth } from '@/server/auth';
import { commit, getDocument, runQuery, SYSTEM } from '@/server/store';
import { autoId } from '@/lib/db/wire';

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
  // 1. Authentication (session cookie)
  try {
    assertSameOrigin(req);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const auth = await currentAuth();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = auth.uid;

  let body: GradeExamRequest;
  try {
    body = (await req.json()) as GradeExamRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { examId, courseId, answers, startTime } = body ?? ({} as GradeExamRequest);
  const validId = (v: unknown) => typeof v === 'string' && /^[^/]{1,300}$/.test(v);
  if (
    !validId(examId) ||
    !validId(courseId) ||
    typeof answers !== 'object' || answers === null
  ) {
    return NextResponse.json({ error: 'examId, courseId and answers are required.' }, { status: 400 });
  }

  try {
    // 2. Exam details (trusted server read)
    const exam = await getDocument(`courses/${courseId}/exams/${examId}`);
    if (!exam?.data) {
      return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });
    }
    const passingScore = Number(exam.data.passingScore) || 50;

    // 3. Questions with answers (server-side only)
    const questions = await runQuery(SYSTEM, {
      path: `courses/${courseId}/exams/${examId}/questions`, filters: [], orderBy: [],
    });
    if (questions.length === 0) {
      return NextResponse.json({ error: 'No questions found for this exam.' }, { status: 404 });
    }

    // 4. Grade
    let score = 0;
    let totalPoints = 0;
    questions.forEach((questionDoc) => {
      const question = questionDoc.data ?? {};
      const userAnswer = answers[questionDoc.id];
      const correctAnswer = question.correctAnswer ?? question.answer;
      const points = Number(question.points) || 1;

      totalPoints += points;
      if (userAnswer && correctAnswer != null && normalize(userAnswer) === normalize(correctAnswer)) {
        score += points;
      }
    });

    const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;
    const passed = percentage >= passingScore;

    // 5. Save result
    const resultId = autoId();
    const writes: Parameters<typeof commit>[1] = [{ type: 'set', path: `examResults/${resultId}`, data: {
      userId,
      examId,
      courseId,
      score,
      totalPoints,
      percentage,
      passed,
      answers,
      submittedAt: { __op: 'serverTimestamp' },
      timeSpent: typeof startTime === 'number' ? Math.floor((Date.now() - startTime) / 1000) : null,
    } }];

    // 6. Issue certificate if passed (once per course)
    let certificateIssued = false;
    if (passed) {
      try {
        const existingCerts = await runQuery(SYSTEM, {
          path: `users/${userId}/certificates`,
          filters: [{ field: 'courseId', op: '==', value: courseId }], orderBy: [],
        });
        if (existingCerts.length === 0) {
          const course = await getDocument(`courses/${courseId}`);
          const courseName = (course?.data?.name as string) || 'Course';
          const certId = 'CERT-' + autoId().slice(0, 9).toUpperCase();
          writes.push({ type: 'set', path: `users/${userId}/certificates/${autoId()}`, data: {
            userId,
            courseId,
            courseName,
            instructorName: 'eXamplify Instructor',
            issueDate: { __op: 'serverTimestamp' },
            certificateId: certId,
            metadata: {
              version: '1.0',
              issuer: 'eXamplify Platform',
              examScore: percentage,
            },
          } });
          certificateIssued = true;
        }
      } catch (certError) {
        console.error('Certificate issuance error:', certError);
      }
    }
    // Result and certificate are written atomically.
    await commit(SYSTEM, writes);

    // 7. Response
    const response: GradeExamResponse = {
      score,
      totalPoints,
      percentage,
      passed,
      certificateIssued,
      resultId,
    };
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Grading error:', error);
    return NextResponse.json({ error: 'Failed to grade exam.' }, { status: 500 });
  }
}
