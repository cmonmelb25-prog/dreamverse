
'use server';

import { db, adminAuth as auth } from '@/lib/firebase-admin';
import type { Reel, AuthorSnapshot } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { serializeFirestore, isVideoUrl, nuclearSerialize } from '@/lib/utils';
import { getGirl } from '@/lib/server/girls';

/**
 * HARDENED: Create Reel Server Action
 * STABILITY: Uses serverTimestamp exclusively to prevent machine-clock drift errors.
 * GALLERY SYNC: Ensures uploaded video is saved to the user's or Resident's permanent gallery.
 */
export async function createReel({
  videoUrl,
  caption,
  actingAsId,
  userId,
}: {
  videoUrl: string;
  caption: string;
  actingAsId: string | null;
  userId: string;
}): Promise<{ success: boolean; reel?: Reel; error?: string }> {
  if (!db || !auth) {
    return { success: false, error: 'Database not initialized.' };
  }

  try {
    let author: AuthorSnapshot;
    let actorId: string;
    let actorType: 'girl' | 'user';
    let realUserId: string | null = null;

    // Acting as an AI girl
    if (actingAsId) {
      const girl = await getGirl(actingAsId);
      if (!girl) throw new Error('Girl to act as not found.');

      author = {
        id: girl.id,
        name: girl.name,
        promotionTier: girl.promotionTier || 'non-vip',
        profileImageUrl: girl.media.profileImageUrl || '',
        role: 'aigirl',
        currentMood: girl.currentMood || 'Neutral',
        nationality: girl.nationality || 'American'
      };

      actorId = girl.id;
      actorType = 'girl';
      realUserId = userId; // admin acting as girl

      // AUTOMATIC RESIDENT GALLERY SAVE
      if (videoUrl) {
        const girlRef = db.collection('aiGirls').doc(actingAsId);
        const girlDoc = await girlRef.get();
        if (girlDoc.exists) {
          const gData = girlDoc.data();
          const currentGallery = gData?.media?.imageGallery || [];
          // Prepend new video and limit to 24 items
          const updatedGallery = [videoUrl, ...currentGallery.filter((url: string) => url !== videoUrl)].slice(0, 24);
          await girlRef.update({
            'media.imageGallery': updatedGallery
          });
        }
      }
    }

    // Posting as a normal user
    else {
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) throw new Error('User not found.');
      const userData = userDoc.data() as any;
      const vipStatus = userData.vipTier || 'non-vip';
      
      author = {
        id: userId,
        name: userData.displayName || 'User',
        vipTier: vipStatus as 'non-vip' | 'vip',
        profileImageUrl: userData.photoURL || '',
        role: 'user',
        currentMood: 'Neutral',
        nationality: userData.nationality || 'American',
        isAdmin: userData.isAdmin === true
      };

      actorId = userId;
      actorType = 'user';
      realUserId = null;

      // AUTOMATIC USER GALLERY SAVE (LIMIT 4)
      if (videoUrl) {
        const currentVideos = userData.galleryVideos || [];
        const updatedVideos = [videoUrl, ...currentVideos.filter((v: string) => v !== videoUrl)].slice(0, 4);
        await userRef.update({
          galleryVideos: updatedVideos
        });
      }
    }

    // Firestore document
    const newReelData = {
      videoUrl,
      caption,
      author: serializeFirestore(author),
      actorId,
      actorType,
      realUserId,
      timestamp: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      likes: [],
      comments: [],
    };

    const docRef = await db.collection('reels').add(newReelData);
    const createdReelSnapshot = await docRef.get();
    
    const createdReel = nuclearSerialize({
      id: docRef.id,
      ...createdReelSnapshot.data()
    }) as Reel;

    revalidatePath('/reels');
    revalidatePath('/feed');
    revalidatePath(`/profile/${author.id}`);

    return { success: true, reel: createdReel };
  } catch (error: any) {
    console.error('Error creating reel:', error);
    return { success: false, error: error.message || 'Failed to create reel.' };
  }
}
