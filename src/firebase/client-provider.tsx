'use client';

import { useMemo, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

const Toaster = dynamic(() => import('@/components/ui/toaster').then(mod => mod.Toaster), {
  ssr: false,
});

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Data + auth services (self-hosted), created once per mount.
    return initializeFirebase();
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <FirebaseProvider
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
      <Toaster />
    </FirebaseProvider>
  );
}
