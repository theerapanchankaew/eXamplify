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

  // If loading, or not a client yet, or no user and waiting for redirect,
  // render the layout with isLoading=true. It will handle its own skeletons.
  // This avoids swapping entire layout structures, which causes hydration errors.
  const isLoading = !isClient || isUserLoading || !user;

  if (isClient && !isUserLoading && !user) {
    // Return null or a minimal loader while redirecting to avoid rendering the full layout
    // for an unauthenticated user, which might cause a flash of content.
    return null;
  }

  return (
    <SidebarProvider>
      <div className="group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar">
          <AppSidebar isLoading={isLoading} />
          <SidebarInset>
            <AppHeader isLoading={isLoading} />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
              {isLoading ? null : children}
            </main>
          </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
