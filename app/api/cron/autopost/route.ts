export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createRandomPost } from '@/server/actions/cron-jobs';

export async function GET(request: Request) {
  const isDev = process.env.NODE_ENV === 'development';

  if (!isDev && request.headers.get('X-Appengine-Cron') !== 'true') {
    return NextResponse.json(
      { status: 'skipped', message: 'Not a cron job request.' },
      { status: 200 }
    );
  }

  try {
    const result = await createRandomPost();

    if (result.success) {
      return NextResponse.json(
        { status: 'ok', message: result.message },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { status: 'error', message: result.message, error: result.error },
      { status: 500 }
    );

  } catch (error: any) {
    console.error("Error in /api/cron/autopost:", error);
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }
}