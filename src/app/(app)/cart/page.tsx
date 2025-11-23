'use client';

import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { removeFromCart } from '@/lib/marketplace';
import { ShoppingCart, Trash2, ArrowRight, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CartPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const cartQuery = useMemoFirebase(
        () =>
            firestore && user
                ? query(collection(firestore, `cart/${user.uid}/items`))
                : null,
        [firestore, user]
    );

    const { data: cartItems, isLoading } = useCollection(cartQuery);

    const subtotal = cartItems?.reduce((sum, item) => sum + (item.price || 0), 0) || 0;

    const handleRemove = async (itemId: string) => {
        if (!firestore || !user) return;

        try {
            await removeFromCart(firestore, user.uid, itemId);
            toast({
                title: 'Removed from Cart',
                description: 'Item has been removed from your cart.',
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to remove item.',
            });
        }
    };

    if (isLoading) {
        return (
            <div className="container mx-auto py-10">
                <Skeleton className="h-[400px] rounded-xl" />
            </div>
        );
    }

    if (!cartItems || cartItems.length === 0) {
        return (
            <div className="container mx-auto py-20 text-center space-y-6">
                <div className="flex justify-center">
                    <div className="p-6 bg-secondary rounded-full">
                        <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                    </div>
                </div>
                <h2 className="text-3xl font-bold">Your cart is empty</h2>
                <p className="text-muted-foreground text-lg">
                    Browse our marketplace to find courses and exams
                </p>
                <Button asChild size="lg">
                    <Link href="/marketplace">
                        Browse Marketplace
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight">Shopping Cart</h1>
                <p className="text-muted-foreground text-lg">
                    {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in your cart
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Cart Items */}
                <div className="lg:col-span-2 space-y-4">
                    {cartItems.map((item) => (
                        <Card key={item.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant={item.itemType === 'course' ? 'default' : 'secondary'}>
                                                    {item.itemType}
                                                </Badge>
                                                <h3 className="font-semibold text-lg">{item.itemName}</h3>
                                            </div>
                                            {item.itemDescription && (
                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                    {item.itemDescription}
                                                </p>
                                            )}
                                        </div>

                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-primary">
                                                {item.price}
                                            </div>
                                            <div className="text-xs text-muted-foreground">tokens</div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 pt-2 border-t">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            asChild
                                        >
                                            <Link href={item.itemType === 'course' ? `/courses/${item.itemId}` : `/exams/${item.itemId}`}>
                                                <Eye className="h-3 w-3 mr-1" />
                                                View Details
                                            </Link>
                                        </Button>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleRemove(item.id)}
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        >
                                            <Trash2 className="h-3 w-3 mr-1" />
                                            Remove
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Order Summary */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-8">
                        <CardHeader>
                            <CardTitle>Order Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span className="font-medium">{subtotal} tokens</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Discount</span>
                                    <span className="font-medium text-green-600">0 tokens</span>
                                </div>
                                <div className="border-t pt-2 flex justify-between">
                                    <span className="font-semibold">Total</span>
                                    <span className="text-2xl font-bold text-primary">{subtotal} tokens</span>
                                </div>
                            </div>

                            <Button
                                className="w-full"
                                size="lg"
                                onClick={() => router.push('/checkout')}
                            >
                                Proceed to Checkout
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">
                                        Or
                                    </span>
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                className="w-full"
                                asChild
                            >
                                <Link href="/marketplace">
                                    Continue Shopping
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
