'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { redirect } from 'next/navigation';
import { Command } from 'lucide-react';
import { AiBackground } from '@/components/ui/ai-background';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, {
    message: 'Password must be at least 6 characters.',
  }),
});

type FormData = z.infer<typeof formSchema>;

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleLogin = async (values: FormData) => {
    setIsLoading(true);
    if (!auth) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Firebase Auth is not available.',
      });
      setIsLoading(false);
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
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

  const handleSignUp = async (values: FormData) => {
    setIsLoading(true);
    if (!auth || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: 'Firebase services are not available.',
      });
      setIsLoading(false);
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const newUser = userCredential.user;

      const isAdmin = values.email.toLowerCase() === 'admin@masci.com' || values.email.toLowerCase() === 'admin@masci.or.th';
      const userRole = isAdmin ? 'Admin' : 'Student';

      const batch = writeBatch(firestore);

      const userDocRef = doc(firestore, 'users', newUser.uid);
      batch.set(userDocRef, {
        id: newUser.uid,
        email: newUser.email,
        role: userRole,
        username: newUser.email?.split('@')[0] || `user_${newUser.uid.substring(0, 5)}`,
      });

      if (isAdmin) {
        const adminRoleRef = doc(firestore, 'roles_admin', newUser.uid);
        batch.set(adminRoleRef, { role: 'admin' });
      }

      await batch.commit();

      toast({
        title: 'Success',
        description: 'Account created successfully. You are now logged in.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
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
      <div className="relative w-full max-w-[850px] min-h-[500px] bg-white dark:bg-zinc-800 rounded-[20px] shadow-2xl overflow-hidden">

        {/* Sign Up Form Container */}
        <div className={cn(
          "absolute top-0 h-full transition-all duration-700 ease-in-out left-0 w-1/2 z-10",
          isSignUp ? "translate-x-full opacity-100 z-50" : "opacity-0 z-0"
        )}>
          <div className="flex flex-col items-center justify-center h-full px-10 text-center">
            <h1 className="text-3xl font-bold mb-4 text-zinc-800 dark:text-white">Create Account</h1>
            <p className="text-sm text-muted-foreground mb-8">Use your email for registration</p>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSignUp)} className="w-full space-y-4 text-left">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Email" {...field} disabled={isLoading} className="bg-zinc-100 dark:bg-zinc-700 border-none" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="password" placeholder="Password" {...field} disabled={isLoading} className="bg-zinc-100 dark:bg-zinc-700 border-none" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-full transition-transform active:scale-95" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Sign Up'}
                </Button>
              </form>
            </Form>
          </div>
        </div>

        {/* Sign In Form Container */}
        <div className={cn(
          "absolute top-0 h-full transition-all duration-700 ease-in-out left-0 w-1/2 z-20",
          isSignUp ? "translate-x-full opacity-0" : "opacity-100"
        )}>
          <div className="flex flex-col items-center justify-center h-full px-10 text-center">
            <h1 className="text-3xl font-bold mb-4 text-zinc-800 dark:text-white">Sign In</h1>
            <p className="text-sm text-muted-foreground mb-8">Welcome back! Please login to your account.</p>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleLogin)} className="w-full space-y-4 text-left">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Email" {...field} disabled={isLoading} className="bg-zinc-100 dark:bg-zinc-700 border-none" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="password" placeholder="Password" {...field} disabled={isLoading} className="bg-zinc-100 dark:bg-zinc-700 border-none" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-full transition-transform active:scale-95" disabled={isLoading}>
                  {isLoading ? 'Logging in...' : 'Sign In'}
                </Button>
              </form>
            </Form>
          </div>
        </div>

        {/* Overlay Container */}
        <div className={cn(
          "absolute top-0 left-1/2 w-1/2 h-full overflow-hidden transition-transform duration-700 ease-in-out z-100",
          isSignUp ? "-translate-x-full" : ""
        )}>
          <div className={cn(
            "bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white relative -left-full h-full w-[200%] transform transition-transform duration-700 ease-in-out",
            isSignUp ? "translate-x-1/2" : "translate-x-0"
          )}>
            <AiBackground />

            {/* Overlay Left (Visible when Sign Up is active) */}
            <div className={cn(
              "absolute top-0 flex flex-col items-center justify-center h-full w-1/2 px-10 text-center transform transition-transform duration-700 ease-in-out",
              isSignUp ? "translate-x-0" : "-translate-x-[20%]"
            )}>
              <div className="relative z-10">
                <div className="flex items-center justify-center mb-4 text-3xl font-bold">
                  <Command className="mr-2 h-8 w-8" />
                  eXamplify
                </div>
                <h1 className="text-3xl font-bold mb-4">Welcome Back!</h1>
                <p className="mb-8 text-lg">To keep connected with us please login with your personal info</p>
                <Button
                  variant="outline"
                  className="bg-transparent border-white text-white hover:bg-white hover:text-indigo-600 rounded-full px-8 py-2 font-bold transition-colors"
                  onClick={() => setIsSignUp(false)}
                >
                  Sign In
                </Button>
              </div>
            </div>

            {/* Overlay Right (Visible when Sign In is active) */}
            <div className={cn(
              "absolute top-0 right-0 flex flex-col items-center justify-center h-full w-1/2 px-10 text-center transform transition-transform duration-700 ease-in-out",
              isSignUp ? "translate-x-[20%]" : "translate-x-0"
            )}>
              <div className="relative z-10">
                <div className="flex items-center justify-center mb-4 text-3xl font-bold">
                  <Command className="mr-2 h-8 w-8" />
                  eXamplify
                </div>
                <h1 className="text-3xl font-bold mb-4">Hello, Friend!</h1>
                <p className="mb-8 text-lg">Enter your personal details and start journey with us</p>
                <Button
                  variant="outline"
                  className="bg-transparent border-white text-white hover:bg-white hover:text-indigo-600 rounded-full px-8 py-2 font-bold transition-colors"
                  onClick={() => setIsSignUp(true)}
                >
                  Sign Up
                </Button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
