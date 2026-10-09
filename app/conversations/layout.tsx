import ResidentMessagesSidebar from '@/components/residents/ResidentMessagesSidebar';

/**
 * AI Resident Chat Layout (Server Component)
 * Refactored to Server Component to prevent chunk fragmentation in Turbopack.
 */
export default function ResidentConversationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full bg-background overflow-hidden overscroll-none">
      {/* LEFT SIDEBAR: AI Chat List */}
      <div className="hidden md:flex w-[320px] flex-shrink-0 border-r border-white/5 h-full overflow-hidden bg-background">
        <ResidentMessagesSidebar />
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
