export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { runGlobalCleanup } from '@/server/actions/cleanup-jobs';

/**
 * DAILY MAINTENANCE CRON
 * Purges expired and stale data to keep Firestore performant.
 */
export async function GET(request: Request) {
  const isDev = process.env.NODE_ENV === 'development';
  const isCron = request.headers.get('X-Appengine-Cron') === 'true';

  // Security: Only allow official cron or manual dev calls
  if (!isDev && !isCron) {
    return NextResponse.json(
      { status: 'denied', message: 'Not authorized.' },
      { status: 403 }
    );
  }

  try {
    const result = await runGlobalCleanup();
    const httpStatus = result.success ? 200 : 500;

    return NextResponse.json(result, { status: httpStatus });
  } catch (error: any) {
    console.error('Cleanup cron failed:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
