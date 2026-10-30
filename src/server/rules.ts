// Access rules for the document store. Server-only.
//
// Ported 1:1 from the former firestore.rules (kept for reference in
// legacy/firebase/firestore.rules). Semantics match Firestore:
// - a request is allowed if ANY matching rule allows it
// - `{path=**}` matches zero or more path segments
// - `read` = get + list, `write` = create + update + delete
// - `resource` is the stored document (null if missing),
//   `request.data` is the document as it would be after the write
// - accessing a field of a missing document denies (Firestore throws)
//
// Intentional differences from the old rules are marked "CHANGED".

import type { Queryable } from './db';

export type Operation = 'get' | 'list' | 'create' | 'update' | 'delete';
export interface AuthContext { uid: string; email?: string | null }

type Data = Record<string, unknown>;

export interface AuthorizeInput {
  op: Operation;
  path: string;
  auth: AuthContext | null;
  resource: Data | null;
  requestData: Data | null;
  client: Queryable;
}

interface RuleCtx {
  auth: AuthContext | null;
  params: Record<string, string>;
  /** Stored document data (Firestore `resource.data`), null if missing. */
  resource: Data | null;
  /** Data after the write (Firestore `request.resource.data`), null for reads/deletes. */
  request: Data | null;
  get(path: string): Promise<Data | null>;
  exists(path: string): Promise<boolean>;
  isSignedIn(): boolean;
  isOwner(userId: unknown): boolean;
  isAdmin(): Promise<boolean>;
  isInstructor(): Promise<boolean>;
  isCourseInstructor(courseId: unknown): Promise<boolean>;
  isEnrolled(courseId: string): Promise<boolean>;
  isEnrolledInExam(examId: string): Promise<boolean>;
  canAccessExam(courseId: string, examId: string): Promise<boolean>;
  /** Keys changed by an update (Firestore `diff(...).affectedKeys()`). */
  affectedKeys(): string[];
}

type RuleFn = (c: RuleCtx) => boolean | Promise<boolean>;
type Ops = Partial<Record<Operation | 'read' | 'write', RuleFn>>;

const allow = (): boolean => true;
const deny = (): boolean => false;

/** Field access that denies when the document is missing (Firestore errors). */
const field = (d: Data | null, k: string): unknown => (d ? d[k] : MISSING);
const MISSING = Symbol('missing');

// ---------------------------------------------------------------------------
// Rule table (same order as the original firestore.rules)
// ---------------------------------------------------------------------------

