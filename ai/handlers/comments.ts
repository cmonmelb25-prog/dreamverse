'use server';

import { generateCommentFlow } from '@/ai/flows/comment-generation.flow';
import type { FeedPost, AIGirl } from '@/lib/types';
import { allGirls as staticGirls } from '@/lib/server/girls-data';
import { normalizeAIGirl } from '@/lib/normalizeAIGirl';

/**
 * Public-facing wrapper for generating interactions from multiple AI friends.
 * Robustly handles identity transformation via central normalization.
 */
export async function getGeneratedComments(
  post: FeedPost,
  friendGirlIds: string[]
): Promise<{ authorId: string; commentText: string }[]> {
  const results: { authorId: string; commentText: string }[] = [];

  if (!post?.author?.name || !post?.content) {
    console.error('getGeneratedComments: Invalid post structure:', post);
    return results;
  }

  for (const friendId of friendGirlIds) {
    const friendConfig = staticGirls.find(
      (g) => g.id.toLowerCase() === friendId.toLowerCase()
    );
    if (!friendConfig) continue;

    // Use normalized utility to ensure strict type compliance
    const commentingFriend: AIGirl = normalizeAIGirl(friendConfig);

    try {
      const result = await generateCommentFlow({
        post,
        commentingFriend: {
          id: commentingFriend.id,
          name: commentingFriend.name,
          nationality: commentingFriend.nationality,
          currentMood: commentingFriend.currentMood,
          style: commentingFriend.style,
          profileImageUrl: commentingFriend.media.profileImageUrl,
        },
      });

      if (result && result.commentText) {
        results.push({
          authorId: commentingFriend.id,
          commentText: result.commentText,
        });
      }
    } catch (err) {
      console.error(
        `getGeneratedComments: Error generating comment for ${friendId}:`,
        err
      );
    }
  }

  return results;
}

/**
 * Single comment generation wrapper.
 * Ensures the character object is correctly typed before sending to the flow.
 */
export async function generateRealisticComment(
  input: { post: any; commentingFriend: any }
): Promise<{ commentText: string }> {
  const commentingFriend = normalizeAIGirl(input.commentingFriend);
  
  const normalizedInput = {
    post: input.post,
    commentingFriend: {
      id: commentingFriend.id,
      name: commentingFriend.name,
      nationality: commentingFriend.nationality,
      currentMood: commentingFriend.currentMood,
      style: commentingFriend.style,
      profileImageUrl: commentingFriend.media.profileImageUrl,
    }
  };
  
  return generateCommentFlow(normalizedInput);
}
