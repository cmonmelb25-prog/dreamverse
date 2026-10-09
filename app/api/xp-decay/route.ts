export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { runXpDecay } from '@/server/actions/xp-decay';

export async function POST() {
  try {
    const result = await runXpDecay();
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[xp-decay] Error:', error, error?.stack);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}