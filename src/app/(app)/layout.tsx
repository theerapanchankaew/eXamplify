'use client';

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { useUser } from '@/firebase';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

function AppLayoutSkeleton() {
    return (
      <div className="flex h-screen w-full flex-col">
        {/* Header Skeleton */}
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
          <Skeleton className="h-7 w-7 md:hidden" />
          <Skeleton className="h-6 w-32" />
          <div className="ml-auto flex items-center gap-4">
            <Skeleton className="h-8 w-[300px] hidden sm:block" />
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </header>
        {/* Main Content Skeleton */}
        <div className="flex flex-1">
          {/* Sidebar Skeleton */}
          <div className="hidden md:flex flex-col gap-2 p-2 border-r" style={{ width: 'var(--sidebar-width)'}}>
            <div className="p-2">
              <Skeleton className="h-8 w-32" />
            </div>
            <div className="flex flex-col gap-1 p-0">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 p-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-6 w-32" />
                </div>
              ))}
            </div>
          </div>
          {/* Page Content Skeleton */}
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="h-[400px] w-full" />
          </main>
        </div>
      </div>
    );
}


export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, isUserLoading } = useUser();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !isUserLoading && !user) {
      redirect('/login');
    }
  }, [user, isUserLoading, isMounted]);

  if (!isMounted || isUserLoading || !user) {
    return <AppLayoutSkeleton />;
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
