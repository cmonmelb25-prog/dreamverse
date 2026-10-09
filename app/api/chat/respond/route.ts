export const runtime = 'nodejs';
export const maxDuration = 300; 

import { db, adminAuth, adminApp } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { chatSequenceFlow } from '@/ai/flows/chat/chat-sequence-flow';
import { getOrInitializeRelationship } from '@/lib/server/relationships';
import { normalizeAIGirl } from '@/lib/normalizeAIGirl';
import { getGirl } from '@/lib/server/girls';
import { processInteraction } from '@/server/actions/process-interaction';
import { normalizeRelationship } from '@/lib/normalizeRelationship';
import { serializeFirestore, detectMediaType } from '@/lib/utils';
import { getCanonicalGirlId } from '@/lib/utils';
import { createNotification } from '@/server/actions/create-notification';
import { autoDetectFacts } from '@/server/actions/relationship-memory';
import { NextResponse } from 'next/server';
import { callVoices } from '@/server/call-voices';
import { v4 as uuidv4 } from 'uuid';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
const ELEVENLABS_TTS_MODEL = 'eleven_multilingual_v2';

function getVoiceIdForGirl(girlId: string) {
  const config = callVoices[girlId.toLowerCase()];
  return config?.tts?.voiceId || process.env.ELEVENLABS_VOICE_ID!;
}

/**
 * CHAT RESPONSE WORKER
 * HARDENED: Absolute Narrative context (100 messages) with ZERO information loss.
 */
