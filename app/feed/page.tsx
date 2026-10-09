import { FeedProvider } from './FeedProvider';
import FeedPageClient from './FeedPageClient';
import { CreatePost } from '@/components/feed/CreatePost';
import { getRecentPosts } from '@/server/actions/feed-actions';
import { ResidentOnlineBar } from '@/components/feed/ResidentOnlineBar';

export const dynamic = 'force-dynamic';

/**
 * FEED PAGE
 * OPTIMIZED: Fetches minimal set of posts to prevent RSC payload timeouts in proxied environments.
 */
export default async function FeedPage() {
  // Lower initial limit for workstation stability
  const posts = await getRecentPosts({ limit: 4 });
  const serializedPosts = posts || [];

  return (
    <div className="theme-feed min-h-screen">
      <FeedProvider initialPosts={serializedPosts} listen={true}>
        <div className="container mx-auto max-w-6xl px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
            <div className="space-y-6">
              <h1 className="text-4xl font-bold font-headline bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                Feed
              </h1>
              <div className="lg:hidden">
                <ResidentOnlineBar />
              </div>
              <CreatePost />
              <FeedPageClient />
            </div>
            <aside className="hidden lg:block">
              <div className="sticky top-20 space-y-6">
                <ResidentOnlineBar isSidebar />
              </div>
            </aside>
          </div>
        </div>
      </FeedProvider>
    </div>
  );
}
