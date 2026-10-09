'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { MainContent } from "@/components/main-content";
import { Toaster } from "@/components/ui/toaster";
import { GlobalLoader } from '@/components/global-loader';
import { useUser } from '@/firebase/auth/use-user';
import { useFirebase } from '@/firebase/provider';
import { MinimizedChatWidget } from '@/components/MinimizedChatWidget';
import { MinimizedMusicWidget } from '@/components/MinimizedMusicWidget';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { PresenceManager } from '@/components/PresenceManager';
import { ServiceWorkerRegistration } from '@/components/service-worker-registration';
import { FCMTokenManager } from '@/components/fcm-token-manager';
import { MessengerCallManager } from '@/components/MessengerCallManager';
import { TimeAwareBackground } from '@/components/time-aware-background';
import { SettingsBackgroundVideo } from '@/components/settings-background-video';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * ROOT LAYOUT CLIENT (Infrastructure Hardened)
 * STABILIZED: Corrected PresenceManager import and hardened redirect guard.
 * NETWORK: Increased hydration buffer to 30s for high-latency proxies.
 */
export default function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useUser();
  const { isSessionSynced } = useFirebase();
  
  const [mounted, setMounted] = useState(false);
  const redirectCooldownRef = useRef(false);
  const lastPathRef = useRef<string | null>(null);

  // 🛡️ MEMOIZED VISIBILITY
  const bgFlags = useMemo(() => {
    const safePath = pathname || '';
    const isPublic = ['/', '/auth/signin', '/auth/signup'].some(p => safePath === p);
    const hideSkyOn = ['/settings', '/admin', '/chat', '/call', '/reels', '/auth', '/conversations', '/messages'];
    const showSky = !hideSkyOn.some(prefix => safePath.startsWith(prefix));
    const isSettings = safePath.startsWith('/settings');
    
    return {
        showTimeAwareBackground: showSky,
        isSettingsPage: isSettings,
        hasCustomBackground: showSky || isSettings,
        isPublicPath: isPublic
    };
  }, [pathname]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!(window as any).__dv_session_buster) {
        (window as any).__dv_session_buster = Date.now().toString();
      }
    }
    setMounted(true);
  }, []);

  // 🛡️ HARDENED DEFENSIVE REDIRECT GUARD
  useEffect(() => {
    if (!mounted || isAuthLoading || bgFlags.isPublicPath) return;

    const checkAuth = () => {
      // If we are currently signing out, do not trigger the guard
      if (typeof window !== 'undefined' && (window as any).__dv_signing_out) return;

      // Check for the high-priority session hint cookie
      const hasHint = typeof document !== 'undefined' && document.cookie.includes('__dv_session_hint=true');
      
      if (!user && !hasHint) {
        if (redirectCooldownRef.current && lastPathRef.current === pathname) return;
        
        console.log('[AuthGuard] Redirecting guest to sign-in from:', pathname);
        redirectCooldownRef.current = true;
        lastPathRef.current = pathname;
        router.replace('/auth/signin');
      }
    };

    // ⚡ HIGH LATENCY TOLERANCE: Wait 30 seconds for the proxy to stabilize
    const timer = setTimeout(checkAuth, 30000); 
    return () => clearTimeout(timer);
  }, [user, isAuthLoading, mounted, bgFlags.isPublicPath, router, pathname]);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
        <>
          <GlobalLoader isLoading={isAuthLoading && !mounted} />
          <FirebaseErrorListener />
          <PresenceManager />

          {mounted && (
            <>
              <ServiceWorkerRegistration />
              <FCMTokenManager />
              <MessengerCallManager />
              
              <div id="immersive-background-layer" className="fixed inset-0 -z-50 pointer-events-none">
                 {bgFlags.showTimeAwareBackground && <TimeAwareBackground />}
                 {bgFlags.isSettingsPage && <SettingsBackgroundVideo />}
              </div>
            </>
          )}

          <div
            className={cn(
              "relative z-10 flex flex-col h-dvh min-h-0 w-full overflow-hidden transition-colors duration-500",
              bgFlags.hasCustomBackground ? "bg-transparent" : "bg-background"
            )}
          >
            <div className="flex-none">
              <Header />
            </div>
            <MainContent>{children}</MainContent>
            <div className="flex-none">
              <BottomNav />
            </div>
          </div>

          <MinimizedChatWidget />
          <MinimizedMusicWidget />
          <Toaster />
        </>
    </ThemeProvider>
  );
}