const RULES: [string, Ops][] = [
  // ---- Administrative ----------------------------------------------------
  ['roles_admin/{userId}', { read: (c) => c.isAdmin(), write: (c) => c.isAdmin() }],
  ['audit_logs/{auditLogId}', { get: (c) => c.isAdmin(), list: (c) => c.isAdmin(), write: deny }],

  // ---- Collection-group rules ------------------------------------------------
  ['{path=**}/exams/{examId}', { read: allow }],
  ['{path=**}/examResults/{resultId}', {
    read: async (c) => c.isSignedIn() && (c.isOwner(field(c.resource, 'userId')) || await c.isAdmin()),
  }],

  // ---- Users ---------------------------------------------------------------
  ['users/{userId}', {
    get: async (c) => c.isOwner(c.params.userId) || await c.isAdmin(),
    list: (c) => c.isSignedIn(),
    // CHANGED: a user may only create their own profile with role "Student"
    // (previously any role, including "Admin", could be self-assigned).
    // Profiles are normally created by the server during sign-up.
    create: async (c) =>
      (c.isOwner(c.params.userId) && c.request?.id === c.params.userId &&
        (c.request?.role === undefined || c.request?.role === 'Student')) ||
      await c.isAdmin(),
    // CHANGED: the old isChangingOnlyRole() compared the size of the whole
    // merged document, so admins could never change roles; this checks the
    // keys actually changed, which was the intent.
    update: async (c) =>
      (await c.isAdmin() && c.affectedKeys().every((k) => k === 'role')) ||
      (c.isOwner(c.params.userId) && (c.request?.role === c.resource?.role)),
    delete: (c) => c.isAdmin(),
  }],
  ['users/{userId}/certificates/{certificateId}', {
    read: (c) => c.isOwner(c.params.userId),
    create: (c) => c.isOwner(c.params.userId),
    update: deny, delete: deny,
  }],
  ['users/{userId}/tokenTransactions/{transactionId}', {
    read: async (c) => c.isOwner(c.params.userId) || await c.isAdmin(),
    create: async (c) => c.isOwner(c.params.userId) || await c.isAdmin(),
    update: deny, delete: deny,
  }],

  // ---- Courses & content -----------------------------------------------------
  ['courses/{courseId}', {
    read: allow,
    create: async (c) => await c.isAdmin() || await c.isInstructor(),
    delete: async (c) => await c.isAdmin() || await c.isInstructor(),
    update: async (c) => await c.isAdmin() || await c.isInstructor() ||
      (c.isSignedIn() && c.affectedKeys().every((k) => k === 'enrollment_count')),
  }],
  ['courses/{courseId}/exams/{examId}', {
    get: allow,
    list: (c) => c.canAccessExam(c.params.courseId, c.params.examId),
    write: async (c) => await c.isAdmin() || await c.isInstructor(),
  }],
  ['courses/{courseId}/exams/{examId}/questions/{questionId}', {
    read: (c) => c.canAccessExam(c.params.courseId, c.params.examId),
    write: async (c) => await c.isAdmin() || await c.isInstructor(),
  }],
  ['exams/{examId}', { read: allow, write: (c) => c.isAdmin() }],
  ['exams/{examId}/questions/{questionId}', {
    read: async (c) => await c.isEnrolledInExam(c.params.examId) || await c.isAdmin() || await c.isInstructor(),
    write: (c) => c.isAdmin(),
  }],
  ['courses/{courseId}/modules/{moduleId}', {
    read: (c) => c.isSignedIn(),
    create: async (c) => (await c.isCourseInstructor(c.params.courseId) || await c.isAdmin()) &&
      c.request?.courseId === c.params.courseId,
    update: async (c) => await c.isCourseInstructor(c.params.courseId) || await c.isAdmin(),
    delete: async (c) => await c.isCourseInstructor(c.params.courseId) || await c.isAdmin(),
  }],
  ['courses/{courseId}/modules/{moduleId}/chapters/{chapterId}', {
    read: async (c) => await c.isEnrolled(c.params.courseId) || await c.isCourseInstructor(c.params.courseId) || await c.isAdmin(),
    create: async (c) => (await c.isCourseInstructor(c.params.courseId) || await c.isAdmin()) &&
      c.request?.moduleId === c.params.moduleId,
    update: async (c) => await c.isCourseInstructor(c.params.courseId) || await c.isAdmin(),
    delete: async (c) => await c.isCourseInstructor(c.params.courseId) || await c.isAdmin(),
  }],
  ['courses/{courseId}/modules/{moduleId}/chapters/{chapterId}/lessons/{lessonId}', {
    read: async (c) => await c.isEnrolled(c.params.courseId) || await c.isCourseInstructor(c.params.courseId) || await c.isAdmin(),
    create: async (c) => (await c.isCourseInstructor(c.params.courseId) || await c.isAdmin()) &&
      c.request?.chapterId === c.params.chapterId,
    update: async (c) => await c.isCourseInstructor(c.params.courseId) || await c.isAdmin(),
    delete: async (c) => await c.isCourseInstructor(c.params.courseId) || await c.isAdmin(),
  }],

  // ---- Community ---------------------------------------------------------------
  ['posts/{postId}', {
    read: allow,
    create: (c) => c.isSignedIn() && c.request?.authorId === c.auth?.uid,
    update: async (c) => c.isSignedIn() && (
      c.affectedKeys().every((k) => k === 'likes' || k === 'commentsCount') ||
      field(c.resource, 'authorId') === c.auth?.uid ||
      await c.isAdmin()),
    delete: async (c) => field(c.resource, 'authorId') === c.auth?.uid || await c.isAdmin(),
  }],
  ['posts/{postId}/comments/{commentId}', {
    read: allow,
    create: (c) => c.isSignedIn() && c.request?.authorId === c.auth?.uid,
    update: async (c) => field(c.resource, 'authorId') === c.auth?.uid || await c.isAdmin(),
    delete: async (c) => field(c.resource, 'authorId') === c.auth?.uid || await c.isAdmin(),
  }],

  // ---- Enrollments & results ---------------------------------------------------
  ['enrollments/{enrollmentId}', {
    get: async (c) => c.isSignedIn() && (
      c.isOwner(field(c.resource, 'userId')) ||
      (c.resource !== null && 'courseId' in c.resource && await c.isCourseInstructor(c.resource.courseId)) ||
      await c.isAdmin()),
    list: (c) => c.isSignedIn(),
    create: (c) => c.isSignedIn() && c.request?.userId === c.auth?.uid,
    update: async (c) =>
      c.isOwner(field(c.resource, 'userId')) ||
      (c.resource !== null && 'courseId' in c.resource && await c.isCourseInstructor(c.resource.courseId)) ||
      await c.isAdmin(),
    delete: async (c) =>
      c.isOwner(field(c.resource, 'userId')) ||
      (c.resource !== null && 'courseId' in c.resource && await c.isCourseInstructor(c.resource.courseId)) ||
      await c.isAdmin(),
  }],
  ['examResults/{resultId}', {
    read: async (c) => c.isSignedIn() && (c.isOwner(field(c.resource, 'userId')) || await c.isAdmin()),
    create: (c) => c.isSignedIn() && c.isOwner(c.request?.userId),
    update: deny, delete: deny,
  }],

  // ---- Marketplace -----------------------------------------------------------
  ['cart/{userId}/items/{itemId}', {
    read: (c) => c.isOwner(c.params.userId),
    create: (c) => c.isOwner(c.params.userId) && c.request?.userId === c.params.userId,
    update: (c) => c.isOwner(c.params.userId),
    delete: (c) => c.isOwner(c.params.userId),
  }],
  ['tokenTransactions/{transactionId}', {
    get: async (c) => c.isSignedIn() && (field(c.resource, 'userId') === c.auth?.uid || await c.isAdmin()),
    list: (c) => c.isAdmin(),
    create: (c) => c.isSignedIn() && c.request?.userId === c.auth?.uid,
    update: deny, delete: deny,
  }],
  ['orders/{orderId}', {
    get: async (c) => c.isSignedIn() && (c.isOwner(field(c.resource, 'userId')) || await c.isAdmin()),
    list: (c) => c.isSignedIn(),
    create: (c) => c.isSignedIn() && c.request?.userId === c.auth?.uid,
    update: (c) => c.isAdmin(),
    delete: (c) => c.isAdmin(),
  }],
  ['vouchers/{voucherId}', { read: (c) => c.isSignedIn(), write: (c) => c.isAdmin() }],

  // ---- Exam scheduling ---------------------------------------------------------
  ['examSchedules/{scheduleId}', {
    read: (c) => c.isSignedIn(),
    create: async (c) => await c.isAdmin() || await c.isInstructor(),
    update: async (c) => await c.isAdmin() || await c.isInstructor() || c.isSignedIn(),
    delete: async (c) => await c.isAdmin() || await c.isInstructor(),
  }],
  ['bookings/{bookingId}', {
    get: async (c) => c.isSignedIn() && (c.isOwner(field(c.resource, 'userId')) || await c.isAdmin()),
    list: (c) => c.isSignedIn(),
    create: (c) => c.isSignedIn() && c.request?.userId === c.auth?.uid,
    update: async (c) => c.isOwner(field(c.resource, 'userId')) || await c.isAdmin(),
    delete: (c) => c.isAdmin(),
  }],

  // ---- Master data -------------------------------------------------------------
  ['roadmaps/{roadmapId}', { read: allow, write: (c) => c.isAdmin() }],
  ['schedules/{scheduleId}', { read: allow, write: (c) => c.isAdmin() }],
  ['competencies/{competencyId}', { read: allow, write: (c) => c.isAdmin() }],
  ['course_competencies/{courseCompetencyId}', { read: allow, write: (c) => c.isAdmin() }],
  ['masterCourses/{masterCourseId}', {
    read: (c) => c.isSignedIn(),
    write: async (c) => await c.isAdmin() || await c.isInstructor(),
  }],
  ['question_competencies/{questionCompetencyId}', { read: allow, write: (c) => c.isAdmin() }],
];

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

