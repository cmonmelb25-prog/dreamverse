
'use client';

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * MAIN CONTENT WRAPPER
 * Manages scrolling vs. fixed layout boundaries based on route.
 * HARDENED: Uses an ID for targeted scroll-to-top logic.
 */
export function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  
  // Routes that manage their OWN internal scrolling architecture
  const isChat = pathname.startsWith('/chat');
  const isMessenger = pathname.startsWith('/messages');
  const isConversations = pathname.startsWith('/conversations');
  const isCall = pathname.startsWith('/call');
  const isReels = pathname.startsWith('/reels');
  const isSwipe = pathname.startsWith('/swipe');
  
  const isFixedViewport = isChat || isMessenger || isConversations || isCall || isReels || isSwipe;

  return (
    <main
      id="main-scroll-container"
      className={cn(
        "flex-1 flex flex-col min-w-0 min-h-0", // min-h-0 allows flex child to shrink/scroll correctly
        isFixedViewport
          ? "overflow-hidden h-full"
          : "overflow-y-auto overscroll-behavior-contain"
      )}
    >
      {children}
    </main>
  );
}
