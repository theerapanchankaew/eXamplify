'use client';
import { Bell, LogOut, Search, Settings, User, Wallet } from 'lucide-react';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SidebarTrigger } from '../ui/sidebar';
import { PageTitle } from './page-title';
import { useUser, useAuth, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, collectionGroup, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import { useDoc } from '@/firebase/firestore/use-doc';

export function AppHeader() {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isLoadingProfile } = useDoc(userDocRef);

  const transactionsQuery = useMemoFirebase(
    () => {
      if (!firestore || !userProfile) return null;
      // If admin, get all transactions to be able to derive personal balance
      if (userProfile.role === 'Admin') {
        return query(collectionGroup(firestore, 'tokenTransactions'));
      }
      // For other users, get only their own transactions
      return query(collection(firestore, 'users', user!.uid, 'tokenTransactions'));
    },
    [firestore, user, userProfile]
  );

  const { data: transactions, isLoading: isLoadingTokens } = useCollection(transactionsQuery);

  const totalUserTokens = useMemo(() => {
      if (!transactions || !user) return 0;
      // Always filter the transactions to get the balance for the currently logged-in user.
      const userTransactions = transactions.filter(t => t.path?.includes(user.uid));
      return userTransactions.reduce((sum, transaction) => sum + (transaction.amount || 0), 0);
    },
    [transactions, user]
  );


  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
  };
  
  const isLoading = isLoadingTokens || isLoadingProfile;

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="md:hidden" />
        <PageTitle />
      </div>

      <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <form className="ml-auto flex-1 sm:flex-initial">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
            />
          </div>
        </form>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
            <Wallet className="h-5 w-5" />
            <span className="sr-only">Wallet</span>
          </Button>
          {isLoading ? (
             <Skeleton className="h-5 w-12" />
          ) : (
            <span className="font-semibold text-sm">{totalUserTokens.toLocaleString()}</span>
          )}
        </div>

        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Toggle notifications</span>
        </Button>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                <Avatar className="h-9 w-9" data-ai-hint="person face">
                  <AvatarImage src={user.photoURL || `https://picsum.photos/seed/${user.uid}/40/40`} alt="User" />
                  <AvatarFallback>{userProfile?.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.displayName || userProfile?.username || 'User'}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild>
            <Link href="/login">Login</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
