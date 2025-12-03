'use client';

import { useState } from 'react';
import { useUser, login } from '@/firebase'; // Import login
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { redirect } from 'next/navigation';
import { Command } from 'lucide-react';

export default function LoginPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await login(); // Call the new login function
      toast({ title: 'Success', description: 'Logged in successfully.' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 dark:bg-zinc-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl overflow-hidden p-8 text-center">
        <div className="flex flex-col items-center justify-center h-full">
            <div className="flex items-center justify-center mb-4 text-3xl font-bold text-zinc-800 dark:text-white">
                <Command className="mr-2 h-8 w-8" />
                eXamplify
            </div>
            <h1 className="text-3xl font-bold mb-2 text-zinc-800 dark:text-white">Welcome</h1>
            <p className="text-sm text-muted-foreground mb-8">Sign in to access your dashboard.</p>
            <Button
              onClick={handleGoogleSignIn}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-full transition-transform active:scale-95 flex items-center justify-center"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in with Google'}
            </Button>
        </div>
      </div>
    </div>
  );
}
