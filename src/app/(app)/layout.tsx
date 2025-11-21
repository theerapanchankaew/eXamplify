'use client';

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AppLayoutClient({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !isUserLoading && !user) {
      router.replace('/login');
    }
  }, [isClient, user, isUserLoading, router]);

  // If we are on the server, or the user is loading, or we are about to redirect,
  // render nothing to prevent any hydration mismatch. The redirect will happen
  // in the useEffect above.
  if (!isClient || isUserLoading || !user) {
    return null;
  }

  // Once we are on the client and have a user, render the full layout.
  return (
    <SidebarProvider>
      <div className="group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar">
          <AppSidebar isLoading={isUserLoading} />
          <SidebarInset>
            <AppHeader isLoading={isUserLoading} />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
              {children}
            </main>
          </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
