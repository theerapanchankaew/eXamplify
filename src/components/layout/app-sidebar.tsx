'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuSkeleton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { getMenuItems, settingsItem } from '@/lib/menu-items';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

function Logo() {
  return (
    <div className="flex items-center gap-3 px-1">
      <div className="relative">
        <svg
          width="36"
          height="36"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
        >
          <path
            d="M16 0L32 9.2376L16 18.4752L0 9.2376L16 0Z"
            fill="url(#paint0_linear_sidebar)"
          />
          <path
            d="M6.4 12.469V22.7624L16 28L25.6 22.7624V12.469L16 17.7066L6.4 12.469Z"
            fill="hsl(var(--primary))"
          />
          <path
            d="M0 9.2376L16 18.4752V32L0 19.4752V9.2376Z"
            fill="hsl(var(--accent))"
          />
          <path
            d="M32 9.2376L16 18.4752V32L32 19.4752V9.2376Z"
            fill="hsl(var(--primary))"
            fillOpacity="0.5"
          />
          <defs>
            <linearGradient
              id="paint0_linear_sidebar"
              x1="16"
              y1="0"
              x2="16"
              y2="18.4752"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="hsl(var(--primary))" />
              <stop offset="1" stopColor="hsl(var(--accent))" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="font-headline text-xl font-bold text-foreground leading-none">
          eXamplify
        </span>
        <span className="text-[10px] text-muted-foreground font-medium tracking-wide">
          LEARNING PLATFORM
        </span>
      </div>
    </div>
  );
}

interface AppSidebarProps {
  isLoading?: boolean;
}

export function AppSidebar({ isLoading }: AppSidebarProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc(userDocRef);

  const menuCategories = getMenuItems(userProfile?.role);

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="p-4 border-b">
        <Link href="/dashboard" className="block transition-opacity hover:opacity-80">
          <Logo />
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            <SidebarMenuSkeleton showIcon />
            <SidebarMenuSkeleton showIcon />
            <SidebarMenuSkeleton showIcon />
            <SidebarSeparator className="my-2" />
            <SidebarMenuSkeleton showIcon />
            <SidebarMenuSkeleton showIcon />
          </div>
        ) : (
          menuCategories.map((category, index) => (
            <SidebarGroup key={category.label} className="mb-4">
              {index > 0 && <SidebarSeparator className="mb-4" />}
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider px-2 mb-2">
                {category.label}
              </SidebarGroupLabel>
              <SidebarMenu className="space-y-0.5">
                {category.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={{ children: item.label, side: 'right' }}
                        className={cn(
                          "transition-all duration-200",
                          isActive && "bg-primary/10 text-primary font-medium shadow-sm"
                        )}
                      >
                        <Link href={item.href} className="flex items-center gap-3">
                          <item.icon className={cn(
                            "transition-all",
                            isActive ? "scale-110" : "scale-100"
                          )} />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))
        )}
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            {isLoading ? (
              <SidebarMenuSkeleton showIcon />
            ) : (
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(settingsItem.href)}
                tooltip={{ children: settingsItem.label, side: 'right' }}
                className="transition-all duration-200"
              >
                <Link href={settingsItem.href} className="flex items-center gap-3">
                  <settingsItem.icon />
                  <span>{settingsItem.label}</span>
                </Link>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
