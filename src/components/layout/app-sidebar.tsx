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
} from '@/components/ui/sidebar';
import { getMenuItems, settingsItem } from '@/lib/menu-items';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg
        width="32"
        height="32"
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
      <span className="font-headline text-xl font-bold text-foreground">
        eXamplify
      </span>
    </div>
  );
}

export function AppSidebar() {
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
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <Link href="/dashboard">
          <Logo />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {menuCategories.map((category, index) => (
            <SidebarGroup key={category.label}>
                {index > 0 && <SidebarSeparator />}
                <SidebarGroupLabel>{category.label}</SidebarGroupLabel>
                <SidebarMenu>
                {category.items.map((item) => (
                    <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith(item.href)}
                        tooltip={{ children: item.label, side: 'right' }}
                    >
                        <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                        </Link>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
                </SidebarMenu>
            </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarContent className="mt-auto">
         <SidebarSeparator />
         <SidebarMenu className="py-2">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname.startsWith(settingsItem.href)}
              tooltip={{ children: settingsItem.label, side: 'right' }}
            >
              <Link href={settingsItem.href}>
                <settingsItem.icon />
                <span>{settingsItem.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
