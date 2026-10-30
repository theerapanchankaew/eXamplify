// Firebase web (client) configuration.
//
// All values come from NEXT_PUBLIC_* environment variables so the same code
// can be built against any Firebase project and deployed to any host.
// NOTE: NEXT_PUBLIC_* values are inlined at BUILD time — set them before
// `next build` (or pass them as Docker build args), not only at runtime.
//
// These values are not secrets (they are shipped to every browser anyway);
// access control is enforced by firestore.rules and Firebase Auth.
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? '',
};
