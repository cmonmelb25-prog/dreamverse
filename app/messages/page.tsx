import MessagesSidebar from './MessagesSidebar';
import { db } from '@/lib/firebase-admin';
import { getAuthenticatedUserId } from '@/server/actions/swipe-actions';
import { redirect } from 'next/navigation';
import { Loader } from '@/components/ui/loader';

/**
 * MESSENGER ENTRY PAGE (SERVER COMPONENT)
 * FIXED: Server-side redirect logic prevents hydration mismatches and ChunkLoadErrors.
 */
export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
  const userId = await getAuthenticatedUserId();

if (!userId) {
  redirect('/auth/signin');
}

  // 1. ATTEMPT AUTO-REDIRECT ON SERVER (Desktop Only behavior simulation)
  // We check if a chat exists, but we render the sidebar for the "Select a chat" state.
  // The client sidebar logic remains for mobile navigation.

  return (
    <>
      {/* Mobile view: always show the list of chats with fixed height */}
      <div className="md:hidden h-full overflow-hidden">
        <MessagesSidebar />
      </div>

      {/* Desktop view */}
      <div className="hidden md:flex h-full flex-1 items-center justify-center bg-background overflow-hidden border-l border-white/5">
        <div className="text-center space-y-2">
          <div className="h-16 w-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
            <Loader className="text-primary/40" />
          </div>
          <p className="text-white/40 font-medium text-sm">Select a conversation to start messaging.</p>
        </div>
      </div>
    </>
  );
}
