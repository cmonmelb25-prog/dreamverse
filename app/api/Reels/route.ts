import { getReels } from '@/server/actions/get-reels';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { reels, error } = await getReels({});

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ reels });
}