export async function POST(req: Request) {
  if (!db || !adminAuth || !adminApp) return NextResponse.json({ error: 'Server not configured' }, { status: 500 });

  let body: any = null;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: 'Empty or invalid JSON body' }, { status: 400 });
  }

  let { girlId: rawGirlId, userId, message, mediaUrl, newMsgId } = body || {};

  if (!rawGirlId || !userId) {
    return NextResponse.json({ error: 'Missing identifiers' }, { status: 400 });
  }

  const girlId = getCanonicalGirlId(rawGirlId) || rawGirlId;
  const chatId = `${girlId}_${userId}`;

  const sessionRef = db.collection('chat').doc(chatId);
  const msgRef = sessionRef.collection('messages');

  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  const isIncomingVoice = mediaUrl && (mediaUrl.includes('audio') || detectMediaType(mediaUrl) === 'audio');

  try {
    if (newMsgId) {
        await new Promise(r => setTimeout(r, 600));
    }

    if (message) {
      await autoDetectFacts(userId, girlId, message).catch(() => {});
    }

    const [historyRaw, girlRaw, relationshipRaw, userDoc] = await Promise.all([
      msgRef.orderBy('createdAt', 'desc').limit(100).get(), 
      getGirl(girlId),
      getOrInitializeRelationship(userId, girlId),
      db.collection('users').doc(userId).get() 
    ]);

    if (!girlRaw) throw new Error('Girl not found');

    const history = historyRaw.docs.map(d => ({ id: d.id, ...d.data() } as any)).reverse();
    const girlData = normalizeAIGirl(serializeFirestore(girlRaw));
    const relationship = normalizeRelationship(serializeFirestore(relationshipRaw));
    const userProfile = userDoc.data();
    const resolvedName = userProfile?.displayName || userProfile?.username || 'Friend';

    const aiPayload = serializeFirestore({
      message,
      mediaUrl: mediaUrl ?? undefined,
      isVoiceMessage: isIncomingVoice,
      currentMessageId: newMsgId,
      girl: {
        id: girlData.id,
        name: girlData.name,
        age: girlData.age ?? 0,
        location: girlData.location,
        nationality: girlData.nationality,
        bio: girlData.bio,
        currentMood: girlData.currentMood,
        media: {
          imageGallery: girlData.media?.imageGallery ?? [],
          exclusiveGallery: girlData.media?.exclusiveGallery ?? []
        }
      },
      relationship: {
        level: relationship.relationshipTier,
        xp: relationship.relationshipStats.xp,
        emotionalState: relationship.emotionalState,
        silenceHours: relationship.silenceHours,
        userProfileMemory: relationship.userProfileMemory,
        recentInteractions: relationship.recentInteractions
      },
      user: {
        id: userId,
        name: resolvedName,
        vipStatus: userProfile?.vipTier ?? 'non-vip',
        relationshipStatus: userProfile?.relationshipStatus || 'single'
      },
     history: history.map((msg: any) => ({
  id: msg.id,
  role: msg.sender === userId ? 'user' : 'assistant',
  content: msg.text || '',
}))
    });

    const aiResponse = await chatSequenceFlow(aiPayload, 'googleai/gemini-2.5-pro');

    if (aiResponse?.replies) {
      const voiceId = getVoiceIdForGirl(girlId);
      const bucket = getStorage(adminApp).bucket(bucketName);

      const baseTimestamp = Date.now();

      for (let i = 0; i < aiResponse.replies.length; i++) {
        const reply = aiResponse.replies[i];
        const nowMs = baseTimestamp + i + 10; 
        const serverTime = FieldValue.serverTimestamp();
        
        let aiVoiceUrl: string | null = null;

        if (isIncomingVoice && reply.text && reply.text.length > 0 && ELEVENLABS_API_KEY && bucketName) {
          try {
            const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
              method: 'POST',
              headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: reply.text,
                model_id: ELEVENLABS_TTS_MODEL,
                voice_settings: { stability: 0.5, similarity_boost: 0.8 }
              })
            });

            if (ttsRes.ok) {
              const audioBuffer = Buffer.from(await ttsRes.arrayBuffer());
              const fileName = `voice-responses/${girlId}/${nowMs}.mp3`;
              const fileRef = bucket.file(fileName);
              const aiDownloadToken = uuidv4();

              await fileRef.save(audioBuffer, {
                metadata: {
                  contentType: 'audio/mpeg',
                  metadata: { firebaseStorageDownloadTokens: aiDownloadToken }
                },
                resumable: false
              });

              aiVoiceUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(fileName)}?alt=media&token=${aiDownloadToken}`;
            }
          } catch (ttsErr) {
            console.warn("[tts-responder] Failed:", ttsErr);
          }
        }

        await msgRef.add({
          text: reply.text || "",
          sender: girlId, 
          timestamp: serverTime,
          createdAt: nowMs, 
          mood: reply.mood ?? aiResponse.newMood ?? girlData.currentMood,
          delayMs: reply.delayMs ?? 1200,
          mediaUrl: aiVoiceUrl || reply.mediaUrl || null,
          type: aiVoiceUrl ? 'audio' : (reply.mediaUrl ? detectMediaType(reply.mediaUrl) : 'text'),
          userId: userId,
          girlId: girlId
        });

        await sessionRef.set({ 
          updatedAt: serverTime,
          lastMessage: {
            text: reply.text || (aiVoiceUrl ? 'Sent a voice message' : 'Sent an attachment'),
            senderId: girlId,
            timestamp: serverTime
          }
        }, { merge: true });

        if (i < aiResponse.replies.length - 1) {
            await new Promise(r => setTimeout(r, reply.delayMs || 1500));
        }
      }

      await createNotification({
        recipientId: userId,
        senderId: girlId,
        actor: { id: girlData.id, name: girlData.name, profileImageUrl: girlData.media.profileImageUrl },
        type: 'chat_message',
        message: aiResponse.replies[0]?.text || 'Sent you a message',
        relatedChatId: girlId
      }).catch(() => {});

      await processInteraction(userId, girlId, {
        type: 'chat',
        xpChange: aiResponse.xpChange ?? 1,
        topic: aiResponse.topic || 'chat interaction',
        inferredUserTone: aiResponse.inferredUserTone || 'unknown',
        newMood: aiResponse.newMood || girlData.currentMood,
      }).catch(() => {});
    }

  } catch (err) {
    console.error('[chat-responder] failure:', err);
  } finally {
    if (db) {
      await sessionRef.set({ isTyping: false, updatedAt: FieldValue.serverTimestamp() }, { merge: true }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}
