import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { callId, duration = 0, status } = body || {};

    if (!callId || !status) {
      return NextResponse.json({ error: 'Missing payload fields' }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    const callRef = db.collection('messengerCalls').doc(callId);
    const snap = await callRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    const callData = snap.data();
    if (!callData) {
      return NextResponse.json({ error: 'Invalid call data' }, { status: 500 });
    }

    const chatId = [callData.callerId, callData.recipientId].sort().join('_');
    const modeText = callData.mode === 'video' ? 'Video' : 'Voice';
    
    let logText = '';
    if (status === 'rejected') {
        logText = `Declined ${modeText.toLowerCase()} call`;
    } else if (status === 'no answer') {
        logText = `No answer`;
    } else if (status === 'missed') {
        logText = `Missed ${modeText.toLowerCase()} call`;
    } else {
        logText = `${modeText} call ended (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})`;
    }

    const messagesRef = db.collection('messenger').doc(chatId).collection('messages');
    const expiresAt = Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);

    await db.runTransaction(async (tx) => {
      tx.set(callRef, {
        status,
        duration,
        updatedAt: FieldValue.serverTimestamp(),
        endedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      const messageRef = messagesRef.doc();
      tx.set(messageRef, {
        sender: 'system',
        text: logText,
        type: 'system',
        timestamp: FieldValue.serverTimestamp(),
        createdAt: Date.now(),
        expiresAt,
        isEncrypted: true,
        callerId: callData.callerId,
        recipientId: callData.recipientId,
        status,
      });

      tx.set(
        db.collection('messenger').doc(chatId),
        {
          updatedAt: FieldValue.serverTimestamp(),
          lastMessage: {
            text: logText,
            senderId: 'system',
            timestamp: FieldValue.serverTimestamp(),
          },
        },
        { merge: true }
      );
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API/Call/End] Failed:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}
