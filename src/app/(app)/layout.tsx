'use client';

import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

function AppLayoutSkeleton() {
  return (
    <div 
      className="flex min-h-screen w-full"
      suppressHydrationWarning={true}
    >
      {/* Static Skeleton Sidebar - matches the actual sidebar structure */}
      <div className="hidden border-r bg-background md:flex md:w-64 md:flex-col">
        <div className="flex h-full flex-col gap-2 p-4">
          <div className="mb-8 flex items-center gap-2.5">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="flex flex-col gap-4">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
          <Skeleton className="h-7 w-7 md:hidden" />
          <Skeleton className="h-6 w-32" />
          <div className="ml-auto flex items-center gap-4">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    </div>
  );
}


export default function AppLayoutClient({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  // This ensures we only run client-side logic after hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Only run redirect logic on the client, after initial render, and when loading is complete.
    if (isClient && !isUserLoading && !user) {
      router.replace('/login');
    }
  }, [isClient, user, isUserLoading, router]);

  // On the server and during initial client render/hydration, show the skeleton.
  if (!isClient || isUserLoading) {
    return <AppLayoutSkeleton />;
  }

  // After hydration, if there's no user, keep showing the skeleton while redirecting.
  if (!user) {
    return <AppLayoutSkeleton />;
  }
  
  // Actual layout for authenticated users, rendered only on the client after auth check.
  return (
    <SidebarProvider>
      <div className="group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar">
          <AppSidebar />
          <SidebarInset>
            <AppHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
          </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
