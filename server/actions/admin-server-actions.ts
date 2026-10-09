'use server';

import { db, adminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { getAllGirls } from '@/server/actions/ai';
import { getMoodPostForGirl } from "@/server/emotion/mood-database";
import moodsData from '@/lib/mood-messages.json';
import { runPromotionCycle } from '@/server/actions/promotions';
import { generateQuirkyPost } from '@/ai/handlers/quirky-post';
import { getGeneratedComments } from '@/ai/handlers/comments';
import { allGirls as staticGirlsData } from '@/lib/server/girls-data';
import type { FeedPost } from '@/lib/types';
import { getSafeDate, serializeFirestore } from '@/lib/utils';
import { getOrInitializeRelationship, saveRelationship } from '@/lib/server/relationships';
import { getRelationshipLevelInfo } from '@/lib/relationship-levels';

/**
 * ADMINISTRATIVE TOOLS
 */

export async function grantAdmin(uid: string) {
  if (!adminAuth || !db) return { success: false, error: 'Firebase Admin not initialized.' };
  try {
    const { customClaims } = await adminAuth.getUser(uid);
    await adminAuth.setCustomUserClaims(uid, {
      ...(customClaims || {}),
      admin: true,
    });
    await db.collection('users').doc(uid).set({ isAdmin: true }, { merge: true });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function grantVip(uid: string, tier: 'vip' | 'non-vip') {
  if (!adminAuth || !db) return { success: false, error: 'Firebase Admin not initialized.' };
  try {
    const { customClaims } = await adminAuth.getUser(uid);
    await adminAuth.setCustomUserClaims(uid, {
      ...(customClaims || {}),
      vipTier: tier,
    });
    await db.collection('users').doc(uid).set({ 
      vipTier: tier,
      isVip: tier === 'vip' 
    }, { merge: true });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function banUser(uid: string) {
  if (!adminAuth || !db) return { success: false, error: 'Firebase Admin not initialized.' };
  try {
    await adminAuth.updateUser(uid, { disabled: true });
    await db.collection('users').doc(uid).set({ 
      isBanned: true,
      status: 'offline',
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function manualSetRelationship(params: {
  userId: string;
  girlId: string;
  xp: number;
  isOfficial: boolean;
}) {
  if (!db) return { success: false, error: 'DB not initialized.' };

  try {
    const relationship = await getOrInitializeRelationship(params.userId, params.girlId);
    
    // Update stats
    relationship.xp = params.xp;
    relationship.relationshipStats.xp = params.xp;
    relationship.isOfficial = params.isOfficial;

    // Recalculate Tier
    const levelInfo = getRelationshipLevelInfo(params.xp, params.isOfficial);
    relationship.relationshipTier = levelInfo.name;

    // Persist
    await saveRelationship(params.userId, params.girlId, relationship);

    // If official, update global pointers
    if (params.isOfficial) {
        await Promise.all([
            db.collection('users').doc(params.userId).update({
                relationshipStatus: 'in_relationships',
                partnerIds: FieldValue.arrayUnion(params.girlId),
                relationshipTargetId: params.girlId
            }),
            db.collection('aiGirls').doc(params.girlId).update({
                relationshipStatus: `dating:${params.userId}`,
                relationshipTargetId: params.userId
            })
        ]);
    }

    revalidatePath(`/profile/${params.girlId}`);
    revalidatePath(`/profile/me`);

    return { success: true, message: `Set ${params.girlId} to ${levelInfo.name} (${params.xp} XP) for user ${params.userId}.` };
  } catch (error: any) {
    console.error("manualSetRelationship ERROR:", error);
    return { success: false, error: error.message };
  }
}

export async function seedGirlsDatabase() {
  if (!db) return { success: false, error: 'DB not initialized.' };
  try {
    const batch = db.batch();
    for (const girlConfig of staticGirlsData) {
      const girlRef = db.collection('aiGirls').doc(girlConfig.id);
      
      batch.set(girlRef, { 
        ...girlConfig,
        currentMood: "Neutral", 
        onlineStatus: "offline",
        updatedAt: Date.now()
      }, { merge: true });
    }
    await batch.commit();
    return { success: true, message: `Successfully seeded ${staticGirlsData.length} Residents with full identity context.` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function seedMoodsDatabase() {
  if (!db) return { success: false, error: 'DB not initialized.' };
  try {
    const batch = db.batch();
    const moods = (moodsData as any).moods;
    if (!moods) throw new Error("No moods found in local JSON file.");
    for (const moodKey in moods) {
      const moodDoc = moods[moodKey];
      const docId = moodKey.toLowerCase().trim();
      const moodRef = db.collection('moods').doc(docId);
      batch.set(moodRef, moodDoc, { merge: true });
    }
    await batch.commit();
    return { success: true, message: `Successfully seeded moods into Firestore.` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createRandomPost() {
  if (!db) return { success: false, error: 'DB not initialized.' };
  try {
    const girls = await getAllGirls();
    if (girls.length === 0) return { success: false, error: 'No girls found.' };
    const randomGirl = girls[Math.floor(Math.random() * girls.length)];
    
    const aiData = await generateQuirkyPost({ girlId: randomGirl.id });
    let finalContent = aiData.postContent?.trim() ?? '';
    if (!finalContent || finalContent.includes("trouble thinking") || finalContent.includes("busy right now")) {
      finalContent = await getMoodPostForGirl(randomGirl);
    }

    const oldPostsSnap = await db.collection('posts')
      .where('authorId', '==', randomGirl.id)
      .get();

    if (oldPostsSnap.size >= 10) {
      const sortedDocs = oldPostsSnap.docs.sort((a, b) => {
        const timeA = getSafeDate(a.data().timestamp)?.getTime() || 0;
        const timeB = getSafeDate(b.data().timestamp)?.getTime() || 0;
        return timeB - timeA;
      });

      if (sortedDocs.length >= 10) {
        const batch = db.batch();
        const toDelete = sortedDocs.slice(9);
        toDelete.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
    }

    const postData = {
      authorId: randomGirl.id,
      actorType: 'girl',
      author: { 
        id: randomGirl.id, 
        name: randomGirl.name, 
        profileImageUrl: randomGirl.media.profileImageUrl, 
        role: 'aigirl', 
        currentMood: randomGirl.currentMood, 
        promotionTier: randomGirl.promotionTier || 'non-vip',
        nationality: randomGirl.nationality || 'American'
      },
      content: finalContent,
      mediaUrl: typeof aiData.mediaUrl === "string" ? aiData.mediaUrl : null,
      timestamp: FieldValue.serverTimestamp(),
      reactions: {},
      comments: [],
      isPinned: false,
    };
    const docRef = await db.collection('posts').add(postData);
    revalidatePath('/feed');
    return { success: true, message: `Created post for ${randomGirl.name}.`, postId: docRef.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addInteractionsToRandomPost() {
  if (!db) return { success: false, error: 'DB not initialized.' };
  try {
    const snap = await db.collection('posts').orderBy('timestamp', 'desc').limit(10).get();
    if (snap.empty) return { success: true, message: 'No posts found.' };
    
    const posts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeedPost));
    const postToCommentOn = posts.find(p => !p.comments || p.comments.length === 0) || posts[0];
    
    const allGirlsList = await getAllGirls();
    const friendGirls = allGirlsList
      .filter(g => g.id !== postToCommentOn.author.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
      
    const generated = await getGeneratedComments(postToCommentOn, friendGirls.map(g => g.id));
    if (!generated || generated.length === 0) return { success: true, message: 'No comments generated.' };
    
    const newComments = generated.map((c: any) => {
      const author = friendGirls.find(g => g.id === c.authorId);
      return { 
        id: crypto.randomUUID(), 
        postId: postToCommentOn.id, 
        actorId: author!.id, 
        actorType: 'girl', 
        author: { 
          id: author!.id, 
          name: author!.name, 
          profileImageUrl: author!.media.profileImageUrl, 
          role: 'aigirl', 
          currentMood: author!.currentMood, 
          promotionTier: author!.promotionTier,
          nationality: author!.nationality || 'American'
        }, 
        text: c.commentText!, 
        reactions: {}, 
        timestamp: FieldValue.serverTimestamp(), 
        parentId: null 
      };
    });
    
    await db.collection('posts').doc(postToCommentOn.id).update({ 
      comments: FieldValue.arrayUnion(...newComments) 
    });
    
    revalidatePath('/feed');
    return { success: true, message: `Added ${newComments.length} interactions.` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function clearAllPosts() {
  if (!db) return { success: false, error: 'DB not initialized.' };
  const snap = await db.collection('posts').get();
  const batch = db.batch();
  snap.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  revalidatePath('/feed');
  return { success: true, message: 'All posts cleared.' };
}
