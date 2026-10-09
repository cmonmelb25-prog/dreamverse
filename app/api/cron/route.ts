export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import {
  createRandomPost,
  runBiweeklyPromotion,
  seedGirlsDatabase,
  seedMoodsDatabase,
  addInteractionsToRandomPost,
  sendRandomMessage,
  clearAllPosts,
} from '@/server/actions/cron-jobs';

// Map actions to functions so we avoid giant switch blocks
const actions: Record<string, (() => Promise<any>) | undefined> = {
  'create-random-post': createRandomPost,
  'run-biweekly-promotion': runBiweeklyPromotion,
  'seed-girls-database': seedGirlsDatabase,
  'seed-moods-database': seedMoodsDatabase,
  'add-interactions': addInteractionsToRandomPost,
  'send-random-message': sendRandomMessage,
  'clear-all-posts': clearAllPosts,
};

export async function POST(request: Request) {
  try {
    const { action } = await request.json();

    const fn = actions[action];
    if (!fn) {
      return NextResponse.json(
        { success: false, error: `Invalid action: ${action}` },
        { status: 400 }
      );
    }

    const result = await fn();
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Manual cron controller error:', error, error?.stack);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}