import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import type { User } from '@/lib/types';
import { serializeFirestore } from '@/lib/utils';

export async function GET(
  request: Request,
  context: { params: { userId: string } }
) {
  const { userId } = context.params;

  if (!db) {
    return NextResponse.json(
      { error: 'Database not initialized' },
      { status: 500 }
    );
  }

  try {
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const raw = userDoc.data()!;
    const userProfile: User = serializeFirestore({
      uid: userId,
      ...raw,
    }) as User;

    return NextResponse.json(userProfile);
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user data.' },
      { status: 500 }
    );
  }
}