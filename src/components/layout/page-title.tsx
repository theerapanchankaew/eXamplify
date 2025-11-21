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

  const menuCategories = getMenuItems(userProfile?.role);

  let title = '';

  if (pathname === settingsItem.href) {
    title = settingsItem.label;
  } else if (userProfile) {
    // Flatten all items from all categories and find the matching one
    const allItems = menuCategories.flatMap(category => category.items);
    // Find the item whose href is the most specific match for the current pathname.
    const currentItem = allItems
      .filter(item => pathname.startsWith(item.href))
      .sort((a, b) => b.href.length - a.href.length)[0];

    if (currentItem) {
      title = currentItem.label;
    }
  }

  // Default to Dashboard if no specific title is found and we are at the root
  if (!title && pathname.includes('/dashboard')) {
      title = 'Dashboard';
  }


  return <h1 className="font-headline text-xl font-semibold md:text-2xl">{title}</h1>;
}
