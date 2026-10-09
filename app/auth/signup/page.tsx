'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useFirebase } from '@/firebase/provider';
import {
  setDoc,
  doc,
  createUserWithEmailAndPassword,
  updateProfile,
} from '@/firebase/client';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { defaultTheme } from '@/lib/theme-constants';
import { AuthBackground } from '@/components/auth/AuthBackground';

const formSchema = z.object({
  username: z
    .string()
    .min(3, { message: 'Username must be at least 3 characters.' })
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores.'),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  gender: z.enum(['male', 'female', 'other'], { required_error: 'Please select your gender.' }),
});

export default function SignUpPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { auth, firestore, user } = useFirebase();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      gender: 'male',
    },
  });

  /**
   * REACTIVE REDIRECT:
   * Once the user is created and session is synced,
   * we perform the hard navigation to the profile setup.
   */
  useEffect(() => {
    if (user && isLoading) {
      window.location.assign('/profile/me/edit');
    }
  }, [user, isLoading]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!auth || !firestore) return;
    setIsLoading(true);

    try {
      // 1. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const loggedUser = userCredential.user;

      // 2. Update Firebase Auth profile
      await updateProfile(loggedUser, { displayName: values.username });

      // 3. Create user document in Firestore with defaults
      await setDoc(doc(firestore, 'users', loggedUser.uid), {
        uid: loggedUser.uid,
        id: loggedUser.uid,
        username: values.username.toLowerCase(),
        displayName: values.username,
        email: loggedUser.email,
        gender: values.gender,
        photoURL: null,
        vipTier: 'non-vip',
        isVip: false,
        isAdmin: false,
        age: null,
        location: '',
        nationality: '',
        bio: '',
        interests: [],
        theme: defaultTheme,
        relationshipStatus: 'single',
        relationshipTargetId: null,
        createdAt: new Date().toISOString(),
      });

      // Redirect is handled by the useEffect once the provider syncs the session cookie
      
    } catch (error: any) {
      console.error('Sign up error', error);
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: error.message,
      });
      setIsLoading(false);
    }
  }

  return (
    <>
      <AuthBackground />
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md space-y-8 bg-black/40 backdrop-blur-xl p-8 rounded-2xl border border-white/10">
          <div className="text-center">
            <h1 className="text-4xl font-bold font-headline title-pulse-glow bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              Join the DreamVerse
            </h1>
            <p className="text-muted-foreground mt-2">
              Create your account to start connecting.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input suppressHydrationWarning placeholder="your_username" {...field} autoComplete="username" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input suppressHydrationWarning placeholder="you@example.com" {...field} autoComplete="email" />
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
                        autoComplete="new-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Gender</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="male" id="male" />
                          <Label htmlFor="male">Male</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="female" id="female" />
                          <Label htmlFor="female">Female</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="other" id="other" />
                          <Label htmlFor="other">Other</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full animated-border-button" disabled={isLoading}>
                <span>{isLoading ? 'Creating Identity...' : 'Sign Up'}</span>
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/signin" className="font-semibold text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
