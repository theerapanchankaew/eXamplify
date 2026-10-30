# eXamplify

Learning & examination platform — **Next.js 15 + PostgreSQL**, fully self-hosted
(no Google Firebase dependency). Runs on one VM with Docker Compose.

**Deploying? → [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** (step-by-step, Thai)

## Architecture

```
Browser ──HTTPS──> Caddy (TLS, headers) ──> Next.js app ──> PostgreSQL
                                              │
                         /api/db      document API (Firestore-compatible)
                         /api/auth/*  sign-up / sign-in / sessions
                         /api/admin/users, /api/grade-exam, /api/health
```

| Layer | Where | Notes |
|---|---|---|
| Data model | `documents` table (jsonb) | Same paths as before: `courses/{id}/modules/{id}/...` |
| Browser data API | `src/lib/db/client.ts` | Same functions as the Firestore SDK (`collection`, `query`, `where`, `getDocs`, `onSnapshot`, `runTransaction`...). Pages import it via `@/firebase` hooks |
| Access control | `src/server/rules.ts` | Port of the former `firestore.rules`; every read/write is checked on the server |
| Store | `src/server/store.ts` | Queries, atomic commits, write transforms (`serverTimestamp`, `increment`...) |
| Auth | `src/server/auth.ts`, `src/lib/auth/client.ts` | Email + password (scrypt), httpOnly session cookie; imported Firebase password hashes keep working |
| Schema | `src/server/db.ts` | Migrations run automatically at startup |
| Realtime | `onSnapshot` | Polls every 5 s while the tab is visible + refresh after local writes |

`src/firebase/` keeps its historical name so existing pages did not need
rewriting; it no longer talks to Google.

## Local development

Requires Node 20+ and PostgreSQL 14+.

```bash
cp .env.example .env.local
# set DATABASE_URL=postgres://user:pass@localhost:5432/examplify
# set APP_URL=http://localhost:9004 and BOOTSTRAP_ADMIN_EMAILS=you@example.org
npm install
npm run dev               # http://localhost:9004 — sign up with the bootstrap e-mail to become Admin
```

| Command | Purpose |
|---|---|
| `npm run typecheck` | TypeScript check (also enforced by `next build`) |
| `TEST_DATABASE_URL=... npm test` | Store / rules / auth integration tests (wipes that database) |
| `npm run create-admin -- email` | Create or promote an Admin (scripts need `DATABASE_URL` exported) |
| `npm run reset-password -- email` | Set a new password, sign the user out everywhere |
| `npm run migrate:firebase -- --credentials sa.json` | One-time import from the old Firebase project |

## Security notes

- Roles are assigned by the server only (self sign-up is always `Student`).
- Exam answers (`correctAnswer`, `answer`, `explanation`) are removed from
  question documents for non-staff readers; grading happens in `/api/grade-exam`.
- State-changing requests require same-origin JSON (CSRF protection).
- Known inherited rules worth tightening are listed in docs/DEPLOYMENT.md §9.

## Repository layout

```
src/server/        server-only: db, store, rules, auth
src/lib/db/        browser data layer + shared wire format
src/lib/auth/      browser auth client
src/app/api/       API routes
scripts/           create-admin, reset-password, migrate-from-firebase
deploy/            Caddyfile, backup.sh, certs/
tests/             integration tests
legacy/firebase/   old Firebase config, reference only
```
