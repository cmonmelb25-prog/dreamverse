
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';

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
import { Separator } from '@/components/ui/separator';

import { useFirebase } from '@/firebase/provider';
import {
  doc,
  getDoc,
  setDoc,
  signInWithEmailAndPassword as fbSignIn,
  signInWithPopup as fbPopup,
  GoogleAuthProvider
} from '@/firebase/client';

import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { defaultTheme } from '@/lib/theme-constants';

const formSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

export default function SignInForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [shouldRedirectHome, setShouldRedirectHome] = useState(false);
  const { auth, firestore, user, isSessionSynced } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  /**
   * STABLE REDIRECT LATCH:
   * Waits for both the user object and the server session cookie (isSessionSynced)
   * before performing a hard navigation to the feed.
   */
  useEffect(() => {
    if (shouldRedirectHome && user && isSessionSynced) {
      router.replace('/feed');
    }
  }, [router, shouldRedirectHome, user, isSessionSynced]);

  async function handleGoogleSignIn() {
    if (!auth || !firestore) return;
    setIsLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await fbPopup(auth, provider);
      const loggedUser = result.user;
      setShouldRedirectHome(true);

      const userRef = doc(firestore, 'users', loggedUser.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        await setDoc(userRef, {
          uid: loggedUser.uid,
          id: loggedUser.uid,
          username:
            (loggedUser.displayName || 'user')
              .toLowerCase()
              .replace(/\s+/g, '_') +
            Math.floor(Math.random() * 1000),
          displayName: loggedUser.displayName || null,
          email: loggedUser.email,
          photoURL: loggedUser.photoURL || null,
          vipTier: 'non-vip',
          isVip: false,
          isAdmin: false,
          theme: defaultTheme,
          relationshipStatus: 'single',
          relationshipTargetId: null,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      console.error('Google Sign In Error', error);
      if (error.code !== 'auth/popup-closed-by-user') {
        toast({
          variant: 'destructive',
          title: 'Google Sign In Failed',
          description: error.message,
        });
      }
      setIsLoading(false);
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!auth) return;
    setIsLoading(true);

    try {
      await fbSignIn(auth, values.email, values.password);
      setShouldRedirectHome(true);
    } catch (error: any) {
      console.error('Sign in error', error);
      toast({
        variant: 'destructive',
        title: 'Sign In Failed',
        description: error.message,
      });
      setIsLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md space-y-8 bg-black/40 backdrop-blur-xl p-8 rounded-2xl border border-white/10">

        <div className="text-center">
          <h1 className="text-4xl font-bold font-headline bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
            Welcome Back
          </h1>
          <p className="text-muted-foreground mt-2">
            Sign in to continue your journey in the DreamVerse.
          </p>
        </div>

        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-xl gap-3"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <span>Continue with Google</span>
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full bg-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or email
              </span>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      suppressHydrationWarning
                      placeholder="you@example.com"
                      {...field}
                      autoComplete="email"
                      className="bg-white/5 border-white/10 h-11"
                    />
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
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      suppressHydrationWarning
                      type="password"
                      placeholder="••••••••"
                      {...field}
                      autoComplete="current-password"
                      className="bg-white/5 border-white/10 h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full h-12"
              disabled={isLoading}
            >
              {isLoading ? 'Establishing Realities...' : 'Sign In'}
            </Button>

          </form>
        </Form>

        <p className="text-center text-sm text-muted-foreground pt-4">
          Don't have an account?{' '}
          <Link href="/auth/signup" className="font-semibold text-primary hover:underline">
            Sign Up
          </Link>
        </p>

      </div>
    </div>
  );
}
