export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { runBiweeklyPromotion } from '@/server/actions/cron-jobs';

export async function GET(request: Request) {
  const isDev = process.env.NODE_ENV === 'development';
  const isCron = request.headers.get('X-Appengine-Cron') === 'true';

  if (!isDev && !isCron) {
    return NextResponse.json(
      { status: 'skipped', message: 'Not an authorized cron job request.' },
      { status: 403 }
    );
  }

  try {
    const result = await runBiweeklyPromotion();
    const httpStatus = result.success ? 200 : 500;

    return NextResponse.json(result, { status: httpStatus });

  } catch (error: any) {
    console.error('Biweekly promotion cron failed:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
