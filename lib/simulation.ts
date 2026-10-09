'use server';

import type { AIGirl, FeedPost, Comment, AuthorSnapshot } from './types';
import { getGeneratedComments } from '@/ai/handlers/comments';

/**
 * Simulates a girl making a post.
 */
export async function simulatePost(girl: AIGirl): Promise<FeedPost> {
  const content = `This is a simulated post by ${girl.name}. Her current mood is ${girl.currentMood}. What a day!`;

  const author: AuthorSnapshot = {
    id: girl.id,
    name: girl.name,
    profileImageUrl: girl.media.profileImageUrl,
    role: 'aigirl',
    currentMood: girl.currentMood || 'Neutral',
    promotionTier: girl.promotionTier || 'non-vip',
    nationality: ''
  };

  return {   
    id: `post-${Date.now()}-${Math.random()}`,
    actorId: girl.id,
    actorType: 'girl',
    author,
    content,
    timestamp: new Date().toISOString(),
    reactions: {},
    comments: [],
    mediaUrl: null,
    voiceId: null
  };
}

/**
 * Simulates other AI girls commenting on a post using the emotional engine.
 */
export async function generateCommentsForPost(
  post: FeedPost,
  allGirls: AIGirl[]
): Promise<FeedPost> {
  const friendGirls = allGirls
    .filter((g) => g.id !== post.author.id)
    .sort(() => 0.5 - Math.random())
    .slice(0, Math.floor(Math.random() * 3) + 2);

  if (friendGirls.length === 0) return post;

  const friendGirlIds = friendGirls.map((g) => g.id);

  try {
    const results = await getGeneratedComments(post, friendGirlIds);

    const validComments = results.filter(
      (c): c is NonNullable<typeof c> => Boolean(c) && Boolean(c.commentText)
    );

    if (validComments.length > 0) {
      const newComments: Comment[] = validComments.map((c) => {
        const authorGirl = allGirls.find((g) => g.id === c.authorId);
      
        const name = authorGirl?.name || "Unknown";
        const profileImageUrl = authorGirl?.media.profileImageUrl || "";

        const authorSnapshot: AuthorSnapshot = {
          id: c.authorId,
          name,
          promotionTier: authorGirl?.promotionTier || "vip",
          profileImageUrl,
          role: "aigirl",
          currentMood: authorGirl?.currentMood || 'Neutral',
          nationality: ''
        };

        return {
          id: `comment-${Date.now()}-${Math.random()}`,
          name,
          profileImageUrl,
          author: authorSnapshot,
          actorId: c.authorId,
          actorType: "girl",
          text: c.commentText!,
          reactions: {},
          timestamp: new Date().toISOString(),
          parentId: null,
          replies: []
        };
      });

      return {
        ...post,
        comments: [...(post.comments || []), ...newComments],
      };
    }
  } catch (error) {
    console.error('Failed to generate comments for post:', post.id, error);
  }

  return post;
}
