import { NextResponse } from 'next/server';
import { getGirl } from '@/lib/server/girls';
import { serializeFirestore } from '@/lib/utils';

/**
 * GET Girl Detail API
 * UPDATED: Handle params as Promise for Next.js 15 compatibility.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ girlId: string }> }
) {
  try {
    const { girlId } = await params;
    if (!girlId) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    
    const normalizedGirlId =
      girlId.charAt(0).toUpperCase() + girlId.slice(1).toLowerCase();

    const girl = await getGirl(normalizedGirlId);
    if (!girl) {
      return NextResponse.json({ error: 'Girl not found' }, { status: 404 });
    }

    return NextResponse.json(serializeFirestore(girl));
  } catch (error) {
    console.error(`Error fetching girl:`, error);
    return NextResponse.json({ error: 'Failed to fetch girl data.' }, { status: 500 });
  }
}
