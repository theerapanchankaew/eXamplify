'use client';

// App data/auth entry point. The module keeps its historical name and API
// (useFirestore, useUser, useCollection, ...) but is now backed by the
// self-hosted server (/api/db, /api/auth) instead of Google Firebase.

import { getFirestore, type Firestore } from '@/lib/db/client';
import { getAuth, type Auth } from '@/lib/auth/client';

export function initializeFirebase(): { firestore: Firestore; auth: Auth } {
  return { firestore: getFirestore(), auth: getAuth() };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
