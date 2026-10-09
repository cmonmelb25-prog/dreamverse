import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase-admin';

/**
 * API Route: Set session token
 * Converts Firebase ID token → secure session cookie
 */

const FIVE_DAYS = 60 * 60 * 24 * 5 * 1000;

export async function POST(req: Request) {
  try {
    console.log('[API/Session] POST started');

    const body = await req.json().catch(() => null);

    if (!body?.token) {
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 400 }
      );
    }

    if (!adminAuth) {
      return NextResponse.json(
        { error: 'Auth service unavailable' },
        { status: 500 }
      );
    }

    // 1. Create session cookie from Firebase ID token
    let sessionCookie: string;

    try {
      sessionCookie = await adminAuth.createSessionCookie(body.token, {
        expiresIn: FIVE_DAYS,
      });
    } catch (err: any) {
      console.error('[API/Session] Invalid token:', err?.message);
      return NextResponse.json(
        { error: 'Token validation failed' },
        { status: 401 }
      );
    }

    // 2. Set cookie safely for BOTH localhost + network testing
    const cookieStore = await cookies();

    const isProd = process.env.NODE_ENV === 'production';

    cookieStore.set('__session', sessionCookie, {
      httpOnly: true,

      // 🔥 CRITICAL FIX:
      // secure MUST be false on HTTP (LAN / mobile testing)
      secure: isProd,

      // 🔥 FIX:
      // "none" breaks on HTTP, so only use in production HTTPS
      sameSite: isProd ? 'none' : 'lax',

      path: '/',

      // modern browsers prefer maxAge instead of expires
      maxAge: FIVE_DAYS / 1000,
    });

    console.log('[API/Session] SUCCESS: session cookie set');

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[API/Session] CRITICAL ERROR:', err);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Logout / clear session
 */
export async function DELETE() {
  try {
    console.log('[API/Session] DELETE requested');

    const cookieStore = await cookies();

    cookieStore.delete('__session');

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API/Session] DELETE ERROR:', err);

    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}