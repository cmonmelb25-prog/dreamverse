'use client';

import { useEffect, useRef } from 'react';
import { useMinimizedChat } from '@/providers/MinimizedChatProvider';
import Link from 'next/link';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase/provider';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { X, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Floating "Chat Head" Widget.
 * Persists across the application, listening for new messages in a minimized thread.
 * HARDENED: Correctly handles Next.js 15 state transitions and ID-based identity locks.
 */
export function MinimizedChatWidget() {
  const {
    minimizedChat,
    closeMinimizedChat,
    incrementUnread
  } = useMinimizedChat();

  const { user } = useUser();
  const firestore = useFirestore();

  const lastMsgIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!minimizedChat || !user?.uid || !firestore) return;

    const { id: targetId, type } = minimizedChat;

    // 1. Resolve correct Firestore path based on thread type
    let path = '';
    if (type === 'chat') {
      path = `chat/${targetId}_${user.uid}/messages`;
    } else {
      path = `messenger/${targetId}/messages`;
    }

    const q = query(
      collection(firestore, path),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    let isFirstSnapshot = true;

    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) {
        isFirstSnapshot = false;
        return;
      }

      const doc = snap.docs[0];
      const data = doc.data();
      const msgId = doc.id;

      // Guard: Only process messages that arrive AFTER minimization
      if (isFirstSnapshot) {
        lastMsgIdRef.current = msgId;
        isFirstSnapshot = false;
        return;
      }

      if (msgId !== lastMsgIdRef.current) {
        const isIncoming = type === 'chat'
          ? data.sender === 'girl'
          : data.sender !== user.uid;

        if (isIncoming) {
          incrementUnread();
        }

        lastMsgIdRef.current = msgId;
      }
    }, (error) => {
      console.warn("[Minimized Widget] Listener suppressed:", error.message);
    });

    return () => {
      unsub();
      lastMsgIdRef.current = null;
    };
  }, [minimizedChat?.id, user?.uid, firestore, incrementUnread]);

  if (!minimizedChat) return null;

  const { id, name, image, type, unreadCount } = minimizedChat;

  const href = type === 'chat'
    ? `/chat/${id}`
    : `/messages/${id}`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20, x: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20, x: 20 }}
        className="fixed bottom-24 right-4 z-[100] md:bottom-6 md:right-6 select-none"
      >
        <div className="relative group">
          {/* Main Bubble Link */}
          <Link
            href={href}
            className="block"
          >
            <div className={cn(
              "w-16 h-16 rounded-full bg-zinc-950 border-2 shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer relative overflow-hidden",
              unreadCount > 0
                ? "border-[#ff0084] animate-pulse ring-4 ring-[#ff0084]/20"
                : "border-white/10 hover:border-white/30"
            )}>
              <Avatar className="h-full w-full">
                <AvatarImage src={image} alt={name} className="object-cover object-top" />
                <AvatarFallback className="bg-zinc-800 text-[10px] font-black uppercase">
                  {name?.substring(0, 2) || 'CH'}
                </AvatarFallback>
              </Avatar>

              {/* Hover Icon */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <MessageCircle className="text-white h-6 w-6" />
              </div>

              {/* Notification Badge */}
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 bg-red-500 rounded-full border-2 border-background text-[10px] font-black text-white flex items-center justify-center shadow-lg transform scale-110 z-20"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </motion.span>
              )}
            </div>
          </Link>

          {/* Close Widget Button */}
          <Button
            variant="destructive"
            size="icon"
            className="absolute -top-1 -left-1 h-6 w-6 rounded-full shadow-lg border border-white/20 hover:scale-110 transition-transform z-30 opacity-100 md:opacity-0 md:group-hover:opacity-100"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              closeMinimizedChat();
            }}
            title="Close minimized chat"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
