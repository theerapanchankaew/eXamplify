'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { connectFirestoreEmulator } from 'firebase/firestore';

let emulatorsConnected = false;

// IMPORTANT: Always use firebaseConfig for initialization
export function initializeFirebase() {
  if (!getApps().length) {
    // Always use firebaseConfig for consistent initialization
    // This prevents "Firebase: Need to provide options" errors in production
    if (!firebaseConfig || !firebaseConfig.apiKey) {
      throw new Error(
        'Firebase configuration is missing. Set the NEXT_PUBLIC_FIREBASE_* environment variables (see .env.example) before building.'
      );
    }

    const firebaseApp = initializeApp(firebaseConfig);
    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);
  const functions = getFunctions(firebaseApp);

  // Connect to the local Firebase Emulator Suite when explicitly enabled.
  // Set NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true (and optionally
  // NEXT_PUBLIC_FIREBASE_EMULATOR_HOST) for local development.
  if (
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' &&
    typeof window !== 'undefined' &&
    !emulatorsConnected
  ) {
    const host = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || 'localhost';
    try {
      connectFunctionsEmulator(functions, host, 5001);
      connectFirestoreEmulator(firestore, host, 8080);
      emulatorsConnected = true;
      console.log('🔧 Connected to Firebase Emulators');
    } catch (error) {
      console.warn('Failed to connect to emulators:', error);
    }
  }

  return {
    firebaseApp,
    auth,
    firestore,
    functions,
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
