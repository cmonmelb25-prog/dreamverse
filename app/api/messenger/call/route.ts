import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Creates a private P2P call signaling document.
 * HARDENED: Checks for existing active calls before creation.
 * HARDENED: Defensively handles empty request bodies.
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

    if (!body) return NextResponse.json({ error: 'Missing payload' }, { status: 400 });

    const {
      callerId,
      recipientId,
      callerName,
      callerImage,
      mode
    } = body;

    if (!callerId || !recipientId || !mode) {
      return NextResponse.json(
        { error: 'Missing fields' },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 500 }
      );
    }

    const existingSnap = await db.collection('messengerCalls')
      .where('participants', 'array-contains', callerId)
      .get();
    
    const activeCall = existingSnap.docs.find(d => {
        const data = d.data();
        return data.participants.includes(recipientId) && !['ended', 'rejected', 'missed'].includes(data.status);
    });

    if (activeCall) {
        return NextResponse.json({
          success: true,
          callId: activeCall.id
        });
    }

    const callRef = db.collection('messengerCalls').doc();
    const callId = callRef.id;

    const callData = {
      id: callId,
      callerId,
      recipientId,
      participants: [callerId, recipientId],
      callerName,
      callerImage: callerImage || null,
      mode,
      status: 'ringing',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    await callRef.set(callData);

    return NextResponse.json({
      success: true,
      callId
    });

  } catch (err: any) {
    console.error('[CALL CREATE ERROR]', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
