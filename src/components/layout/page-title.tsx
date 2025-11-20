'use client';
import { usePathname } from 'next/navigation';
import { menuItems } from '@/lib/menu-items';

export function PageTitle() {
  const pathname = usePathname();

  let title = 'Dashboard'; // Default title
  if (pathname === '/settings') {
    title = 'Settings';
  } else {
    const currentItem = menuItems.find(item => item.href !== '/dashboard' && pathname.startsWith(item.href));
    if (currentItem) {
      title = currentItem.label;
    }
  }


  return <h1 className="font-headline text-xl font-semibold md:text-2xl">{title}</h1>;
}
