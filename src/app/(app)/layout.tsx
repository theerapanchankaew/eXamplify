'use client';

import { SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

function AppSidebarSkeleton() {
    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="p-4">
                <div className="flex items-center gap-2.5">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-6 w-24" />
                </div>
            </SidebarHeader>
            <SidebarContent>
                <div className="flex flex-col gap-4 p-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div className="flex flex-col gap-2" key={i}>
                             <Skeleton className="h-5 w-20" />
                            {Array.from({ length: 3 }).map((_, j) => (
                                <Skeleton key={j} className="h-8 w-full" />
                            ))}
                        </div>
                    ))}
                </div>
            </SidebarContent>
            <SidebarContent className="mt-auto p-2">
                 <Skeleton className="h-8 w-full" />
            </SidebarContent>
        </Sidebar>
    );
}


function AppLayoutSkeleton() {
  return (
    <SidebarProvider>
        <div 
          className="flex min-h-screen w-full"
          suppressHydrationWarning={true}
        >
            <AppSidebarSkeleton />
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
    </SidebarProvider>
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
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
