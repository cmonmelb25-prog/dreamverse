'use server';

import { db } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

function getChatId(a: string, b: string) {
  return [a, b].sort().join('_');
}

function createSystemMessage(tx: any, messagesRef: any, text: string, extra: any = {}) {
  const messageRef = messagesRef.doc();
  const nowMs = Date.now();
  const expiresAt = Timestamp.fromMillis(nowMs + 12 * 60 * 60 * 1000);
  
  tx.set(messageRef, {
    sender: 'system',
    text,
    type: 'system',
    timestamp: FieldValue.serverTimestamp(),
    createdAt: nowMs,
    expiresAt,
    isEncrypted: true, 
    ...extra
  });
}

function logCallToHistory(tx: any, callerId: string, recipientId: string, mode: 'voice' | 'video', status: 'ended' | 'missed' | 'rejected' | 'no answer', duration: number) {
  const callerLogRef = db.collection('users').doc(callerId).collection('calls').doc();
  const recipientLogRef = db.collection('users').doc(recipientId).collection('calls').doc();
  const timestamp = FieldValue.serverTimestamp();

  tx.set(callerLogRef, {
    otherId: recipientId,
    type: mode,
    status,
    duration,
    timestamp
  });

  tx.set(recipientLogRef, {
    otherId: callerId,
    type: mode,
    status,
    duration,
    timestamp
  });
}

export async function initiateMessengerCallAction({
  callerId,
  recipientId,
  callerName,
  callerImage,
  mode
}: {
  callerId: string;
  recipientId: string;
  callerName: string;
  callerImage?: string | null;
  mode: 'voice' | 'video';
}) {
  if (!db) {
    return { success: false, error: 'Database service unavailable.' };
  }

  try {
    const existingSnap = await db.collection('messengerCalls')
      .where('participants', 'array-contains', callerId)
      .get();
    
    const activeCall = existingSnap.docs.find(d => {
        const data = d.data();
        const isTargetMatch = data.participants.includes(recipientId);
        const isActive = !['ended', 'rejected', 'missed', 'no answer'].includes(data.status);
        return isTargetMatch && isActive;
    });

    if (activeCall) {
        return { success: true, callId: activeCall.id };
    }

    const callRef = db.collection('messengerCalls').doc();
    const callId = callRef.id;

    const callData = {
      id: callId,
      callerId,
      recipientId,
      callerName,
      callerImage: callerImage || null,
      mode,
      status: 'ringing' as const,
      participants: [callerId, recipientId],
      isEncrypted: true, 
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await callRef.set(callData);

    return { success: true, callId };
  } catch (error: any) {
    console.error('initiateMessengerCallAction ERROR:', error);
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

export async function endMessengerCallAction(
  callId: string,
  stats?: {
    duration?: number;
    status?: 'missed' | 'rejected' | 'ended' | 'no answer';
  }
) {
  if (!db) return { success: false };

  const callRef = db.collection('messengerCalls').doc(callId);

  try {
    const signalsSnap = await callRef.collection('signals').get();

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(callRef);

      if (!snap.exists) return;

      const data = snap.data() as {
        callerId: string;
        recipientId: string;
        mode: 'voice' | 'video';
        status?: string;
      };

      const chatId = getChatId(data.callerId, data.recipientId);
      const modeText = data.mode === 'video' ? 'Video' : 'Voice';
      const duration = stats?.duration ?? 0;
      const status = stats?.status ?? 'ended';

      const messagesRef = db
        .collection('messenger')
        .doc(chatId)
        .collection('messages');

      if (status === 'rejected') {
        const logText = `Declined ${modeText.toLowerCase()} call`;
        createSystemMessage(tx, messagesRef, logText, {
            callerId: data.callerId,
            recipientId: data.recipientId,
            status: 'rejected'
        });
        updateChatPreview(tx, chatId, logText);
      } else if (status === 'no answer') {
        const logText = `No answer`;
        createSystemMessage(tx, messagesRef, logText, {
            callerId: data.callerId,
            recipientId: data.recipientId,
            status: 'no answer'
        });
        updateChatPreview(tx, chatId, logText);
      } else if (status === 'ended') {
        const mins = Math.floor(duration / 60);
        const secs = duration % 60;
        const logText = `${modeText} call ended (${mins}:${secs.toString().padStart(2, '0')})`;
        createSystemMessage(tx, messagesRef, logText, { 
            duration,
            callerId: data.callerId,
            recipientId: data.recipientId,
            status: 'ended'
        });
        updateChatPreview(tx, chatId, logText);
      } else {
        const logText = `Missed ${data.mode} call`;
        createSystemMessage(tx, messagesRef, logText, { 
          callerId: data.callerId,
          recipientId: data.recipientId,
          callMode: data.mode,
          status: 'missed'
        });

        updateChatPreview(tx, chatId, logText);
      }

      logCallToHistory(tx, data.callerId, data.recipientId, data.mode, status, duration);

      signalsSnap.docs.forEach(doc => tx.delete(doc.ref));
      tx.delete(callRef);
    });

    return { success: true };
  } catch (error: any) {
    console.error('endMessengerCallAction ERROR:', error);
    return {
      success: false,
      error: error?.message || 'Failed to end call',
    };
  }
}

function updateChatPreview(tx: any, chatId: string, logText: string) {
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
}
