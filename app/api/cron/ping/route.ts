export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { sendRandomMessage } from '@/server/actions/cron-jobs';

/**
 * Cron endpoint for spontaneous AI girl messages.
 * Production requires the App Engine cron header.
 * Development allows manual triggering.
 */
export async function GET(request: Request) {
  const isDev = process.env.NODE_ENV === 'development';
  const isCron = request.headers.get('X-Appengine-Cron') === 'true';

  // Only allow manual calls in development
  if (!isDev && !isCron) {
    return NextResponse.json(
      { status: 'skipped', message: 'Not an authorized cron job request.' },
      { status: 403 }
    );
  }

  try {
    const result = await sendRandomMessage();

    if (result.success) {
      return NextResponse.json(
        { status: 'ok', message: result.message },
        { status: 200 }
      );
    }

    // Logical failures should not cause cron retries
    console.error('Spontaneous message job failed logically:', (result as any).error);
    return NextResponse.json(
      { status: 'error', message: result.message, error: (result as any).error },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Spontaneous message job failed with an exception:', error, error?.stack);
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }
}