type Seg = { lit: string } | { param: string } | { rest: string };

const COMPILED = RULES.map(([pattern, ops]) => ({
  segs: pattern.split('/').map((s): Seg => {
    const m = s.match(/^\{(\w+)(=\*\*)?\}$/);
    if (!m) return { lit: s };
    return m[2] ? { rest: m[1] } : { param: m[1] };
  }),
  ops,
}));

function matchPattern(segs: Seg[], parts: string[], i = 0, j = 0, params: Record<string, string> = {}): Record<string, string> | null {
  if (i === segs.length) return j === parts.length ? params : null;
  const s = segs[i];
  if ('rest' in s) {
    for (let k = j; k <= parts.length; k++) {
      const r = matchPattern(segs, parts, i + 1, k, { ...params, [s.rest]: parts.slice(j, k).join('/') });
      if (r) return r;
    }
    return null;
  }
  if (j >= parts.length) return null;
  if ('lit' in s) return s.lit === parts[j] ? matchPattern(segs, parts, i + 1, j + 1, params) : null;
  return matchPattern(segs, parts, i + 1, j + 1, { ...params, [s.param]: parts[j] });
}

function ruleFor(ops: Ops, op: Operation): RuleFn | undefined {
  if (ops[op]) return ops[op];
  if (op === 'get' || op === 'list') return ops.read;
  return ops.write;
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

function buildCtx(input: AuthorizeInput, params: Record<string, string>, cache: Map<string, Promise<Data | null>>): RuleCtx {
  const { auth, client } = input;
  const get = (path: string) => {
    if (!cache.has(path)) {
      cache.set(path, client.query<{ data: Data }>('SELECT data FROM documents WHERE path = $1', [path])
        .then((r) => r.rows[0]?.data ?? null));
    }
    return cache.get(path)!;
  };
  const role = async () => (auth ? (await get(`users/${auth.uid}`))?.role : undefined);
  const ctx: RuleCtx = {
    auth,
    params,
    resource: input.resource,
    request: input.requestData,
    get,
    exists: async (p) => (await get(p)) !== null,
    isSignedIn: () => auth !== null,
    isOwner: (userId) => auth !== null && typeof userId === 'string' && auth.uid === userId,
    isAdmin: async () => auth !== null && (await role()) === 'Admin',
    isInstructor: async () => auth !== null && (await role()) === 'Instructor',
    isCourseInstructor: async (courseId) => {
      if (!auth || typeof courseId !== 'string' || !courseId || courseId.includes('/')) return false;
      return (await get(`courses/${courseId}`))?.instructorId === auth.uid;
    },
    isEnrolled: (courseId) => (auth ? ctx.exists(`enrollments/${auth.uid}_${courseId}`) : Promise.resolve(false)),
    isEnrolledInExam: (examId) => (auth ? ctx.exists(`enrollments/${auth.uid}_exam_${examId}`) : Promise.resolve(false)),
    canAccessExam: async (courseId, examId) =>
      await ctx.isEnrolledInExam(examId) || await ctx.isEnrolled(courseId) ||
      await ctx.isCourseInstructor(courseId) || await ctx.isAdmin(),
    affectedKeys: () => {
      const a = input.requestData ?? {}, b = input.resource ?? {};
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      return [...keys].filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
    },
  };
  return ctx;
}

/** Returns true if any matching rule allows the operation. Errors deny. */
export async function authorize(input: AuthorizeInput): Promise<boolean> {
  const parts = input.path.split('/');
  const cache = new Map<string, Promise<Data | null>>();
  for (const rule of COMPILED) {
    const params = matchPattern(rule.segs, parts);
    if (!params) continue;
    const fn = ruleFor(rule.ops, input.op);
    if (!fn) continue;
    try {
      if (await fn(buildCtx(input, params, cache))) return true;
    } catch (e) {
      console.warn(`[rules] error evaluating ${input.op} ${input.path}:`, e);
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Field redaction
// ---------------------------------------------------------------------------

const QUESTION_PATHS = [
  'courses/{courseId}/exams/{examId}/questions/{questionId}',
  'exams/{examId}/questions/{questionId}',
].map((p) => p.split('/').map((s): Seg => {
  const m = s.match(/^\{(\w+)\}$/);
  return m ? { param: m[1] } : { lit: s };
}));

/** Fields only staff may see on exam questions (grading happens on the server). */
const ANSWER_FIELDS = ['correctAnswer', 'answer', 'explanation'];

/**
 * NEW (not in the old firestore.rules): strips answer keys from exam
 * questions for anyone who is not an Admin, Instructor or the course's
 * instructor, so candidates cannot read answers from network traffic.
 * Applied to every read made on behalf of a user.
 */
export async function redactForReader(
  path: string, data: Data | null, auth: AuthContext | null, client: Queryable,
): Promise<Data | null> {
  if (!data) return data;
  const parts = path.split('/');
  const params = QUESTION_PATHS.map((segs) => matchPattern(segs, parts)).find(Boolean);
  if (!params) return data;
  const ctx = buildCtx({ op: 'get', path, auth, resource: data, requestData: null, client }, params, new Map());
  const staff = await ctx.isAdmin() || await ctx.isInstructor() ||
    (params.courseId !== undefined && await ctx.isCourseInstructor(params.courseId));
  if (staff) return data;
  const copy = { ...data };
  for (const f of ANSWER_FIELDS) delete copy[f];
  return copy;
}
