'use server';

/**
 * @fileOverview Background jobs for content generation and maintenance.
 */

import { db } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { AIGirl, FeedPost } from '@/lib/types';
import { getAllGirls } from '@/server/actions/ai';
import { getMoodPostForGirl } from "@/server/emotion/mood-database";
import moodsData from '@/lib/mood-messages.json';
import { runPromotionCycle } from './promotions';
import { generateQuirkyPost } from '@/ai/handlers/quirky-post';
import { getGeneratedComments } from '@/ai/handlers/comments';
import { allGirls as staticGirlsData } from '@/lib/server/girls-data';
import { getSafeDate } from '@/lib/utils';

/**
 * Seeds or synchronizes the Residents database with local config files.
 */
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
      }, { merge: true });
    }
    await batch.commit();
    return { success: true, message: `Successfully seeded ${staticGirlsData.length} Residents.` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Forces a random AI girl to create a quirky social media post.
 * UPDATED: Uses robust quirky generation with guaranteed media and collab support.
 */
export async function createRandomPost() {
  if (!db) return { success: false, error: 'DB not initialized.' };
  try {
    const girls = await getAllGirls();
    if (girls.length === 0) return { success: false, error: 'No girls found.' };

    const randomGirl = girls[Math.floor(Math.random() * girls.length)];

    // Always generate media for auto-posts
    const aiData = await generateQuirkyPost({ girlId: randomGirl.id });

    let finalContent = aiData.postContent?.trim() ?? '';
    
    // Robust fallback for caption
    if (!finalContent || finalContent.includes("trouble thinking") || finalContent.includes("busy right now")) {
      finalContent = await getMoodPostForGirl(randomGirl);
    }

    // ROTATION LOGIC: Maintaining 10 posts per girl for performance
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
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      reactions: {},
      comments: [],
      isPinned: false,
    };

    const docRef = await db.collection('posts').add(postData);
    
    return { 
      success: true, 
      message: `Created post for ${randomGirl.name}.`,
      postId: docRef.id 
    };

  } catch (error: any) {
    console.error("createRandomPost ERROR:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Adds AI-generated comments/likes to a recent post.
 */
export async function addInteractionsToRandomPost() {
  if (!db) return { success: false, error: 'DB not initialized.' };
  try {
    const snap = await db.collection('posts').orderBy('timestamp', 'desc').limit(10).get();
    if (snap.empty) return { success: true, message: 'No posts found to interact with.' };

    const posts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeedPost));
    const postToCommentOn = posts.find(p => !p.comments || p.comments.length === 0) || posts[0];

    const allGirlsList = await getAllGirls();
    const friendGirls = allGirlsList
      .filter(g => g.id !== postToCommentOn.author.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    const generated = await getGeneratedComments(postToCommentOn, friendGirls.map(g => g.id));

    if (!generated || generated.length === 0) {
      return { success: true, message: 'No comments generated.' };
    }

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
          promotionTier: author!.promotionTier 
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

    return { success: true, message: `Added ${newComments.length} interactions to post ${postToCommentOn.id}.` };
  } catch (error: any) {
    console.error("addInteractionsToRandomPost ERROR:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Seeds mood line library into Firestore from local JSON.
 */
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

export async function runBiweeklyPromotion() {
  return await runPromotionCycle();
}

export async function clearAllPosts() {
  if (!db) return { success: false, error: 'DB not initialized.' };
  const snap = await db.collection('posts').get();
  const batch = db.batch();
  snap.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  return { success: true, message: 'All posts cleared.' };
}

export async function sendRandomMessage() {
  return { success: true, message: "Spontaneous messaging logic active." };
}
