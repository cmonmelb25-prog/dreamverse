import ResidentMessagesSidebar from '@/components/residents/ResidentMessagesSidebar';
import { getAuthenticatedUserId } from '@/server/actions/swipe-actions';
import { redirect } from 'next/navigation';
import { Loader } from '@/components/ui/loader';
import { Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

/**
 * RESIDENT INBOX INDEX
 * Displays the list of AI conversations.
 * GUARDED: Redirects to sign-in if no active session is found.
 */
export default async function ResidentInboxPage() {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    redirect('/auth/signin');
  }

  return (
    <>
      {/* Mobile view: show the list of AI chats */}
      <div className="md:hidden h-full overflow-hidden">
        <ResidentMessagesSidebar />
      </div>

      {/* Desktop view: select chat placeholder */}
      <div className="hidden md:flex h-full flex-1 items-center justify-center bg-background overflow-hidden border-l border-white/5">
        <div className="text-center space-y-4">
          <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20 shadow-[0_0_20px_rgba(255,0,132,0.2)]">
            <Sparkles className="text-primary h-10 w-10 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Your Resident Inbox</h2>
            <p className="text-white/40 font-medium text-sm mt-1">Select a Resident to continue your connection.</p>
          </div>
        </div>
      </div>
    </>
  );
}
