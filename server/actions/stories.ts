'use server';

import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

/**
 * Utility: consistent chat ID cross-reference generation
 */
function getChatId(a: string, b: string): string {
  return [a, b].sort().join('_');
}

interface CreateStoryProps {
  actorId: string;
  actorType: 'User' | 'AIGirl';
  mediaUrl: string;
  caption?: string;
  durationSeconds?: number;
  recipientId?: string; // Optional: Pass this to instantly update a specific cross-user messenger thread cache map
}

/**
 * Creates a new Story in Firestore and syncs its state back to related Messenger feeds.
 */
export async function createStoryAction({
  actorId,
  actorType,
  mediaUrl,
  caption,
  durationSeconds = 15,
  recipientId,
}: CreateStoryProps) {
  if (!db) {
    return { success: false, error: 'Database service unavailable.' };
  }

  try {
    const batch = db.batch();

    // 1. Generate core document reference inside global archive
    const storyRef = db.collection('stories').doc();
    
    const storyData = {
      id: storyRef.id,
      actorId,
      actorType,
      mediaUrl,
      caption: caption || '',
      uploadedAt: FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Hardens analytical queries with an absolute 24-hour expiry date marker
      durationSeconds,
      timestamp: FieldValue.serverTimestamp(),
    };

    batch.set(storyRef, storyData);

    // 2. UNIFICATION ROUTE: Sync the state down to the conversational channel map
    if (recipientId) {
      const chatId = getChatId(actorId, recipientId);
      const messengerRef = db.collection('messenger').doc(chatId);

      batch.set(
        messengerRef,
        {
          updatedAt: FieldValue.serverTimestamp(),
          hasActiveStory: {
            [actorId]: true, // Flags that this specific participant has a live story unviewed trace
            lastStoryUrl: mediaUrl,
            uploadedAt: FieldValue.serverTimestamp()
          }
        },
        { merge: true }
      );
    }

    // Atomically execute both operations to prevent database state desyncs
    await batch.commit();
    
    // Revalidate relevant cached Next.js route layers
    revalidatePath('/messages');
    revalidatePath('/reels');

    return { 
      success: true, 
      id: storyRef.id 
    };
  } catch (error: any) {
    console.error('Error creating story execution track:', error);
    return { success: false, error: error.message || 'Unknown database commit write failure.' };
  }
}