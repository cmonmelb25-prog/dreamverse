import MessagesSidebar from './MessagesSidebar';

/**
 * Messenger Layout (Server Component)
 * Refactored to a Server Component. The Sidebar remains a client component internally, 
 * but the layout boundary is now server-side for improved performance and routing stability.
 */
export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full bg-background overflow-hidden overscroll-none">
      {/* LEFT SIDEBAR: Fixed width, full height list */}
      <div className="hidden md:flex w-[360px] flex-shrink-0 border-r border-white/5 h-full overflow-hidden bg-background">
        <MessagesSidebar />
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
