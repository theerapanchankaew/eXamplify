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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  doc,
  collectionGroup,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


const topUpSchema = z.object({
  amount: z
    .number({
      required_error: 'Please enter an amount.',
      invalid_type_error: 'Please enter a valid number.',
    })
    .min(1, 'Amount must be at least 1.')
    .positive('Amount must be positive.'),
  userId: z.string().min(1, "Please select a user."),
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

  const usersCollectionQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'users')) : null),
    [firestore]
  );
  const { data: users, isLoading: isLoadingUsers } = useCollection(usersCollectionQuery);

  const transactionsQuery = useMemoFirebase(
    () => {
      if (!firestore || !userProfile) return null;
      if (userProfile.role === 'Admin') {
        // Admin sees all transactions
        return query(
          collectionGroup(firestore, 'tokenTransactions'),
          orderBy('timestamp', 'desc')
        );
      }
      // Regular user sees only their own transactions
      return query(
        collection(firestore, 'users', userProfile.id, 'tokenTransactions'),
        orderBy('timestamp', 'desc')
      );
    },
    [firestore, userProfile]
  );

  const { data: transactions, isLoading: isLoadingTransactions } = useCollection(transactionsQuery);

  const currentBalance = useMemo(() => {
    if (!transactions || !user) return 0;

    // Regardless of role, we always calculate the balance for the *current* logged-in user.
    // We filter the transactions array to only include those belonging to the current user.
    return transactions
      .filter(t => t.path?.includes(user.uid))
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [transactions, user]);
  
  const form = useForm<TopUpFormData>({
    resolver: zodResolver(topUpSchema),
    defaultValues: {
      amount: undefined,
      userId: undefined,
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
      const { userId, amount } = data;
      const transactionsColRef = collection(
        firestore,
        'users',
        userId,
        'tokenTransactions'
      );
      await addDoc(transactionsColRef, {
        userId: userId, // Keep track of the user for admin view
        amount: amount,
        transactionType: 'top-up',
        timestamp: serverTimestamp(),
        description: `Top-up by Admin (${user.email})`,
      });
      
      const toppedUpUser = users?.find(u => u.id === userId);

      toast({
        title: 'Success',
        description: `${amount} tokens have been added to ${toppedUpUser?.username || 'the user'}'s wallet.`,
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
  
  const isLoading = isLoadingTransactions || isLoadingProfile || isLoadingUsers;

  // Enhance transactions with user info for display
  const enrichedTransactions = useMemo(() => {
    if (isLoading || !transactions || !users) return [];
    if(userProfile?.role !== 'Admin') {
      // Non-admins see only their transactions, so filter them.
      return transactions.filter(t => t.path?.includes(user?.uid || ''));
    }
    // Admins see all transactions, so we enrich them with user details.
    return transactions.map(t => {
      // Path is like 'users/USER_ID/tokenTransactions/TRANSACTION_ID'
      const userId = t.path?.split('/')[1];
      const transactionUser = users.find(u => u.id === userId);
      return { ...t, user: transactionUser };
    });
  }, [isLoading, transactions, users, userProfile, user]);

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
              My Balance
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingProfile || isLoadingTransactions ? (
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
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
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
                Add tokens to a user's wallet. 1 Token = 0.01 THB.
                </CardDescription>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleTopUp)}>
                <CardContent className="space-y-4">
                     <FormField
                      control={form.control}
                      name="userId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>User</FormLabel>
                           <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a user to top-up" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users?.map(user => (
                                <SelectItem key={user.id} value={user.id}>{user.username || user.email}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                                    onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
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
            {userProfile?.role === 'Admin' 
              ? 'A record of all token transactions in the system.'
              : 'A record of your token transactions.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                {userProfile?.role === 'Admin' && <TableHead>User</TableHead>}
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    {userProfile?.role === 'Admin' && <TableCell><Skeleton className="h-5 w-32" /></TableCell>}
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : enrichedTransactions && enrichedTransactions.length > 0 ? (
                enrichedTransactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      {t.timestamp
                        ? format(t.timestamp.toDate(), 'PPP')
                        : 'Date not available'}
                    </TableCell>
                    {userProfile?.role === 'Admin' && (
                       <TableCell>
                         <div className="flex items-center gap-2">
                           <Avatar className="h-6 w-6" data-ai-hint="person face">
                             <AvatarImage src={`https://picsum.photos/seed/${t.user?.id}/30/30`} />
                             <AvatarFallback>{t.user?.username?.charAt(0) || 'U'}</AvatarFallback>
                           </Avatar>
                           <span>{t.user?.username || t.user?.email || 'N/A'}</span>
                         </div>
                       </TableCell>
                    )}
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
                  <TableCell colSpan={userProfile?.role === 'Admin' ? 5 : 4} className="text-center">
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
