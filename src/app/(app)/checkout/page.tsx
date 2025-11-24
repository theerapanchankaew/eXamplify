'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { processCheckout, validateVoucher } from '@/lib/marketplace';
import { getUserTokenBalance } from '@/lib/tokens';
import { ArrowLeft, Check, Loader2, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function CheckoutPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const [voucherCode, setVoucherCode] = useState('');
    const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);
    const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
    const [discount, setDiscount] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [tokenBalance, setTokenBalance] = useState(0);
    const [isLoadingBalance, setIsLoadingBalance] = useState(true);

    // Fetch cart items
    const cartQuery = useMemoFirebase(
        () =>
            firestore && user
                ? query(collection(firestore, `cart/${user.uid}/items`))
                : null,
        [firestore, user]
    );
    const { data: cartItems, isLoading: isLoadingCart } = useCollection(cartQuery);

    // Fetch token balance from transactions
    useEffect(() => {
        async function fetchBalance() {
            if (!firestore || !user) {
                setIsLoadingBalance(false);
                return;
            }

            setIsLoadingBalance(true);
            try {
                const balance = await getUserTokenBalance(firestore, user.uid);
                setTokenBalance(balance);
            } catch (error) {
                console.error('Error fetching token balance:', error);
                setTokenBalance(0);
            } finally {
                setIsLoadingBalance(false);
            }
        }

        fetchBalance();
    }, [firestore, user]);

    const subtotal = cartItems?.reduce((sum, item) => sum + (item.price || 0), 0) || 0;
    const total = subtotal - discount;

    const handleApplyVoucher = async () => {
        if (!firestore || !voucherCode.trim()) return;

        setIsValidatingVoucher(true);
        try {
            const result = await validateVoucher(firestore, voucherCode, subtotal);

            if (result.valid) {
                setAppliedVoucher(result.voucher);
                setDiscount(result.discount);
                toast({
                    title: 'Voucher Applied',
                    description: `You saved ${result.discount} tokens!`,
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Invalid Voucher',
                    description: result.error,
                });
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to validate voucher.',
            });
        } finally {
            setIsValidatingVoucher(false);
        }
    };

    const handleCheckout = async () => {
        if (!firestore || !user || !cartItems) return;

        // Wait for balance to load
        if (isLoadingBalance) {
            toast({
                title: 'Please Wait',
                description: 'Loading your token balance...',
            });
            return;
        }

        if (tokenBalance < total) {
            toast({
                variant: 'destructive',
                title: 'Insufficient Tokens',
                description: `You need ${total} tokens but have ${tokenBalance}.`,
            });
            return;
        }

        setIsProcessing(true);
        try {
            const result = await processCheckout(
                firestore,
                user.uid,
                cartItems,
                appliedVoucher?.code
            );

            if (result.success) {
                toast({
                    title: 'Purchase Successful!',
                    description: 'Your items have been added to your account.',
                });

                // Refresh token balance
                const newBalance = await getUserTokenBalance(firestore, user.uid);
                setTokenBalance(newBalance);

                // Redirect based on item type
                if (cartItems.length === 1) {
                    const item = cartItems[0];
                    if (item.itemType === 'course') {
                        router.push(`/courses/${item.itemId}`);
                    } else if (item.itemType === 'exam') {
                        // For exams, we need to get the courseId from the exam document
                        // Since we just purchased it, redirect to exams list where they can start it
                        router.push(`/exams`);
                    } else {
                        router.push('/courses');
                    }
                } else {
                    // Multiple items - go to courses/exams page
                    const hasExam = cartItems.some(item => item.itemType === 'exam');
                    router.push(hasExam ? '/exams' : '/courses');
                }
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Checkout Failed',
                    description: result.error,
                });
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Checkout failed.',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoadingCart || isLoadingBalance) {
        return (
            <div className="container mx-auto py-10">
                <Skeleton className="h-[600px] rounded-xl" />
            </div>
        );
    }

    if (!cartItems || cartItems.length === 0) {
        router.push('/cart');
        return null;
    }

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/cart">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Checkout</h1>
                    <p className="text-muted-foreground text-lg">Complete your purchase</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Order Items */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Items</CardTitle>
                            <CardDescription>{cartItems.length} items</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {cartItems.map((item) => (
                                <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-0">
                                    <div className="flex items-center gap-2">
                                        <Badge variant={item.itemType === 'course' ? 'default' : 'secondary'}>
                                            {item.itemType}
                                        </Badge>
                                        <span className="font-medium">{item.itemName}</span>
                                    </div>
                                    <span className="font-semibold">{item.price} tokens</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Voucher Code */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Voucher Code</CardTitle>
                            <CardDescription>Have a discount code? Apply it here</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Label htmlFor="voucher">Voucher Code</Label>
                                    <Input
                                        id="voucher"
                                        placeholder="Enter code"
                                        value={voucherCode}
                                        onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                                        disabled={!!appliedVoucher}
                                    />
                                </div>
                                <div className="flex items-end">
                                    <Button
                                        onClick={handleApplyVoucher}
                                        disabled={!voucherCode.trim() || isValidatingVoucher || !!appliedVoucher}
                                    >
                                        {isValidatingVoucher ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : appliedVoucher ? (
                                            <Check className="h-4 w-4" />
                                        ) : (
                                            'Apply'
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {appliedVoucher && (
                                <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200">
                                    <Tag className="h-4 w-4 text-green-600" />
                                    <AlertDescription className="text-green-800 dark:text-green-200">
                                        Voucher "{appliedVoucher.code}" applied! You saved {discount} tokens.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Payment Summary */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-8">
                        <CardHeader>
                            <CardTitle>Payment Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span className="font-medium">{subtotal} tokens</span>
                                </div>
                                {discount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Discount</span>
                                        <span className="font-medium text-green-600">-{discount} tokens</span>
                                    </div>
                                )}
                                <div className="border-t pt-3 flex justify-between">
                                    <span className="font-semibold text-lg">Total</span>
                                    <span className="text-2xl font-bold text-primary">{total} tokens</span>
                                </div>
                            </div>

                            <div className="p-4 bg-secondary rounded-lg space-y-2">
                                <div className="text-sm font-medium">Your Token Balance</div>
                                <div className="text-2xl font-bold">
                                    {tokenBalance} tokens
                                </div>
                                {tokenBalance < total && (
                                    <div className="text-sm text-destructive">
                                        Insufficient balance
                                    </div>
                                )}
                            </div>

                            <Button
                                className="w-full"
                                size="lg"
                                onClick={handleCheckout}
                                disabled={isProcessing || isLoadingBalance || tokenBalance < total}
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : isLoadingBalance ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Loading Balance...
                                    </>
                                ) : (
                                    `Complete Purchase (${total} tokens)`
                                )}
                            </Button>

                            <p className="text-xs text-center text-muted-foreground">
                                By completing this purchase, you agree to our terms and conditions.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
