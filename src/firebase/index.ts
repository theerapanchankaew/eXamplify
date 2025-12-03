'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { connectFirestoreEmulator } from 'firebase/firestore';

// IMPORTANT: Always use firebaseConfig for initialization
export function initializeFirebase() {
  if (!getApps().length) {
    // Always use firebaseConfig for consistent initialization
    // This prevents "Firebase: Need to provide options" errors in production
    if (!firebaseConfig || !firebaseConfig.apiKey) {
      throw new Error('Firebase configuration is missing or invalid. Please check your firebase/config.ts file.');
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

  // Connect to emulators in development
  // if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  //   try {
  //     // Connect to Functions emulator
  //     connectFunctionsEmulator(functions, 'localhost', 5001);

  //     // Connect to Firestore emulator
  //     connectFirestoreEmulator(firestore, 'localhost', 8080);

  //     console.log('🔧 Connected to Firebase Emulators');
  //   } catch (error) {
  //     console.warn('Failed to connect to emulators:', error);
  //   }
  // }

  return {
    firebaseApp,
    auth,
    firestore,
    functions,
  };
}


export async function login() {
  const { auth, firestore } = initializeFirebase();
  const provider = new GoogleAuthProvider();

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if the user already exists in Firestore
    const userDocRef = doc(firestore, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // Create a new user document if it doesn't exist
      await setDoc(userDocRef, {
        id: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: 'user', // or any default role
      });
    }
  } catch (error) {
    console.error("Error during login:", error);
  }
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
