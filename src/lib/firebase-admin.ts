// Server-only module: import it only from API routes / server code.
import { cert, getApp, getApps, initializeApp, applicationDefault, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Server-side Firebase Admin initialisation that works on any host.
 *
 * Credential resolution order:
 * 1. FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (service account) — use on
 *    Vercel, Netlify, self-hosted Docker, or any non-Google host.
 * 2. Application Default Credentials — used automatically on Cloud Run and
 *    Firebase App Hosting (or locally via GOOGLE_APPLICATION_CREDENTIALS).
 */
function initAdminApp(): App {
  if (getApps().length) return getApp();

  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Hosts often store multi-line keys with literal "\n" sequences.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
  }

  return initializeApp({ credential: applicationDefault(), projectId });
}

export function getAdminAuth() {
  return getAuth(initAdminApp());
}

export function getAdminDb() {
  return getFirestore(initAdminApp());
}
