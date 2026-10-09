export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { addInteractionsToRandomPost } from '@/server/actions/cron-jobs';

export async function GET(request: Request) {
  const isDev = process.env.NODE_ENV === 'development';
  const isCron = request.headers.get('X-Appengine-Cron') === 'true';

  // Optional admin auth (Firebase ID token)
  const authHeader = request.headers.get('authorization');
  let isAdminUser = false;

  try {
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      const decoded = await adminAuth.verifyIdToken(token);

      // ONLY allow if admin claim exists
      isAdminUser = decoded?.admin === true;
    }
  } catch (err) {
    isAdminUser = false;
  }

  /**
   * SECURITY RULE:
   * Allow ONLY:
   *  - official cron (App Engine / scheduler)
   *  - authenticated admin users
   */
  if (!isDev && !isCron && !isAdminUser) {
    return NextResponse.json(
      {
        status: 'denied',
        message: 'Not authorized to run cron job.',
      },
      { status: 403 }
    );
  }

  try {
    const result = await addInteractionsToRandomPost();

    if (result.success) {
      return NextResponse.json(
        { status: 'ok', message: result.message },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        status: 'error',
        message: result.message,
        error: result.error,
      },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('Cron error in add-interactions:', error);
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }
}