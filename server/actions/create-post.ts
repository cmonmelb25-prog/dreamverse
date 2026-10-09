'use server';
import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { AuthorSnapshot, FeedPost, LinkPreview } from '@/lib/types';
import { getGirl } from '@/lib/server/girls';
import { serializeFirestore, nuclearSerialize, isValidMediaUrl } from '@/lib/utils';
import { revalidatePath } from 'next/cache';

interface CreatePostParams {
  authorId: string;
  actingAsId: string | null;
  content: string;
  mediaUrl?: string;
  mediaPath?: string;
  targetUserId?: string | null;
  linkPreview?: LinkPreview;
}

/**
 * HARDENED: Create Post Server Action
 * PERSISTENCE: Now stores LinkPreview data for Hyper-Link Perception.
 * PROTOCOL: Absolute Narrative Horizon (ANH). Removed all string-reduction logic.
 */
export async function createPostAction(params: CreatePostParams): Promise<{ success: boolean; post?: FeedPost; error?: string }> {
    if (!db) {
      return { success: false, error: 'Database not initialized.' };
    }

    try {
      const { authorId, actingAsId, content, mediaUrl, mediaPath, targetUserId, linkPreview } = params;
      
      if (!authorId) throw new Error("Missing author identifier.");
  
      let author: AuthorSnapshot;
      const nowMs = Date.now();
  
      if (actingAsId) {
        const girlResult = await getGirl(actingAsId);
        if (!girlResult) throw new Error("AI resident not found.");
        const girl = girlResult as any;
        
        author = {
          id: girl.id,
          name: girl.name,
          promotionTier: girl.promotionTier || 'non-vip',
          profileImageUrl: girl.media?.profileImageUrl || girl.profileImageUrl || '',
          role: "aigirl",
          currentMood: girl.currentMood || 'Neutral',
          isAdmin: false,
          nationality: girl.nationality || 'American'
        };

        if (mediaUrl && isValidMediaUrl(mediaUrl)) {
           const girlRef = db.collection('aiGirls').doc(actingAsId);
           const girlDoc = await girlRef.get();
           if (girlDoc.exists) {
              const gData = girlDoc.data();
              const currentGallery = gData?.media?.imageGallery || [];
              const updatedGallery = [mediaUrl, ...currentGallery.filter((url: string) => url !== mediaUrl)].slice(0, 24);
              await girlRef.update({ 'media.imageGallery': updatedGallery });
           }
        }
      } else {
        const userRef = db.collection("users").doc(authorId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) throw new Error("User profile not found.");
        const userData = userDoc.data() as any;
        
        author = {
          id: userData.uid || authorId,
          name: userData.displayName || userData.username || "Friend",
          vipTier: (userData.vipTier || 'non-vip') as 'non-vip' | 'vip',
          profileImageUrl: userData.photoURL || userData.profileImageUrl || '',
          profileImagePath: userData.profileImagePath || null,
          role: "user",
          currentMood: "Neutral",
          isAdmin: userData.isAdmin === true,
          nationality: userData.nationality || ''
        };

        if (mediaUrl && isValidMediaUrl(mediaUrl)) {
          const currentImages = userData.galleryImages || [];
          const updatedImages = [mediaUrl, ...currentImages.filter((img: string) => img !== mediaUrl)].slice(0, 12);
          await userRef.update({ galleryImages: updatedImages });
        }
      }
  
      const postData = {
        author: serializeFirestore(author),
        authorId: author.id,
        content: content || '',
        mediaUrl: typeof mediaUrl === "string" ? mediaUrl : null,
        mediaPath: typeof mediaPath === "string" ? mediaPath : null,
        linkPreview: linkPreview ? serializeFirestore(linkPreview) : null,
        timestamp: FieldValue.serverTimestamp(),
        createdAt: nowMs,
        updatedAt: FieldValue.serverTimestamp(),
        reactions: {},
        comments: [],
        isPinned: false,
        targetUserId: targetUserId || null,
        actorType: author.role === 'aigirl' ? 'girl' : 'user'
      };
  
      const docRef = await db.collection('posts').add(postData);
      const postSnap = await docRef.get();
      const data = postSnap.data()!;
      
      const createdPost = nuclearSerialize({ id: docRef.id, ...data }) as FeedPost;
  
      revalidatePath('/feed');
      revalidatePath(`/profile/${author.id}`);
      
      return { success: true, post: createdPost };
  
    } catch (error: any) {
      console.error("[createPostAction] CRITICAL ERROR:", error.message);
      return { success: false, error: error.message || "Failed to create post." };
    }
}
