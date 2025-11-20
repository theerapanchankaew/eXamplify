'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  doc,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard, Wallet } from 'lucide-react';
import { format } from 'date-fns';

const topUpSchema = z.object({
  amount: z
    .number({
      required_error: 'Please enter an amount.',
      invalid_type_error: 'Please enter a valid number.',
    })
    .min(1, 'Amount must be at least 1.')
    .positive('Amount must be positive.'),
});

type TopUpFormData = z.infer<typeof topUpSchema>;

export default function BillingPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isLoadingProfile } = useDoc(userDocRef);

  const transactionsQuery = useMemoFirebase(
    () =>
      firestore && user
        ? query(
            collection(firestore, 'users', user.uid, 'tokenTransactions'),
            orderBy('timestamp', 'desc')
          )
        : null,
    [firestore, user]
  );

  const { data: transactions, isLoading: isLoadingTransactions } = useCollection(transactionsQuery);

  const currentBalance = useMemo(
    () =>
      transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0,
    [transactions]
  );

  const form = useForm<TopUpFormData>({
    resolver: zodResolver(topUpSchema),
    defaultValues: {
      amount: undefined,
    },
  });

  const handleTopUp = async (data: TopUpFormData) => {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to top up.',
      });
      return;
    }
    try {
      const transactionsColRef = collection(
        firestore,
        'users',
        user.uid,
        'tokenTransactions'
      );
      await addDoc(transactionsColRef, {
        amount: data.amount,
        transactionType: 'top-up',
        timestamp: serverTimestamp(),
        description: `Admin top-up`,
      });
      toast({
        title: 'Success',
        description: `${data.amount} tokens have been added to your wallet.`,
      });
      form.reset();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Top-up Failed',
        description: error.message,
      });
    }
  };
  
  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'top-up':
        return 'default';
      case 'purchase':
        return 'destructive';
      case 'reward':
        return 'secondary';
      default:
        return 'outline';
    }
  };
  
  const isLoading = isLoadingTransactions || isLoadingProfile;

  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-muted-foreground">
          Manage your tokens and view transaction history.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Current Balance
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">{currentBalance.toLocaleString()} Tokens</div>
            )}
            <p className="text-xs text-muted-foreground">
              Your available token balance.
            </p>
          </CardContent>
        </Card>

        { isLoading ? (
            <Card className="lg:col-span-2">
                <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-10 w-full" />
                </CardContent>
                <CardFooter>
                    <Skeleton className="h-10 w-40" />
                </CardFooter>
            </Card>
        ) : userProfile?.role === 'Admin' && (
            <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Top-up Tokens</CardTitle>
                <CardDescription>
                Add more tokens to your wallet. 1 Token = 0.01 THB.
                </CardDescription>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleTopUp)}>
                <CardContent className="space-y-4">
                    <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <Input
                                    type="number"
                                    placeholder="1000"
                                    {...field}
                                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                    className="pl-4"
                                />
                            </div>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                    <CreditCard className="mr-2 h-4 w-4" /> Top-up Tokens
                    </Button>
                </CardFooter>
                </form>
            </Form>
            </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            A record of all your token transactions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingTransactions ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : transactions && transactions.length > 0 ? (
                transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      {t.timestamp
                        ? format(t.timestamp.toDate(), 'PPP')
                        : 'Date not available'}
                    </TableCell>
                    <TableCell>{t.description || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(t.transactionType)}>
                        {t.transactionType}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-mono ${t.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No transactions yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
