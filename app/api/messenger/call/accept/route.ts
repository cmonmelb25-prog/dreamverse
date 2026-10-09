import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Transitions a messenger call to 'accepted' state.
 * HARDENED: Defensively handles empty request bodies to prevent JSON parse errors.
 */
export async function POST(req: Request) {
  try {
    let body;
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : null;
    } catch (e) {
      return NextResponse.json({ error: 'Empty or invalid JSON body' }, { status: 400 });
    }

    const { callId } = body || {};

    if (!callId) {
      return NextResponse.json({ error: 'Missing callId' }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 });
    }

    const callRef = db.collection('messengerCalls').doc(callId);
    
    const snap = await callRef.get();
    if (!snap.exists) {
        return NextResponse.json({ error: 'Call no longer active' }, { status: 410 });
    }

    const currentData = snap.data();
    if (currentData?.status === 'ended' || currentData?.status === 'rejected') {
        return NextResponse.json({ error: 'Call already terminated' }, { status: 410 });
    }

    await callRef.update({
      status: 'accepted',
      acceptedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API/Call/Accept] Failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
