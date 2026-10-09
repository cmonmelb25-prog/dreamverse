export const runtime = 'nodejs';
export const maxDuration = 60;

import { db, adminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { detectMediaType, getCanonicalGirlId } from '@/lib/utils';
import { NextResponse } from 'next/server';

/**
 * CHAT INGRESS API
 * ALIGNED: Uses TitleCase Resident IDs for path consistency.
 */
export async function POST(req: Request) {
  if (!db || !adminAuth) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 });

  try {
    const body = await req.json();
    let { girlId: rawGirlId, userId, message, mediaUrl, clientMessageId } = body;

    if (!rawGirlId || !userId || (!message && !mediaUrl)) {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    }

    // IDENTITY CANONICALIZATION (Critical for real-time visibility)
    const girlId = getCanonicalGirlId(rawGirlId) || rawGirlId;
    const chatId = `${girlId}_${userId}`;

    const sessionRef = db.collection('chat').doc(chatId);
    const msgRef = sessionRef.collection('messages');

    if (clientMessageId) {
      const existing = await msgRef.where('clientMessageId', '==', clientMessageId).limit(1).get();
      if (!existing.empty) return NextResponse.json({ ok: true });
    }

    await msgRef.add({
      text: message || '',
      sender: 'user',
      timestamp: FieldValue.serverTimestamp(),
      createdAt: Date.now(), 
      mediaUrl: typeof mediaUrl === "string" ? mediaUrl : null,
      type: detectMediaType(mediaUrl),
      clientMessageId: clientMessageId || null,
      userId: userId,
      girlId: girlId
    });

    await sessionRef.set({ 
      userId,
      girlId,
      chatId,
      isTyping: true, 
      updatedAt: FieldValue.serverTimestamp(),
      lastMessage: {
        text: message || 'Sent an attachment',
        sender: 'user',
        timestamp: FieldValue.serverTimestamp()
      }
    }, { merge: true });

    // NOTE: Fact extraction is now called synchronously in the /respond route 
    // to prevent race conditions during memory briefing.

    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const host = req.headers.get('host');
    
    fetch(`${protocol}://${host}/api/chat/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ girlId, userId, message, mediaUrl })
    }).catch(err => console.error('[chat-ingress] Failed to trigger responder:', err));

    return NextResponse.json({ ok: true });

  } catch (error: any) {
    console.error('CHAT INGRESS ERROR:', error);
    return NextResponse.json({ error: 'Failed to accept message' }, { status: 500 });
  }
}
