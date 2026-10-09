'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/use-memo-firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useUser } from '@/firebase/auth/use-user';
import { 
  collection, 
  query, 
  doc, 
  onSnapshot, 
  limit, 
  orderBy, 
  updateDoc 
} from '@/firebase/client';
import { getSafeDate, getCanonicalGirlId, isValidMediaUrl, cn } from '@/lib/utils';
import { MessagesComponent, InputComponent } from '@/components/chat/ChatClient';
import type { AIGirl, Message, AuthorSnapshot } from '@/lib/types';
import { ChevronLeft, Phone, Video, Loader, MoreVertical, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useMinimizedChat } from '@/providers/MinimizedChatProvider';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import Link from 'next/link';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useVipLimits } from '@/hooks/useVipLimits';
import { SubscribePopup } from '@/components/SubscribePopup';
import { PhoneFrame } from '@/components/ui/phone-frame';

export default function ChatPageClient({
  params,
  girlConfig,
  girlImage
}: {
  params: { id: string };
  girlConfig: AIGirl;
  girlImage: string;
}) {
  const { id: rawGirlId } = params;
  const { user, isLoading: isUserLoading } = useUser();
  const { isVip, isAdmin } = useUserProfile();
  const { firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const { minimizeChat, closeMinimizedChat, minimizedChat } = useMinimizedChat();

  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isNavigatingToCall, setIsNavigatingToCall] = useState(false);
  const [showVipPopup, setShowVipPopup] = useState(false);
  const [vipFeature, setVipFeature] = useState('');

  const girlId = useMemo(() => getCanonicalGirlId(rawGirlId) || rawGirlId, [rawGirlId]);
  const chatId = useMemo(() => user?.uid ? `${girlId}_${user.uid}` : null, [girlId, user?.uid]);

  const { canVoiceCall, canVideoCall, canSendVoiceMessage } = useVipLimits(
    user ? { id: user.uid, vipTier: isVip ? 'vip' : 'non-vip', isAdmin: !!isAdmin } : null
  );

  const isBooting = isUserLoading || !user || !firestore;

  // RE-ENTRY CLEANUP: Clear any matching minimized head when opening the chat
  useEffect(() => {
    if (minimizedChat && minimizedChat.id === girlId) {
      closeMinimizedChat();
    }
  }, [girlId, minimizedChat, closeMinimizedChat]);

  useEffect(() => {
    if (!firestore || !user?.uid || !chatId) return;
    const userRef = doc(firestore, 'users', user.uid);
    updateDoc(userRef, { activeChatId: girlId }).catch(() => {});
    return () => {
      updateDoc(userRef, { activeChatId: null }).catch(() => {});
    };
  }, [firestore, user?.uid, chatId, girlId]);

const messagesQuery = useMemoFirebase(() => {
  if (!chatId || !firestore) return null;

  return query(
    collection(firestore, "chat", chatId, "messages"),
    orderBy("createdAt", "desc"),
    limit(100)
  );
}, [firestore, chatId]);

const { data: rawMessages } = useCollection<Message>(
  messagesQuery,
  chatId ?? null
);
  const messages = useMemo(() => {
    if (!rawMessages) return [];
    return [...rawMessages].sort((a, b) => {
      const timeA = typeof a.createdAt === 'number' ? a.createdAt : getSafeDate(a.timestamp || a.createdAt)?.getTime() || 0;
      const timeB = typeof b.createdAt === 'number' ? b.createdAt : getSafeDate(b.timestamp || b.createdAt)?.getTime() || 0;
      return timeA - timeB;
    });
  }, [rawMessages]);

  const girlRef = useMemoFirebase(() => {
    if (!firestore || !girlId) return null;
    return doc(firestore, 'aiGirls', girlId);
  }, [firestore, girlId]);

  const { data: liveGirl } = useDoc<AIGirl>(
    girlRef, 
    girlId ? `aiGirls/${girlId}` : null
  );

  useEffect(() => {
    if (isBooting || !chatId || !firestore) return;
    const sessionDocRef = doc(firestore, 'chat', chatId);
    const unsub = onSnapshot(
      sessionDocRef, 
      (snap) => {
        if (snap.exists()) {
          setIsTyping(snap.data().isTyping === true);
        }
      },
      async (err) => {
        const permissionError = new FirestorePermissionError({
          path: sessionDocRef.path,
          operation: 'get',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      }
    );
    return () => unsub();
  }, [firestore, chatId, isBooting]);

  const handleSendMessage = async (text: string, mediaUrl?: string) => {
    if ((!text.trim() && !mediaUrl) || !user) return;
    
    if (mediaUrl && !isValidMediaUrl(mediaUrl)) {
        toast({ variant: 'destructive', title: 'Invalid attachment', description: 'This media source is not supported.' });
        return;
    }

    setIsSending(true);
    const clientMessageId = `msg-${Date.now()}`;
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ girlId, userId: user.uid, message: text, mediaUrl: mediaUrl || null, clientMessageId })
      });
      if (!response.ok) throw new Error('Failed to send message');
      closeMinimizedChat();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error sending message', description: err.message });
    } finally {
      setIsSending(false);
    }
  };

  const handleMinimize = () => {
    if (minimizeChat) {
      minimizeChat({
        id: girlId,
        name: girlConfig.name,
        image: girlImage,
        type: 'chat'
      });
      router.push('/conversations');
    }
  };

  const handleCallClick = (mode: 'voice' | 'video') => {
    // Calls to AI girls are removed — disable navigation to AI call page.
    if (girlConfig?.role === 'aigirl') {
      setVipFeature('Calling Disabled');
      setShowVipPopup(true);
      return;
    }
    const permitted = mode === 'video' ? canVideoCall(girlConfig) : canVoiceCall(girlConfig);
    if (!permitted) {
      setVipFeature(mode === 'video' ? 'Video Calling' : 'Voice Calling');
      setShowVipPopup(true);
      return;
    }
    setIsNavigatingToCall(true);
    // For non-AI targets, preserve existing call navigation (messenger flows)
    router.push(`/call/${girlId}?mode=${mode}`);
  };

  const handleVipRequired = () => {
    setVipFeature('Voice Messaging');
    setShowVipPopup(true);
  };

  const { profile: userProfile } = useUserProfile();
  const currentUserIdentity: AuthorSnapshot | null = useMemo(() => {
    if (!user) return null;
    return {
      id: user.uid,
      name: userProfile?.displayName || user.displayName || 'You',
      profileImageUrl: userProfile?.photoURL || user.photoURL || '',
      role: 'user',
      vipTier: (userProfile?.vipTier as any) || 'non-vip',
      nationality: userProfile?.nationality || 'American',
      currentMood: 'Neutral'
    };
  }, [user, userProfile]);

  if (isBooting) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <Loader className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  const isGirlOnline = liveGirl?.onlineStatus === 'online';

  return (
    <PhoneFrame>
      <div className="flex flex-col h-full bg-[#111214] relative overflow-hidden">
        <header className="flex-none relative z-30 flex flex-col bg-background/95 backdrop-blur-xl border-b border-white/5 pt-10 md:pt-4 pb-3 shadow-md">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-white" onClick={() => router.back()}>
                <ChevronLeft size={24} />
              </Button>
              <Link href={`/profile/${girlId}`} prefetch={false} className="flex items-center gap-3 group">
                <div className="relative">
                  <Avatar className="h-10 w-10 border border-white/10 group-hover:border-[#ff0084] transition-all">
                    <AvatarImage src={girlImage || undefined} className="object-cover object-top" />
                    <AvatarFallback>{girlConfig.name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  {isGirlOnline && (
                    <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#111214] shadow-sm" />
                  )}
                </div>
                <div>
                  <h1 className="font-bold text-base text-white group-hover:text-[#ff0084] transition-colors">{girlConfig.name}</h1>
                  {isGirlOnline ? (
                    <p className="text-[11px] font-medium text-green-400">Active now</p>
                  ) : (
                    <p className="text-[11px] font-medium text-white/30">Offline</p>
                  )}
                </div>
              </Link>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="rounded-full text-[#ff0084] hover:bg-white/5" onClick={handleMinimize}>
                <Minimize2 size={18} />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full text-[#ff0084] hover:bg-white/5">
                <MoreVertical size={20} />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar relative z-10 bg-[#111214]">
          <MessagesComponent 
            messages={messages} 
            isReplying={isTyping && isGirlOnline} 
            chatId={chatId ?? undefined} 
            currentUserIdentity={currentUserIdentity} 
          />
        </main>

        <footer className="flex-none relative z-20">
          <InputComponent 
            girl={girlConfig} 
            onSendMessageAction={handleSendMessage} 
            isSending={isSending} 
            canSendVoice={canSendVoiceMessage()} 
            onVipRequiredAction={handleVipRequired} 
          />
        </footer>

        <SubscribePopup open={showVipPopup} onOpenChangeAction={setShowVipPopup} feature={vipFeature} />
      </div>
    </PhoneFrame>
  );
}
