'use client';

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

function AppLayoutSkeleton() {
  return (
    <div className="flex min-h-screen w-full">
      {/* Static Skeleton Sidebar */}
      <div className="hidden border-r bg-background md:flex md:w-64 md:flex-col">
        <div className="flex h-full flex-col gap-2 p-4">
          <div className="mb-8 flex items-center gap-2.5">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="flex flex-col gap-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
          <div className="mt-auto pt-4">
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        {/* Static Skeleton Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
          <Skeleton className="h-7 w-7 md:hidden" />
          <Skeleton className="h-6 w-32" />
          <div className="ml-auto flex items-center gap-4">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </header>
        {/* Static Skeleton Content */}
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

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, isClient, router]);

  if (!isClient || isUserLoading || !user) {
    return <AppLayoutSkeleton />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
