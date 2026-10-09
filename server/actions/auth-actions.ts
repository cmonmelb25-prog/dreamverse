
'use server';

import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase-admin';

/**
 * Creates a session cookie from an ID token and sets it.
 */
export async function signInAction(idToken: string) {
  if (!adminAuth) {
    console.error('Firebase Admin not initialized');
    return { success: false, error: 'Server authentication error' };
  }

  if (!idToken || typeof idToken !== 'string') {
    return { success: false, error: 'Invalid or missing ID token' };
  }

  const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days

  try {
    // Create the session cookie from the Firebase ID token
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    const cookieStore = await cookies();

    // Set the cookie for server-side authentication
    cookieStore.set('__session', sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: expiresIn / 1000,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error creating session cookie:', error);
    return { success: false, error: 'Failed to create session' };
  }
}

/**
 * Clears the session cookie.
 */
export async function signOutAction() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('__session');

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting session cookie:', error);
    return { success: false, error: 'Failed to clear session' };
  }
}
