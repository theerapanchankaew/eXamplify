# Legacy Firebase files (reference only)

eXamplify now runs fully self-hosted (PostgreSQL + built-in auth). These files
are kept only for reference and are **not** used by the app or the build:

| File | Replaced by |
|---|---|
| `firestore.rules` | `src/server/rules.ts` (same rules, enforced on the server) |
| `firestore.indexes.json` | not needed (PostgreSQL indexes in `src/server/db.ts`) |
| `functions/` (`gradeExam`) | `src/app/api/grade-exam/route.ts` |
| `apphosting.yaml`, `firebase.json`, `.firebaserc` | `docker-compose.yml` |
| `scripts/*`, `seed_*.ts`, `IMPORT_GUIDE.md` | admin UI (`/admin/import`, `/admin/courses/import`) and `scripts/migrate-from-firebase.ts` |

Delete this folder once the migration from Firebase is complete.
