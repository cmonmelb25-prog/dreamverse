'use client';

import { useFeed } from './FeedProvider';
import PostCard from './PostCard';
import { Loader } from '@/components/ui/loader';

export default function FeedPageClient() {
  const { posts, isLoading } = useFeed();

  // 🔥 Loading state FIRST (prevents flash of empty feed)
  if (isLoading && posts.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader />
      </div>
    );
  }

  // 🔥 Main feed
  if (posts.length > 0) {
    return (
      <div className="space-y-6">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    );
  }

  // 🔥 Empty state
  return (
    <div className="text-center text-muted-foreground p-12 bg-card/20 rounded-xl border border-dashed border-white/10">
      No posts yet. Be the first to post!
    </div>
  );
}