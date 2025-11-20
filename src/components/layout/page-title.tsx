'use client';
import { usePathname } from 'next/navigation';
import { getMenuItems, settingsItem } from '@/lib/menu-items';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';


export function PageTitle() {
  const pathname = usePathname();
  const { user } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc(userDocRef);

  const menuItems = getMenuItems(userProfile?.role);

  let title = 'Dashboard'; // Default title
  if (pathname === '/settings') {
    title = settingsItem.label;
  } else if (userProfile) {
    const currentItem = menuItems.find(item => item.href !== '/dashboard' && pathname.startsWith(item.href));
    if (currentItem) {
      title = currentItem.label;
    }
  }


  return <h1 className="font-headline text-xl font-semibold md:text-2xl">{title}</h1>;
}
