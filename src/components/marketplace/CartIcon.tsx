'use client';

import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';

export function CartIcon() {
    const { user } = useUser();
    const firestore = useFirestore();

    const cartQuery = useMemoFirebase(
        () =>
            firestore && user
                ? query(collection(firestore, `cart/${user.uid}/items`))
                : null,
        [firestore, user]
    );

    const { data: cartItems } = useCollection(cartQuery);
    const itemCount = cartItems?.length || 0;

    if (!user) return null;

    return (
        <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                        {itemCount}
                    </span>
                )}
            </Button>
        </Link>
    );
}
