'use server';

import { db, adminAuth } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { createNotification } from './create-notification';

interface SendMessagePayload {
  chatId: string;
  senderId: string;
  recipientId: string;
  text: string;
  mediaUrl: string | null;
  type?: 'text' | 'image' | 'video' | 'audio' | 'system';
}

const MESSENGER_RETENTION_MS = 12 * 60 * 60 * 1000;

export async function sendMessengerMessageAction(payload: SendMessagePayload) {
  const {
    chatId,
    senderId,
    recipientId,
    text,
    mediaUrl,
    type = 'text'
  } = payload;

  if (!db || !adminAuth) {
    return { success: false, error: 'Server not fully initialized' };
  }

  try {
    // ✅ FIX: enforce ONE canonical chatId for BOTH users
    const normalizedChatId = [senderId, recipientId].sort().join('_');

    const threadRef = db.collection('messenger').doc(normalizedChatId);
    const messagesRef = threadRef.collection('messages');

    const msgId = messagesRef.doc().id;

    const serverTime = FieldValue.serverTimestamp();
    const nowMs = Date.now();

    const expiresAt = Timestamp.fromMillis(nowMs + MESSENGER_RETENTION_MS);

    // 1. message write
    await messagesRef.doc(msgId).set({
      id: msgId,
      chatId: normalizedChatId, // ✅ FIXED (was unsafe chatId)
      sender: senderId,
      recipient: recipientId,
      text: text || '',
      mediaUrl,
      type,
      delivered: false,
      read: false,
      expiresAt,
      isEncrypted: true,
      timestamp: serverTime,
      createdAt: nowMs
    });

    // 2. thread metadata
    await threadRef.set(
      {
        participantIds: [senderId, recipientId].sort(),
        updatedAt: serverTime,
        lastMessage: {
          text: type === 'system'
            ? text
            : (mediaUrl ? 'Sent an attachment' : 'Sent an encrypted message'),
          timestamp: serverTime,
          senderId
        }
      },
      { merge: true }
    );

    // 3. notification
    if (senderId !== recipientId) {
      try {
        const senderDoc = await adminAuth.getUser(senderId);

        await createNotification({
          recipientId,
          senderId,
          actor: {
            id: senderId,
            name: senderDoc.displayName || 'Someone',
            profileImageUrl: senderDoc.photoURL || ''
          },
          type: 'messenger_message',
          message: 'Sent you an encrypted message',
          relatedChatId: normalizedChatId // ✅ FIXED consistency
        });
      } catch (notifErr) {
        console.warn('[Messenger/Unified] Notification skipped:', notifErr);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('sendMessengerMessageAction ERROR:', error);
    return { success: false, error: 'Failed to deliver message' };
  }
}