'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  User as UserIcon, 
  LogOut, 
  Shield, 
  Settings, 
  Gem, 
  MessageCircle, 
  Home, 
  Users, 
  Film, 
  Flame, 
  MessageSquare,
  Radio,
  ShoppingBag,
  Phone
} from 'lucide-react';
import { useUser } from '@/firebase/auth/use-user';
import { useFirebase } from '@/firebase/provider';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from '@/firebase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import NotificationBell from '@/components/notification-bell';
import { useState, useEffect } from 'react';
import { SafeInitial } from '@/components/safe-initial';
import { useAdminActingAs } from '@/providers/AdminActingAsProvider';
import { getPlaceholderImage } from '@/lib/placeholder';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserProfile } from '@/hooks/use-user-profile';
import { signOutAction } from '@/server/actions/auth-actions';
import { useNotifications } from '@/hooks/use-notifications';

const navLinks = [
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

export function Header() {
  const pathname = usePathname();
  const { user, isLoading: isUserLoading, isAdmin, isVip } = useUser();
  const { profile, isProfileLoading } = useUserProfile();
  const { firestore , auth} = useFirebase();
  const router = useRouter();
  const { actingAs, setActingAs } = useAdminActingAs();
  const { 
    unreadMessengerCount, 
    unreadAIChatCount, 
    unreadFeedCount, 
    unreadReelsCount
  } = useNotifications();
  const [mounted, setMounted] = useState(false);

  const isLoading = isUserLoading || isProfileLoading;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    if (!auth || !user) return;
    
    setActingAs(null);
    
    try {
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, {
        status: 'offline',
        lastSeen: serverTimestamp()
      }).catch(() => {});

      await signOutAction();
      await signOut(auth);
      window.location.href = '/auth/signin';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/auth/signin';
    }
  };

  const hideOnPaths = ['/', '/auth/signin', '/auth/signup'];
  
  if (
    hideOnPaths.includes(pathname) ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/call/') ||
    pathname.startsWith('/chat/') ||
    pathname.startsWith('/messages/') ||
    pathname.startsWith('/conversations/')
  ) {
    return null;
  }

  if (!mounted) return null;

  const userImage = profile?.photoURL ?? user?.photoURL;

  return (
    <header className="flex-none w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
      <div className="container flex h-14 items-center px-4 max-w-7xl">
        <Link href="/" prefetch={false} className="mr-4 lg:mr-6 flex items-center space-x-2 shrink-0">
          <h1 className="title-3d title-gradient title-glow font-headline text-2xl lg:text-3xl">
            DreamVerse
          </h1>
        </Link>

        <nav className="hidden md:flex items-center space-x-0.5 lg:space-x-1">
          {navLinks.map(link => {
            const isActive = pathname.startsWith(link.href);
            
            // STRICT CHANNEL ROUTING
            const badgeCount = 
              link.label === 'Feed' ? unreadFeedCount :
              link.label === 'Reels' ? unreadReelsCount :
              link.label === 'Chat' ? unreadAIChatCount : // AI Girls only
              link.label === 'Inbox' ? unreadMessengerCount : 0; // Community only

            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                className={cn(
                  "text-[10px] lg:text-sm font-bold transition-all hover:text-primary px-2 lg:px-3 py-2 rounded-full flex items-center gap-1.5 relative whitespace-nowrap",
                  isActive ? "text-primary bg-primary/10 shadow-sm" : "text-muted-foreground hover:bg-white/5"
                )}
              >
                {Icon && <Icon className="h-3.5 w-3.5 lg:h-4 lg:w-4" />}
                <span className="hidden lg:inline">{link.label}</span>
                <span className="lg:hidden">{link.label === 'Residents' ? 'People' : link.label}</span>
                
                {badgeCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-1.5 w-1.5 lg:h-2 lg:w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-full w-full bg-red-500 border border-background"></span>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-1 items-center justify-end space-x-2 lg:space-x-3">
          {isLoading ? (
            <Skeleton className="h-8 w-8 rounded-full" />
          ) : user ? (
            <>
              {!isVip && !isAdmin && (
                <Button 
                  asChild 
                  className="h-8 rounded-full bg-gradient-to-r from-amber-400 via-primary to-accent hover:brightness-110 shadow-[0_0_15px_rgba(255,0,132,0.4)] border-none px-3 group transition-all shrink-0"
                >
                  <Link href="/settings">
                    <Gem className="h-3.5 w-3.5 mr-0 lg:mr-1.5 text-white animate-bounce group-hover:animate-none" />
                    <span className="hidden lg:inline text-[10px] font-black uppercase tracking-widest text-white">Join VIP</span>
                  </Link>
                </Button>
              )}

              <NotificationBell />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="relative h-8 w-8 rounded-full outline-none ring-offset-background transition-transform active:scale-95">
                    <div
                      className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center overflow-hidden border border-white/10",
                        isAdmin && "ring-2 ring-green-500 ring-offset-2"
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        {actingAs ? (
                          <AvatarImage src={actingAs.media.profileImageUrl || getPlaceholderImage(actingAs.id)} alt={actingAs.name} />
                        ) : userImage ? (
                          <AvatarImage src={userImage} alt={user.displayName || 'User'} />
                        ) : null}
                        <AvatarFallback>
                          <SafeInitial characterName={actingAs ? actingAs.name : user.displayName || user.email} />
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-bold leading-none">
                        {actingAs ? `Acting as ${actingAs.name}` : user.displayName || 'Account'}
                      </p>
                      <p className="text-[10px] leading-none text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={() => router.push('/profile/me')}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => router.push('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>

                  {isAdmin && (
                    <DropdownMenuItem onClick={() => router.push('/admin')}>
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Admin</span>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={handleSignOut} className="text-red-500 focus:text-red-500">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link href="/auth/signin">Log In</Link>
              </Button>
              <Button asChild size="sm" className="animated-border-button text-xs px-4">
                <Link href="/auth/signup">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
