'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { LiveStream } from '@/lib/types';
import { 
  Eye, 
  Heart, 
  Share2, 
  MoreHorizontal, 
  Gift, 
  Send,
  X,
  Volume2,
  VolumeX,
  Mic,
  Coins,
  Sparkles
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn, normalizeMediaUrl, getSafeDate } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { gifts, type GiftItem } from '@/lib/gifts';
import { sendGiftAction } from '@/server/actions/gifting';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase/auth/use-user';
import { useFirebase, useFirestore } from '@/firebase/provider';
import { 
  collection, 
  query, 
  onSnapshot, 
  limit, 
  addDoc, 
  serverTimestamp, 
  doc, 
  increment, 
  updateDoc, 
  setDoc, 
  arrayUnion, 
  where,
  deleteDoc,
  orderBy
} from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { getDailyLimitData, setDailyLimitData, STORAGE_KEY_PREFIX, DAILY_FREE_GIFT_LIMIT } from '@/lib/vip-limits';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * GIFT ANIMATION OVERLAY
 * High-fidelity visual for tributes.
 */
function GiftAnimationOverlay({ activeGift }: { activeGift: any }) {
  if (!activeGift) return null;

  return (
    <motion.div 
      initial={{ scale: 0.5, opacity: 0, y: 100 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 1.5, opacity: 0, y: -200 }}
      className="absolute inset-0 z-[60] flex flex-col items-center justify-center pointer-events-none"
    >
      <div className="bg-black/60 backdrop-blur-xl p-8 rounded-[3rem] border border-amber-400/40 shadow-[0_0_50px_rgba(251,191,36,0.3)] flex flex-col items-center gap-4">
          <div className="relative w-32 h-32">
            {activeGift.giftImageUrl ? (
                <Image src={activeGift.giftImageUrl} alt="Gift" fill className="object-contain" unoptimized />
            ) : (
                <span className="text-8xl drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">{activeGift.giftIcon}</span>
            )}
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              className="absolute -inset-4 border-2 border-dashed border-amber-400/20 rounded-full"
            />
          </div>
          <div className="text-center">
            <p className="text-amber-400 font-black uppercase tracking-[0.3em] text-[10px] mb-1">Tribute Received</p>
            <h3 className="text-2xl font-bold font-headline text-white">{activeGift.giftName}</h3>
            <p className="text-white/60 text-xs font-bold mt-2">from <span className="text-primary">{activeGift.user}</span></p>
          </div>
      </div>
      
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{ 
            x: (Math.random() - 0.5) * 500, 
            y: (Math.random() - 0.5) * 500,
            opacity: 0,
            rotate: Math.random() * 360
          }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute"
        >
          <Sparkles className="text-amber-400 h-6 w-6" />
        </motion.div>
      ))}
    </motion.div>
  );
}

