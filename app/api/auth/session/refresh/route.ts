import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

const COOKIE_NAME = '__session';
const SESSION_EXPIRY_MS = 60 * 60 * 24 * 5 * 1000; // 5 days

export async function POST(req: Request) {
  try {
    if (!adminAuth) {
      return NextResponse.json(
        { error: 'Auth service unavailable' },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);

    if (!body?.token) {
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 400 }
      );
    }

    const sessionCookie = await adminAuth.createSessionCookie(
      body.token,
      { expiresIn: SESSION_EXPIRY_MS }
    );

    const cookieStore = await cookies();

    cookieStore.set(COOKIE_NAME, sessionCookie, {
      httpOnly: true,

      /**
       * 🔥 IMPORTANT FOR MOBILE + LOCAL NETWORK:
       * - localhost works without secure
       * - phone on LAN requires same-site rules + sometimes http fallback
       */
      secure: process.env.NODE_ENV === 'production',

      sameSite: 'lax', // safer than 'none' unless you truly need cross-site
      path: '/',

      maxAge: SESSION_EXPIRY_MS / 1000,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal server error', detail: err?.message },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}