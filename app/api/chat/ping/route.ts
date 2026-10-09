export const runtime = 'nodejs';
export const maxDuration = 150; 

import { NextResponse } from 'next/server';
import { db, adminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { chatSequenceFlow } from '@/ai/flows/chat/chat-sequence-flow';
import type { Message } from '@/lib/types';
import { getOrInitializeRelationship } from '@/lib/server/relationships';
import { normalizeAIGirl } from '@/lib/normalizeAIGirl';
import { getGirl } from '@/lib/server/girls';
import { processInteraction } from '@/server/actions/process-interaction';
import { normalizeRelationship } from '@/lib/normalizeRelationship';
import { serializeFirestore, getCanonicalGirlId } from '@/lib/utils';
import { createNotification } from '@/server/actions/create-notification';

async function getChatHistory(chatId: string, limit = 15): Promise<Message[]> {
  if (!db) return [];

  const historySnap = await db
    .collection('chat').doc(chatId)
    .collection('messages')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return historySnap.docs
    .map((doc) => {
      const data = doc.data();
      return { ...data, id: doc.id } as Message;
    })
    .reverse();
}

/**
 * CHAT PING WORKER (Spontaneous Messaging)
 * SEQUENTIAL: Delivers bubbles one by one with typing indicator gaps.
 */
export async function POST(req: Request) {
  if (!db || !adminAuth) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 });

  try {
    const body = await req.json();
    let { userId, girlId: rawGirlId } = body;

    if (!userId || !rawGirlId) return NextResponse.json({ error: 'Missing userId or girlId' }, { status: 400 });

    const girlId = getCanonicalGirlId(rawGirlId) || rawGirlId;
    const chatId = `${girlId}_${userId}`;

    const sessionRef = db.collection('chat').doc(chatId);

    // Set typing state for initial spontaneous thought
    await sessionRef.set({ isTyping: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    const [relationshipRaw, girlRaw, userDoc] = await Promise.all([
      getOrInitializeRelationship(userId, girlId),
      getGirl(girlId),
      db.collection('users').doc(userId).get() 
    ]);

    if (!girlRaw) return NextResponse.json({ error: 'Girl not found' }, { status: 404 });

    const history = await getChatHistory(chatId);
    const girlData = normalizeAIGirl(serializeFirestore(girlRaw));
    const relationship = normalizeRelationship(serializeFirestore(relationshipRaw));
    const userProfile = userDoc.data();

    const resolvedName = userProfile?.displayName || userProfile?.username || 'Friend';
    
    const aiPayload = serializeFirestore({
      message: '',
      girl: {
        id: girlData.id,
        name: girlData.name,
        age: girlData.age ?? 25,
        location: girlData.location,
        nationality: girlData.nationality,
        bio: girlData.bio,
        occupation: girlData.occupation ?? 'Resident',
        style: girlData.style || [],
        hobbies: girlData.hobbies || [],
        interests: girlData.interests || [],
        currentMood: girlData.currentMood,
        promotionTier: girlData.promotionTier,
        relationshipStatus: girlData.relationshipStatus,
        relationshipTargetId: girlData.relationshipTargetId,
        media: { 
          imageGallery: girlData.media.imageGallery ?? [],
          exclusiveGallery: girlData.media.exclusiveGallery ?? []
        },
      },
      relationship: {
        level: relationship.relationshipTier,
        xp: relationship.relationshipStats.xp,
        emotionalState: relationship.emotionalState,
        silenceHours: 0,
        userProfileMemory: relationship.userProfileMemory,
        recentInteractions: relationship.recentInteractions
      },
      user: {
        id: userId,
        name: resolvedName,
        vipStatus: userProfile?.vipTier ?? 'non-vip',
        relationshipStatus: userProfile?.relationshipStatus || 'single',
      },
      history: history.map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text?.trim() || undefined,
        mediaUrl: msg.sender === 'user' ? msg.mediaUrl ?? undefined : undefined,
      })),
    });

    const aiResponse = await chatSequenceFlow(aiPayload, "googleai/gemini-2.5-pro");

    if (aiResponse && aiResponse.replies && aiResponse.replies.length > 0) {
      const msgRef = sessionRef.collection('messages');
      const baseReplyKey = `ping-${Date.now()}`;

      for (let index = 0; index < aiResponse.replies.length; index++) {
        const reply = aiResponse.replies[index];
        const now = Date.now();

        await msgRef.add({
          text: reply.text || '',
          sender: 'girl',
          timestamp: FieldValue.serverTimestamp(),
          createdAt: now,
          mood: reply.mood,
          delayMs: reply.delayMs,
          mediaUrl: reply.mediaUrl ?? null,
          userId: userId,
          girlId: girlId,
          aiReplyId: `${baseReplyKey}-${index}`,
        });

        await sessionRef.set({
          userId,
          girlId,
          chatId,
          updatedAt: FieldValue.serverTimestamp(),
          lastMessage: {
            text: reply.text || 'Sent you a message',
            sender: 'girl',
            timestamp: FieldValue.serverTimestamp()
          }
        }, { merge: true });

        // Stagger spontaneous bubbles
        if (index < aiResponse.replies.length - 1) {
            await new Promise(r => setTimeout(r, reply.delayMs || 1500));
        }
      }

      await createNotification({
        recipientId: userId,
        senderId: girlId,
        actor: {
          id: girlData.id,
          name: girlData.name,
          profileImageUrl: girlData.media.profileImageUrl,
        },
        type: 'chat_message',
        message: aiResponse.replies[0]?.text || "Sent you a message",
        relatedChatId: girlId,
      });

      await processInteraction(userId, girlId, {
        type: 'chat',
        xpChange: aiResponse.xpChange ?? 0,
        topic: aiResponse.topic ?? 'spontaneous',
        inferredUserTone: aiResponse.inferredUserTone ?? 'none',
        newMood: aiResponse.newMood ?? girlData.currentMood,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('CHAT PING ERROR:', error);
    return NextResponse.json({ error: 'Chat ping failed' }, { status: 500 });
  } finally {
    if (db) {
        // Reset typing after all spontaneous bubbles are written
        const body = await req.json().catch(() => ({}));
        if (body.userId && body.girlId) {
            const girlId = getCanonicalGirlId(body.girlId) || body.girlId;
            const chatId = `${girlId}_${body.userId}`;
            await db.collection('chat').doc(chatId).set({ isTyping: false }, { merge: true }).catch(() => {});
        }
    }
  }
}
