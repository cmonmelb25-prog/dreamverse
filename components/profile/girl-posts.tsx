'use client';

import type { SerializableFeedPost } from '@/lib/types';
import PostCard from '@/app/feed/PostCard';

interface GirlPostsProps {
  girlId: string;
  initialPosts: SerializableFeedPost[] | null | undefined;
}

export default function GirlPosts({ girlId, initialPosts }: GirlPostsProps) {
  // Always ensure we have a valid array to prevent runtime map crashes
  const posts = Array.isArray(initialPosts) ? initialPosts : [];
  const hasPosts = posts.length > 0;

  return (
    /* HARDENED: Adding the unique `key={girlId}` onto the wrapper forces an intentional, 
      clean DOM tree recycling pass whenever the active profile identity rotates.
    */
    <div key={girlId} className="mt-6 animate-in fade-in duration-300">
      <h3 className="font-semibold text-lg mb-4">Recent Posts</h3>

      {!hasPosts ? (
        <div className="text-center text-muted-foreground p-8 border border-dashed border-white/5 rounded-xl bg-black/5">
          <p className="text-sm italic">
            No recent posts from this resident.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post, index) => {
            if (!post?.id) return null; // Tight defensive property resolution guard
console.log("FIRST POST", posts[0]);
console.log("AUTHOR", posts[0]?.author);
console.log("AUTHOR ID", posts[0]?.author?.id);
console.log("AUTHOR NAME", posts[0]?.author?.name);
console.log("AUTHOR IMAGE", posts[0]?.author?.profileImageUrl);
console.log("ACTOR ID", posts[0]?.actorId);
console.log("AUTHOR ID FIELD", posts[0]?.authorId);            return (
              <div 
                key={post.id}
                className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
              >
                <PostCard post={post} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}