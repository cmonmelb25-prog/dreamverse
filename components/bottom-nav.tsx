'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Users, Film, Flame, MessageSquare, MessageCircle, Radio, ShoppingBag, Phone } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useNotifications } from '@/hooks/use-notifications';

const navItems = [
  { href: '/feed', label: 'Feed', icon: Home },
  { href: '/browse', label: 'People', icon: Users },
  { href: '/swipe', label: 'Match', icon: Flame },
  { href: '/reels', label: 'Reels', icon: Film },
  { href: '/marketplace', label: 'Market', icon: ShoppingBag },
  { href: '/live', label: 'Live', icon: Radio },
  { href: '/conversations', label: 'Chat', icon: MessageCircle },
  { href: '/messages', label: 'Inbox', icon: MessageSquare },
  { href: '/calls', label: 'Calls', icon: Phone },
];

/**
 * Mobile-First Bottom Navigation.
 * OPTIMIZED: prefetch={false} prevents redundant server hits in high-latency workstation environments.
 */
export function BottomNav() {
  const pathname = usePathname();
  const { user, isLoading } = useUser();
  const { unreadMessengerCount, unreadAIChatCount } = useNotifications();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!pathname) return null;

  const isMessageChat = pathname.startsWith('/messages/') && pathname !== '/messenger';
  const isResidentChat = pathname.startsWith('/conversations/') && pathname !== '/chat';
  const isLiveStream = pathname.startsWith('/live');
  
  const hideOnPaths = ['/', '/auth/signin', '/auth/signup'];
  
  if (
    hideOnPaths.includes(pathname) ||
    isLiveStream ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/chat/') ||
    pathname.startsWith('/call/') ||
    pathname.startsWith('/messenger') ||
    isMessageChat ||
    isResidentChat
  ) {
    return null;
  }

  if (!mounted || isLoading || !user) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="container flex h-16 items-center justify-around px-0.5">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const isMessenger = item.label === 'Inbox';
          const isChat = item.label === 'Chat';
          
          const badgeValue = isMessenger ? unreadMessengerCount : (isChat ? unreadAIChatCount : 0);
          const showBadge = badgeValue > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 min-w-0 relative h-full transition-transform active:scale-90"
              )}
            >
              <div className="relative">
                <item.icon
                  className={cn(
                    "h-4.5 w-4.5 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                />
                
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border border-background text-[7px] font-black text-white items-center justify-center">
                      {badgeValue > 9 ? '+' : badgeValue}
                    </span>
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[8px] font-black transition-colors truncate w-full text-center uppercase tracking-tighter",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
