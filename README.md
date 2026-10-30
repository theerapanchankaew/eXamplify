# eXamplify

Learning & examination platform built with **Next.js 15** + **Firebase (Auth, Firestore)**.

The app is cloud-portable: the same code deploys to Vercel, Netlify, Cloud Run,
Firebase App Hosting or self-hosted Docker by changing environment variables only.

| Part | Runs on |
|---|---|
| UI + API routes (incl. `/api/grade-exam`) | Any Node.js host |
| Auth + Firestore | Firebase (Spark free plan is enough) |

## Local development

```bash
cp .env.example .env.local   # fill in your Firebase web config + service account
npm install
npm run dev                  # http://localhost:9004
```

Use the Firebase Emulator Suite instead of a live project:
set `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true` and run `firebase emulators:start`.

## Environment variables

See [`.env.example`](.env.example) for the full list.

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_*` | Build time | Inlined into the browser bundle — must be set **before** `next build` |
| `NEXT_PUBLIC_GRADE_EXAM_URL` | Build time | Optional. Defaults to the built-in `/api/grade-exam` |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Runtime (secret) | Service account for `firebase-admin`. Not needed on Cloud Run / Firebase App Hosting |
| `STRICT_BUILD` | Build time | `true` = fail build on TypeScript/ESLint errors |

## Deploy

**Every new domain** must be added in Firebase Console → Authentication →
Settings → **Authorized domains**, otherwise sign-in fails.

Firestore rules and indexes deploy separately from the app:

```bash
firebase deploy --only firestore
```

### Vercel / Netlify
1. Import the GitHub repo (framework is detected automatically).
2. Add all variables from `.env.example` in the project settings.
3. Deploy, then add the `*.vercel.app` / `*.netlify.app` domain to Authorized domains.

> Vercel Hobby is limited to personal, non-commercial use.

### Cloud Run
```bash
IMAGE=asia-southeast1-docker.pkg.dev/PROJECT/REPO/examplify
docker build --build-arg NEXT_PUBLIC_FIREBASE_API_KEY=... (all NEXT_PUBLIC_* args, see Dockerfile) -t $IMAGE .
docker push $IMAGE
gcloud run deploy examplify --image $IMAGE --region asia-southeast1 --allow-unauthenticated
```
Grant the Cloud Run service account the **Firebase Admin SDK Administrator Service Agent**
(or `Cloud Datastore User` + `Firebase Authentication Admin`) role — no key needed.

### Firebase App Hosting
Values are in [`apphosting.yaml`](apphosting.yaml). Connect the repo in
Firebase Console → App Hosting (requires the Blaze plan).

### Self-hosted Docker
```bash
docker build \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY=... \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=... \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID=... \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID=... \
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=... \
  -t examplify .
docker run -p 3000:3000 \
  -e FIREBASE_PROJECT_ID=... -e FIREBASE_CLIENT_EMAIL=... -e FIREBASE_PRIVATE_KEY="..." \
  examplify
```

## Legacy Cloud Function

`functions/` still contains the original `gradeExam` Cloud Function (requires the
Blaze plan). The app no longer calls it unless `NEXT_PUBLIC_GRADE_EXAM_URL` points to it.

## Known issues

- Pre-existing TypeScript errors — run `npm run typecheck`. Builds skip these
  checks until `STRICT_BUILD=true`.
