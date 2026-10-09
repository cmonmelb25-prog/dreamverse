export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 180;

import { NextResponse } from 'next/server';
import { db, adminAuth, adminApp } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { chat } from '@/ai/flows/chat/chat-sequence-flow';
import { normalizeAIGirl } from '@/lib/normalizeAIGirl';
import { getOrInitializeRelationship } from '@/lib/server/relationships';
import { callVoices } from '@/server/call-voices';
import { normalizeRelationship } from '@/lib/normalizeRelationship';
import { ai } from '@/ai/genkit';
import { processInteraction } from '@/server/actions/process-interaction';
import { sendPushNotification } from '@/server/actions/send-push-notification';
import { allGirls } from '@/lib/server/girls-data';
import { v4 as uuidv4 } from 'uuid';
import { getCanonicalGirlId, serializeFirestore } from '@/lib/utils';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
const ELEVENLABS_TTS_MODEL = 'eleven_multilingual_v2';

function getVoiceIdForGirl(girlId: string) {
  const config = callVoices[girlId.toLowerCase()];
  return config?.tts?.voiceId || process.env.ELEVENLABS_VOICE_ID!;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 120000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

/**
 * UNIFIED VOICE PIPELINE ROUTE
 * HARDENED: Absolute Identity Sovereignty (AIS) Synchronization.
 * ENSURES: All traits (style, hobbies, interests, occupation) are passed to AIS engine.
 */
export async function POST(req: Request) {
  try {
    if (!adminAuth || !db || !adminApp) throw new Error('Firebase Admin not initialized');

    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    if (!bucketName) throw new Error('Missing storage bucket configuration');

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;
    const idToken = formData.get('idToken') as string | null;
    const rawPayload = formData.get('payload') as string | null;

    if (!audioFile || !idToken || !rawPayload) {
      return NextResponse.json({ success: false, error: 'Missing configuration payloads' }, { status: 400 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawPayload);
    } catch (e) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const { userId, recipientId } = payload || {};
    const decoded = await adminAuth.verifyIdToken(idToken);
    if (decoded.uid !== userId) return NextResponse.json({ success: false, error: 'Auth mismatch' }, { status: 403 });

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const bucket = getStorage(adminApp).bucket(bucketName);
    const nowTimestamp = Date.now();

    const isAiRecipient = allGirls.some(g => g.id.toLowerCase() === recipientId.toLowerCase());

    if (!isAiRecipient) {
      const expiresAt = Timestamp.fromMillis(nowTimestamp + 12 * 60 * 60 * 1000);
      const messengerChatId = [userId, recipientId].sort().join('_');
      const voicePath = `messenger-voice/${userId}/${nowTimestamp}.webm`;
      const file = bucket.file(voicePath);
      const downloadToken = uuidv4();

      await file.save(buffer, {
        metadata: { contentType: 'audio/webm;codecs=opus', metadata: { firebaseStorageDownloadTokens: downloadToken } },
        resumable: false
      });

      const voiceUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(voicePath)}?alt=media&token=${downloadToken}`;

      const batch = db.batch();
      const chatRef = db.collection('messenger').doc(messengerChatId);
      const messageRef = chatRef.collection('messages').doc();

      batch.set(messageRef, {
        sender: userId,
        text: '',
        mediaUrl: voiceUrl,
        type: 'audio',
        expiresAt,
        isEncrypted: true,
        timestamp: FieldValue.serverTimestamp(),
        createdAt: nowTimestamp
      });

      batch.set(chatRef, { participantIds: [userId, recipientId].sort(), updatedAt: FieldValue.serverTimestamp(), lastMessage: { text: 'Sent a voice message', timestamp: FieldValue.serverTimestamp(), senderId: userId } }, { merge: true });

      await batch.commit();
      return NextResponse.json({ success: true, mode: 'messenger' });
    }

    const aiGirlId = getCanonicalGirlId(recipientId) || recipientId;
    const aiChatId = `${aiGirlId}_${userId}`;

    const runAiPipeline = async () => {
      let sessionRef = db.collection('chat').doc(aiChatId);
      let msgRef = sessionRef.collection('messages');

      try {
        const voicePath = `voice-messages/${userId}/${nowTimestamp}.webm`;
        const file = bucket.file(voicePath);
        const downloadToken = uuidv4();

        await file.save(buffer, {
          metadata: { contentType: 'audio/webm;codecs=opus', metadata: { firebaseStorageDownloadTokens: downloadToken } },
          resumable: false
        });

        const userVoiceUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(voicePath)}?alt=media&token=${downloadToken}`;
        await sessionRef.set({ isTyping: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        
        const userMsgRef = await msgRef.add({ sender: userId, text: '...', mediaUrl: userVoiceUrl, type: 'audio', timestamp: FieldValue.serverTimestamp(), createdAt: nowTimestamp, userId, girlId: aiGirlId });

        let userText = '';
        try {
          const base64 = buffer.toString('base64');
          const sttResult = await ai.generate({ model: 'googleai/gemini-2.5-flash', messages: [{ role: 'user', content: [{ text: 'Transcribe audio. Return ONLY spoken text.' }, { media: { url: `data:audio/webm;base64,${base64}`, contentType: 'audio/webm' } }] }] });
          userText = sttResult.text || '(inaudible)';
        } catch (err) { userText = '(inaudible)'; }
        await userMsgRef.update({ text: userText });

        const [girlDoc, relationshipRaw, userDoc] = await Promise.all([
          db.collection('aiGirls').doc(aiGirlId).get(),
          getOrInitializeRelationship(userId, aiGirlId),
          db.collection('users').doc(userId).get()
        ]);

        const girlData = normalizeAIGirl({ id: aiGirlId, ...girlDoc.data() } as any);
        const relationship = normalizeRelationship(relationshipRaw);
        const userProfile = userDoc.data();
        const resolvedName = userProfile?.displayName || userProfile?.username || 'User';

        const historySnap = await msgRef.orderBy('createdAt', 'desc').limit(100).get();
        const history = historySnap.docs.map(d => ({ id: d.id, ...d.data() } as any)).reverse();

        const flowResult = await chat(serializeFirestore({
          message: userText,
          isVoiceMessage: true,
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
            media: { imageGallery: girlData.media?.imageGallery || [], exclusiveGallery: girlData.media?.exclusiveGallery || [] },
          },
          relationship: {
            level: relationship.relationshipTier,
            xp: relationship.relationshipStats.xp,
            emotionalState: relationship.emotionalState,
            silenceHours: relationship.silenceHours,
            userProfileMemory: relationship.userProfileMemory,
            recentInteractions: relationship.recentInteractions
          },
          user: { id: userId, name: resolvedName, vipStatus: userProfile?.vipTier || 'non-vip', relationshipStatus: relationship.isOfficial ? 'official' : 'single' },
          history: history.map((m: any) => ({ role: m.sender === aiGirlId ? 'assistant' : 'user', content: m.text || undefined, mediaUrl: m.mediaUrl, type: m.type }))
        }));

        const voiceId = getVoiceIdForGirl(aiGirlId);

        for (let i = 0; i < flowResult.replies.length; i++) {
          const reply = flowResult.replies[i];
          const now = Date.now() + i;
          let aiVoiceUrl: string | null = null;

          if (reply.text && reply.text.length > 0 && ELEVENLABS_API_KEY) {
            try {
              const ttsRes = await fetchWithTimeout(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, { method: 'POST', headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ text: reply.text, model_id: ELEVENLABS_TTS_MODEL, voice_settings: { stability: 0.5, similarity_boost: 0.85, style: 0.45 } }) });
              if (ttsRes.ok) {
                const audioBufferTts = Buffer.from(await ttsRes.arrayBuffer());
                const aiVoicePath = `voice-responses/${aiGirlId}/${now}-${i}.mp3`;
                const aiVoiceFile = bucket.file(aiVoicePath);
                const aiDownloadToken = uuidv4();
                await aiVoiceFile.save(audioBufferTts, { metadata: { contentType: 'audio/mpeg', metadata: { firebaseStorageDownloadTokens: aiDownloadToken } }, resumable: false });
                aiVoiceUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(aiVoicePath)}?alt=media&token=${aiDownloadToken}`;
              }
            } catch (ttsErr) {}
          }

          await msgRef.add({ sender: aiGirlId, text: reply.text || '', mediaUrl: aiVoiceUrl || reply.mediaUrl || null, type: aiVoiceUrl ? 'audio' : (reply.mediaUrl ? 'image' : 'text'), timestamp: FieldValue.serverTimestamp(), createdAt: now, mood: reply.mood || flowResult.newMood || null, userId, girlId: aiGirlId });
          await sessionRef.set({ updatedAt: FieldValue.serverTimestamp(), lastMessage: { text: reply.text || 'Sent audio', sender: aiGirlId, senderId: aiGirlId, timestamp: FieldValue.serverTimestamp() } }, { merge: true });
          if (i < flowResult.replies.length - 1) await new Promise(r => setTimeout(r, reply.delayMs || 1500));
        }
        await processInteraction(userId, aiGirlId, { type: 'chat', xpChange: flowResult.xpChange || 1, topic: 'voice chat', inferredUserTone: flowResult.inferredUserTone, newMood: flowResult.newMood });
      } catch (err) {} finally { await sessionRef.set({ isTyping: false, updatedAt: FieldValue.serverTimestamp() }, { merge: true }).catch(() => {}); }
    };
    runAiPipeline();
    return NextResponse.json({ success: true, mode: 'ai_chat' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'Voice failure' }, { status: 500 });
  }
}
