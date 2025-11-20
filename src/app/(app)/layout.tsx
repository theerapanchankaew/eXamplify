'use client';

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { useUser } from '@/firebase';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, isUserLoading } = useUser();
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    // This effect runs only on the client.
    // When it runs, we know we are past the server render.
    // We also wait for Firebase auth to give us a definitive answer.
    if (!isUserLoading) {
      setInitialLoading(false);
    }
  }, [isUserLoading]);

  useEffect(() => {
    // Redirect if not loading and no user is found.
    if (!initialLoading && !user) {
      redirect('/login');
    }
  }, [user, initialLoading]);


  if (initialLoading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <p>Loading...</p>
        </div>
    )
  }

  if (!user) {
    // This will be rendered briefly during the redirect.
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