export function LiveFeed({ 
  streams,
  initialIndex = 0,
  onExitAction
}: { 
  streams: LiveStream[];
  initialIndex?: number;
  onExitAction?: () => void;
}) {
  const [active, setActive] = useState(initialIndex);
  const [isGlobalMuted, setIsGlobalMuted] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const index = Number(e.target.getAttribute('data-i'));
          if (!isNaN(index)) setActive(index);
        }
      });
    }, { threshold: 0.8 });
    const items = ref.current?.querySelectorAll('.item');
    items?.forEach(i => obs.observe(i));
    return () => items?.forEach(i => obs.unobserve(i));
  }, []);

  useEffect(() => {
    if (ref.current && initialIndex > 0) {
      const target = ref.current.querySelector(`[data-i="${initialIndex}"]`);
      target?.scrollIntoView({ behavior: 'auto' });
    }
  }, [initialIndex]);

  return (
    <div className="relative h-full w-full bg-black overflow-hidden overscroll-none">
      <div ref={ref} className="h-full w-full overflow-y-scroll snap-y snap-mandatory bg-black no-scrollbar overscroll-none">
        {streams.map((s, i) => (
          <div key={s.id} data-i={i} className="item h-full w-full snap-start relative flex items-center justify-center bg-black overflow-hidden">
            <LiveStreamItem 
              stream={s} 
              isActive={i === active} 
              isMuted={isGlobalMuted}
              onToggleMute={() => setIsGlobalMuted(!isGlobalMuted)}
              onExit={onExitAction} 
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const LiveStreamItem = React.memo(({ 
  stream, 
  isActive, 
  isMuted,
  onToggleMute,
  onExit 
}: { 
  stream: LiveStream; 
  isActive: boolean; 
  isMuted: boolean;
  onToggleMute: () => void;
  onExit?: () => void 
}) => {
  const firestore = useFirestore();
  const { user: currentUser, profile: currentProfile } = useUser();
  
  const [hearts, setHearts] = useState<{ id: number; x: number }[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [liveViewerCount, setLiveViewerCount] = useState(0);
  const [liveHeartCount, setLiveHeartCount] = useState(stream.heartCount || 0);
  const [isGiftingOpen, setIsGiftingOpen] = useState(false);
  const [isSendingGift, setIsSendingGift] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [activeGiftAnimation, setActiveGiftAnimation] = useState<any>(null);
  
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const signalingInProgressRef = useRef(false);
  
  const heartCounter = useRef(0);
  const chatRef = useRef<HTMLDivElement>(null);
  const prevHeartCountRef = useRef(stream.heartCount || 0);
  const { toast } = useToast();

  const streamerId = stream.id; 
  const isSelf = currentUser?.uid === streamerId;

  const playbackUrl = useMemo(() => {
    if (!stream.videoUrl) return null;
    return normalizeMediaUrl(stream.videoUrl);
  }, [stream.videoUrl]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // WEBRTC SIGNALING
  useEffect(() => {
    if (!isActive || !firestore || !currentUser?.uid || isSelf || stream.videoUrl) return;

    let cleanup = false;
    const viewerDocRef = doc(firestore, 'live', streamerId, 'viewers', currentUser.uid);

    const setupWebRTC = async () => {
      try {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        pcRef.current = pc;

        pc.ontrack = (event) => { if (!cleanup) setRemoteStream(event.streams[0]); };

        pc.onicecandidate = (event) => {
          if (event.candidate && !cleanup) {
            setDoc(viewerDocRef, {
              viewerCandidates: arrayUnion(event.candidate.toJSON())
            }, { merge: true }).catch(() => {});
          }
        };

        const unsubscribe = onSnapshot(viewerDocRef, async (snap) => {
          if (!snap.exists() || cleanup || signalingInProgressRef.current) return;
          const data = snap.data();
          if (data.offer && !pc.remoteDescription && pc.signalingState === 'stable') {
            signalingInProgressRef.current = true;
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await setDoc(viewerDocRef, { answer: { type: answer.type, sdp: answer.sdp } }, { merge: true });
            } catch (err) {
               console.debug('[WebRTC] Signaling handshake deferred.');
            } finally { signalingInProgressRef.current = false; }
          }
          if (Array.isArray(data.hostCandidates)) {
            data.hostCandidates.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {}));
          }
        });
        return unsubscribe;
      } catch (err) { console.warn("WebRTC fail"); }
    };

    const unsubSignal = setupWebRTC();
    return () => { 
      cleanup = true; 
      pcRef.current?.close(); 
      setRemoteStream(null); 
      unsubSignal.then(u => u?.()); 
    };
  }, [isActive, firestore, currentUser?.uid, isSelf, stream.videoUrl, streamerId]);

  const triggerHeartBurst = useCallback((count = 1) => {
    if (count <= 0) return;
    const newBurst: { id: number; x: number }[] = [];
    for (let i = 0; i < count; i++) {
        newBurst.push({ id: ++heartCounter.current, x: Math.random() * 80 - 40 });
    }
    setHearts(prev => [...prev, ...newBurst]);
    setTimeout(() => {
        if (newBurst.length > 0) {
            const firstId = newBurst[0].id;
            const lastId = newBurst[newBurst.length - 1].id;
            setHearts(prev => prev.filter(h => h.id < firstId || h.id > lastId));
        }
    }, 2500);
  }, []);

  const handleHeartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    triggerHeartBurst(1);
    if (firestore && streamerId) {
      updateDoc(doc(firestore, 'live', streamerId), { heartCount: increment(1), updatedAt: serverTimestamp() }).catch(() => {});
    }
  };

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [comments]);

  // STATS & CHAT SYNC
  useEffect(() => {
    if (!firestore || !streamerId || !isActive) {
      setComments([]);
      return;
    }

    const streamDocRef = doc(firestore, 'live', streamerId);
    let isFirst = true;
    
    if (currentUser?.uid && !isSelf) {
      const viewerRef = doc(firestore, 'live', streamerId, 'viewers', currentUser.uid);
      setDoc(viewerRef, {
        id: currentUser.uid,
        name: currentProfile?.displayName || currentUser.displayName || 'Viewer',
        photoURL: currentProfile?.photoURL || currentUser.photoURL || '',
        sessionId: stream.sessionId || 'legacy', 
        joinedAt: serverTimestamp()
      }, { merge: true }).catch(() => {});
    }

    const unsubStream = onSnapshot(streamDocRef, (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            const newHearts = data.heartCount || 0;
            if (!isFirst && newHearts > prevHeartCountRef.current) triggerHeartBurst(Math.min(newHearts - prevHeartCountRef.current, 10));
            isFirst = false; 
            prevHeartCountRef.current = newHearts; 
            setLiveHeartCount(newHearts);
        }
    });

    const qViewers = stream.sessionId 
      ? query(collection(firestore, 'live', streamerId, 'viewers'), where('sessionId', '==', stream.sessionId))
      : collection(firestore, 'live', streamerId, 'viewers');
      
    const unsubViewers = onSnapshot(qViewers, (snap) => {
      setLiveViewerCount(snap.size);
    });

    const qChat = query(
      collection(firestore, 'live', streamerId, 'comments'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubChat = onSnapshot(qChat, (snap) => {
        let msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        
        // Filter by session in memory to avoid complex indexing
        if (stream.sessionId) {
          msgs = msgs.filter(m => m.sessionId === stream.sessionId);
        }

        msgs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg?.type === 'gift' && lastMsg.createdAt > Date.now() - 5000) {
            setActiveGiftAnimation(lastMsg);
            setTimeout(() => setActiveGiftAnimation(null), 3500);
        }

        setComments(msgs);
    }, (err) => {
        if (err.code === 'permission-denied') return;
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `live/${streamerId}/comments`,
          operation: 'list'
        }));
    });

    return () => {
        unsubStream(); 
        unsubChat();
        unsubViewers();
        if (currentUser?.uid && !isSelf) {
          const viewerRef = doc(firestore, 'live', streamerId, 'viewers', currentUser.uid);
          deleteDoc(viewerRef).catch(() => {});
        }
    };
  }, [firestore, streamerId, isActive, isSelf, triggerHeartBurst, currentUser?.uid, currentProfile, stream.sessionId]);

  const handleSendGift = async (giftItem: GiftItem) => {
    if (!currentUser) return;

    if (giftItem.priceCoins === 0) {
        const key = `${STORAGE_KEY_PREFIX}free_gift_${currentUser.uid}`;
        const data = getDailyLimitData(key);
        if (data.count >= DAILY_FREE_GIFT_LIMIT) {
            toast({ variant: 'destructive', title: 'Daily Limit Reached', description: 'You can only send 1 free tribute per day.' });
            return;
        }
    } else if ((currentProfile?.coins || 0) < giftItem.priceCoins) {
        toast({ variant: 'destructive', title: 'Insufficient Coins' });
        return;
    }

    setIsSendingGift(true);
    try {
      const res = await sendGiftAction({ 
        girlId: streamerId, 
        giftId: giftItem.id,
        sessionId: stream.sessionId
      }) as any;

      if (res && res.success) {
          if (giftItem.priceCoins === 0) {
              const key = `${STORAGE_KEY_PREFIX}free_gift_${currentUser.uid}`;
              const data = getDailyLimitData(key);
              setDailyLimitData(key, data.count + 1);
          }
          setIsGiftingOpen(false);
          toast({ title: 'Tribute Sent!' });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Gift Error', description: err.message });
    } finally {
      setIsSendingGift(false);
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText || !firestore || !streamerId) return;
    const text = commentText; setCommentText('');
    await addDoc(collection(firestore, 'live', streamerId, 'comments'), {
      user: currentProfile?.displayName || currentUser?.displayName || 'Viewer',
      text,
      sessionId: stream.sessionId || 'legacy',
      timestamp: serverTimestamp(),
      createdAt: Date.now(),
      color: 'text-pink-500'
    }).catch(() => {});
  };

  const canSendFreeGift = useMemo(() => {
      if (!currentUser) return false;
      const key = `${STORAGE_KEY_PREFIX}free_gift_${currentUser.uid}`;
      return getDailyLimitData(key).count < DAILY_FREE_GIFT_LIMIT;
  }, [currentUser, isGiftingOpen]);

  return (
    <div className="h-full w-full relative bg-black overflow-hidden">
      <div className="absolute inset-0 z-0">
        {playbackUrl ? (
          <>
            <video src={playbackUrl} autoPlay loop muted={true} playsInline className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-40 scale-110" crossOrigin="anonymous" />
            <video src={playbackUrl} autoPlay loop muted={isMuted || !isActive} playsInline className="relative z-10 w-full h-full object-contain" crossOrigin="anonymous" />
          </>
        ) : remoteStream ? (
          <video ref={remoteVideoRef} autoPlay playsInline muted={isMuted || !isActive} className="w-full h-full object-contain relative z-10" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950">
             <Avatar className="h-48 w-48 border-8 border-primary/20"><AvatarImage src={stream.photoURL} className="object-cover" /></Avatar>
             <div className="text-center mt-6 space-y-2">
                <div className="flex items-center justify-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-[0.3em] text-white/80">Broadcasting</span>
                </div>
             </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 z-20" />
      </div>

      <AnimatePresence>
         {activeGiftAnimation && <GiftAnimationOverlay activeGift={activeGiftAnimation} />}
      </AnimatePresence>

      <header className="relative z-50 flex items-center justify-between p-4 pt-12">
          <div className="bg-black/60 backdrop-blur-xl rounded-full px-4 py-1.5 border border-white/10 flex items-center gap-2">
             <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
             <span className="text-xs font-black text-white uppercase">LIVE: {stream.displayName}</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="bg-black/60 px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5 text-white">
                <Eye size={12} />
                <span className="text-[10px] font-black">{liveViewerCount}</span>
             </div>
             <button type="button" onClick={onExit} className="h-9 w-9 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white"><X size={18} /></button>
          </div>
      </header>

      {/* CHAT DISPLAY */}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-4 z-[50] w-[85%] max-h-[40%] flex flex-col pointer-events-none">
          <div ref={chatRef} className="flex flex-col items-start overflow-y-auto no-scrollbar space-y-1.5 pb-4 pointer-events-auto">
             <AnimatePresence mode="popLayout">
                {comments.map((msg) => (
                  <motion.div 
                    key={msg.id} 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    className={cn(
                      "px-4 py-2 rounded-2xl border shadow-xl transition-all",
                      msg.type === 'gift' 
                        ? "bg-gradient-to-r from-amber-500/30 to-transparent border-amber-500/40 ring-1 ring-amber-500/20" 
                        : "bg-black/40 border-white/5"
                    )}
                  >
                     <p className="text-[13px]">
                        <span className={cn("font-black mr-2", msg.type === 'gift' ? "text-amber-400" : (msg.color || 'text-primary'))}>
                          {msg.user}:
                        </span>
                        <span className={cn(msg.type === 'gift' ? "text-amber-100 font-bold italic" : "text-white/95")}>
                          {msg.text}
                        </span>
                     </p>
                  </motion.div>
                ))}
             </AnimatePresence>
          </div>
      </div>

      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] right-4 z-[50] flex flex-col gap-3">
          <button type="button" onClick={onToggleMute} className="w-12 h-12 rounded-full bg-black/40 border border-white/10 text-white flex items-center justify-center shadow-2xl">{isMuted ? <VolumeX size={22} /> : <Mic size={22} />}</button>
          {!isSelf && <button type="button" onClick={() => setIsGiftingOpen(true)} className="w-12 h-12 rounded-full bg-amber-500/20 border-amber-500/40 text-amber-400 flex items-center justify-center shadow-2xl"><Gift size={22} /></button>}
          <button type="button" onClick={handleHeartClick} className="w-12 h-12 rounded-full bg-black/40 border border-white/10 text-white flex items-center justify-center shadow-2xl"><Heart size={22} className={cn(liveHeartCount > 0 && "fill-primary text-primary")} /></button>
          <button type="button" className="w-12 h-12 rounded-full bg-black/40 border border-white/10 text-white flex items-center justify-center shadow-2xl"><Share2 size={22} /></button>
          <button type="button" className="w-12 h-12 rounded-full bg-black/40 border border-white/10 text-white flex items-center justify-center shadow-2xl"><MoreHorizontal size={22} /></button>
      </div>

      <footer className="absolute bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] left-4 right-4 z-[60] pointer-events-auto">
          <form onSubmit={handleSendComment} className="h-12 bg-black/60 backdrop-blur-xl rounded-full border border-white/10 flex items-center px-5 shadow-2xl">
             <input className="flex-1 bg-transparent border-none outline-none text-[14px] text-white" placeholder="Say something..." value={commentText} onChange={(e) => setCommentText(e.target.value)} />
             <button type="submit" className={cn("transition-colors", commentText ? "text-primary" : "text-white/40")}>
               <Send size={20} />
             </button>
          </form>
      </footer>

      <div className="absolute bottom-40 right-10 z-[70] pointer-events-none h-[400px] w-32 overflow-visible">
        <AnimatePresence>
          {hearts.map((h) => (
            <motion.div key={h.id} initial={{ y: 0, opacity: 1 }} animate={{ y: -500, opacity: 0 }} transition={{ duration: 2 }} className="absolute bottom-0 right-0 text-primary pointer-events-none"><Heart fill="currentColor" size={32} /></motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Dialog open={isGiftingOpen} onOpenChange={setIsGiftingOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border-white/10 p-0 overflow-hidden rounded-[2.5rem] shadow-2xl z-[100]">
           <DialogHeader className="p-8 bg-black/60 border-b border-white/5 flex flex-row items-center justify-between">
              <DialogTitle className="text-2xl font-bold font-headline text-primary uppercase tracking-widest">Tributes</DialogTitle>
              <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full">
                 <Coins className="h-4 w-4 text-primary" />
                 <span className="text-xs font-black text-white">{currentProfile?.coins || 0}</span>
              </div>
           </DialogHeader>
           <div className="p-6 overflow-y-auto no-scrollbar max-h-[50vh]">
              <div className="grid grid-cols-3 gap-4">
                 {gifts.map((giftItem) => {
                    const isFree = giftItem.priceCoins === 0;
                    const canAfford = (currentProfile?.coins || 0) >= giftItem.priceCoins;
                    const isLockedFree = isFree && !canSendFreeGift;
                    const isDisabled = isSendingGift || (isFree ? isLockedFree : !canAfford);

                    return (
                      <button 
                        key={giftItem.id} 
                        type="button" 
                        onClick={() => handleSendGift(giftItem)} 
                        disabled={isDisabled} 
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-3xl border transition-all active:scale-95 group",
                          !isDisabled ? "border-white/5 hover:bg-white/5" : "border-transparent opacity-40 grayscale"
                        )}
                      >
                         <div className="w-14 h-14 relative flex items-center justify-center">
                            {giftItem.imageUrl ? (
                              <div className="w-full h-full relative rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-black">
                                <Image src={giftItem.imageUrl} alt={giftItem.name} fill className="object-cover" unoptimized />
                              </div>
                            ) : (
                              <span className="text-4xl drop-shadow-lg">{giftItem.icon}</span>
                            )}
                            {isLockedFree && (
                                <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center">
                                    <X className="text-red-500 h-6 w-6" />
                                </div>
                            )}
                         </div>
                         <div className="text-center">
                            <p className="text-[10px] font-black uppercase text-white truncate max-w-[80px]">{giftItem.name}</p>
                            <div className="flex items-center justify-center gap-1 mt-0.5">
                               <Coins className="h-2.5 w-2.5 text-primary" />
                               <span className={cn("text-[9px] font-bold", isLockedFree ? "text-red-400" : "text-primary")}>
                                 {isFree ? (isLockedFree ? 'LIMIT' : 'FREE') : giftItem.priceCoins}
                               </span>
                            </div>
                         </div>
                      </button>
                    );
                 })}
              </div>
           </div>
           <div className="p-6 bg-black/40 border-t border-white/5">
              <Button asChild variant="outline" className="w-full h-11 rounded-2xl border-primary/30 text-primary hover:bg-primary/10">
                 <Link href="/settings"><Coins className="mr-2 h-4 w-4" /> Buy Coins</Link>
              </Button>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

LiveStreamItem.displayName = 'LiveStreamItem';