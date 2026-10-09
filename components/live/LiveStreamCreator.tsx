'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useFirebase, useFirestore } from '@/firebase/provider';
import { 
  doc, 
  getDoc, 
  deleteDoc, 
  serverTimestamp, 
  collection, 
  onSnapshot, 
  limit, 
  setDoc,
  updateDoc,
  arrayUnion,
  addDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  X, 
  Loader, 
  Eye, 
  Heart,
  Video,
  Share2,
  MoreHorizontal,
  Mic,
  MicOff,
  Users,
  Send,
  VideoOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAdminActingAs } from '@/providers/AdminActingAsProvider';
import { resolveLiveSource } from '@/lib/live/resolveLiveSource';
import { getCacheBustedUrl, cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AnimatePresence, motion } from 'framer-motion';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * HOST COMMAND CENTER
 * HARDENED: Multi-peer broadcasting support with strictly typed listeners.
 * UPDATED: Fixed RTCPeerConnection InvalidStateError for remote answers.
 * FIXED: Replaced updateDoc with setDoc(..., {merge:true}) for signaling to prevent "No document to update" errors.
 */
export function LiveStreamCreator({ onCloseAction }: { onCloseAction: () => void }) {
  const { user, profile } = useUser();
  const firestore = useFirestore();
  const { actingAs } = useAdminActingAs();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);

  const isAI = !!actingAs;
  const hostName = actingAs ? actingAs.name : (profile?.displayName || user?.displayName || 'User');
  const hostId = isAI ? actingAs.id : user?.uid;

  const sourceVideo = useMemo(() => {
    const raw = resolveLiveSource({ isAI, actingAs, videoUrl });
    return raw ? getCacheBustedUrl(raw) : '';
  }, [isAI, actingAs, videoUrl]);

  const startCamera = useCallback(async () => {
    if (isAI) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      activeStreamRef.current = stream;
      setLocalStream(stream);
      if (previewRef.current) {
        previewRef.current.srcObject = stream;
        previewRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn("Camera access denied.");
    }
  }, [isAI]);

  useEffect(() => {
    startCamera();
    return () => {
      if (activeStreamRef.current && !isLive) {
        activeStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [startCamera, isLive]);

  useEffect(() => {
    if (!user?.uid || !firestore) {
      setIsInitializing(false);
      return;
    }
    const checkSession = async () => {
      try {
        const streamDoc = await getDoc(doc(firestore, 'live', user.uid));
        if (streamDoc.exists() && streamDoc.data().status === 'active') {
          const data = streamDoc.data();
          setTitle(data.title || '');
          setActiveSessionId(data.sessionId || crypto.randomUUID());
          setIsLive(true);
        }
      } catch (e) {} finally { setIsInitializing(false); }
    };
    checkSession();
  }, [user?.uid, firestore]);

  const goLive = async () => {
    if (!user || !firestore) return;
    if (!isAI && !localStream) {
        toast({ variant: 'destructive', title: 'Camera Required' });
        return;
    }
    const currentPhoto = actingAs?.media?.profileImageUrl || profile?.photoURL || user.photoURL || '';
    const sessionId = crypto.randomUUID();
    try {
      await setDoc(doc(firestore, 'live', user.uid), {
        userId: hostId, 
        ownerId: user.uid,   
        displayName: hostName, 
        photoURL: currentPhoto,
        title: title || `${hostName} is live`,
        status: 'active',
        sessionId,
        startedAt: serverTimestamp(),
        videoUrl: isAI ? sourceVideo : null, 
        isAI,
        heartCount: 0,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setActiveSessionId(sessionId);
      setIsLive(true);
    } catch (err) { toast({ variant: 'destructive', title: 'Broadcast Failed' }); }
  };

  const endLive = async () => {
    if (!firestore || !user) return;
    await deleteDoc(doc(firestore, 'live', user.uid)).catch(() => {});
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach(track => track.stop());
      activeStreamRef.current = null;
    }
    setIsLive(false); onCloseAction();
  };

  if (isInitializing) return <div className="h-full flex items-center justify-center bg-black"><Loader /></div>;

  if (isLive) {
    return (
      <div className="fixed inset-0 z-[100] bg-black overflow-hidden h-full w-full">
        <HostDashboardSession 
          ownerId={user!.uid}
          stream={{ displayName: hostName, videoUrl: isAI ? sourceVideo : undefined, sessionId: activeSessionId }}
          localStream={localStream}
          endLiveAction={endLive}
        />
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-background text-white flex flex-col overflow-hidden">
      <div className="relative h-[45vh] w-full bg-zinc-950 flex items-center justify-center overflow-hidden shrink-0 border-b border-white/5 shadow-2xl">
        {isAI ? (
          <video src={sourceVideo} autoPlay loop muted playsInline className="w-full h-full object-cover" />
        ) : (
          <video ref={previewRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
        )}
        <button type="button" onClick={onCloseAction} className="absolute top-10 right-4 bg-black/40 p-2 rounded-full border border-white/10 z-40"><X size={20} /></button>
      </div>
      <div className="flex-1 p-6 space-y-8">
        <h2 className="text-2xl font-bold font-headline text-primary uppercase">Live Setup: {hostName}</h2>
        <Input placeholder="Session Title" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-2xl" />
        <Button onClick={goLive} className="w-full h-14 rounded-[2rem] animated-border-button font-black">Launch Live</Button>
      </div>
    </div>
  );
}

/**
 * HOST DASHBOARD SESSION
 * HARDENED: Multi-peer answer state protection.
 * FIXED: Uses setDoc with merge for viewer presence to prevent "No document to update" errors.
 */
const HostDashboardSession = React.memo(({ ownerId, stream, localStream, endLiveAction }: any) => {
  const { firestore } = useFirebase();
  const { user: currentUser, profile: currentProfile } = useUser();
  const [comments, setComments] = useState<any[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [heartCount, setHeartCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; x: number }[]>([]);
  
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const chatEndRef = useRef<HTMLDivElement>(null);
  const heartCounter = useRef(0);
  const prevHeartCountRef = useRef(0);

  useEffect(() => {
    if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

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

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText || !firestore || !ownerId) return;
    const text = commentText; setCommentText('');
    await addDoc(collection(firestore, 'live', ownerId, 'comments'), {
      user: currentProfile?.displayName || currentUser?.displayName || 'Host',
      text,
      sessionId: stream.sessionId || 'legacy',
      timestamp: serverTimestamp(),
      createdAt: Date.now(),
      color: 'text-amber-400 font-black'
    }).catch(() => {});
  };

  const toggleMic = () => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((t: MediaStreamTrack) => t.enabled = !t.enabled);
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((t: MediaStreamTrack) => t.enabled = !t.enabled);
    setIsVideoOff(!isVideoOff);
  };

  useEffect(() => {
    if (!ownerId || !firestore) return;

    const unsubStream = onSnapshot(doc(firestore, 'live', ownerId), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            const newHearts = data.heartCount || 0;
            if (newHearts > prevHeartCountRef.current) {
                triggerHeartBurst(Math.min(newHearts - prevHeartCountRef.current, 10));
            }
            prevHeartCountRef.current = newHearts;
            setHeartCount(newHearts);
        }
    });

    const unsubViewers = onSnapshot(collection(firestore, 'live', ownerId, 'viewers'), (snap) => {
        setViewerCount(snap.size);
    });

    const qChat = query(
      collection(firestore, 'live', ownerId, 'comments'), 
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubChat = onSnapshot(qChat, (snap) => {
      let msgs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
      if (stream.sessionId) {
        msgs = msgs.filter(m => m.sessionId === stream.sessionId);
      }
      setComments(msgs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)));
    }, (err) => {
      if (err.code === 'permission-denied') return;
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `live/${ownerId}/comments`,
        operation: 'list'
      }));
    });

    return () => {
        unsubStream();
        unsubViewers();
        unsubChat();
    };
  }, [firestore, ownerId, stream.sessionId, triggerHeartBurst]);

  useEffect(() => {
    if (!localStream || !ownerId || !firestore || stream.videoUrl) return;
    const viewersRef = collection(firestore, 'live', ownerId, 'viewers');
    return onSnapshot(viewersRef, (snap) => {
      snap.docChanges().forEach(async (change) => {
        const viewerId = change.doc.id;
        const data = change.doc.data();
        if (change.type === 'added') {
          const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
          peerConnectionsRef.current.set(viewerId, pc);
          localStream.getTracks().forEach((track: MediaStreamTrack) => pc.addTrack(track, localStream));
          pc.onicecandidate = (e: RTCPeerConnectionIceEvent) => {
            if (e.candidate) {
                setDoc(doc(firestore, 'live', ownerId, 'viewers', viewerId), { 
                    hostCandidates: arrayUnion(e.candidate.toJSON()) 
                }, { merge: true }).catch(() => {});
            }
          };
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await setDoc(doc(firestore, 'live', ownerId, 'viewers', viewerId), { 
              offer: { type: offer.type, sdp: offer.sdp } 
          }, { merge: true }).catch(() => {});
        }
        if (change.type === 'modified' && data.answer) {
          const pc = peerConnectionsRef.current.get(viewerId);
          if (pc && pc.signalingState === 'have-local-offer' && !pc.remoteDescription) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
              if (Array.isArray(data.viewerCandidates)) {
                data.viewerCandidates.forEach((c: any) => pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {}));
              }
            } catch (err) {
               console.warn("[WebRTC] Duplicate answer ignored.");
            }
          }
        }
        if (change.type === 'removed') {
          peerConnectionsRef.current.get(viewerId)?.close();
          peerConnectionsRef.current.delete(viewerId);
        }
      });
    });
  }, [localStream, ownerId, firestore, stream.videoUrl]);

  return (
    <div className="flex flex-col h-full w-full bg-black text-white relative overflow-hidden">
       <div className="absolute inset-0 z-0">
          {stream.videoUrl ? (
            <video src={stream.videoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" crossOrigin="anonymous" />
          ) : (
            <video autoPlay playsInline muted ref={(el) => { if(el) el.srcObject = localStream; }} className="w-full h-full object-cover scale-x-[-1]" />
          )}
          <div className="absolute inset-0 bg-black/30" />
       </div>

       <header className="relative z-50 flex items-center justify-between p-4 pt-12 max-w-5xl mx-auto w-full">
          <div className="flex flex-col gap-2">
            <div className="bg-black/60 backdrop-blur-xl px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
               <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
               <span className="text-xs font-black uppercase">LIVE: {stream.displayName}</span>
            </div>
            <div className="flex gap-2">
               <div className="bg-black/60 px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5 text-white shadow-xl">
                  <Eye size={12} className="text-primary" />
                  <span className="text-[10px] font-black">{viewerCount}</span>
               </div>
               <div className="bg-black/60 px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5 text-white shadow-xl">
                  <Heart size={12} className="text-primary fill-primary" />
                  <span className="text-[10px] font-black">{heartCount}</span>
               </div>
            </div>
          </div>
          <Button onClick={endLiveAction} variant="destructive" className="rounded-full font-black uppercase text-[10px] h-10 px-6 shadow-2xl border border-white/10">END LIVE</Button>
       </header>

       <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-4 z-[50] max-h-[35%] overflow-y-auto w-[85%] no-scrollbar pr-4 pointer-events-none">
          <div className="flex flex-col items-start gap-1.5 pointer-events-auto">
             <AnimatePresence mode="popLayout">
                {comments.map((msg) => (
                  <motion.div 
                    key={msg.id} 
                    initial={{ opacity: 0, x: -20 }} 
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "bg-black/40 backdrop-blur-md px-3 py-2 rounded-2xl border shadow-xl",
                      msg.type === 'gift' ? "border-amber-400/40 bg-amber-500/10" : "border-white/5"
                    )}
                  >
                    <p className="text-[12px] leading-tight">
                        <span className={cn("font-black mr-1.5", msg.type === 'gift' ? "text-amber-400" : (msg.color || "text-primary"))}>
                          {msg.user}:
                        </span> 
                        <span className={cn(msg.type === 'gift' ? "text-amber-100 italic font-bold" : "text-white/90")}>
                          {msg.text}
                        </span>
                    </p>
                  </motion.div>
                ))}
                <div ref={chatEndRef} />
             </AnimatePresence>
          </div>
       </div>

       <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] right-4 z-50 flex flex-col gap-3">
          <button className="w-12 h-12 rounded-full bg-black/60 border border-white/10 text-white flex items-center justify-center shadow-2xl" onClick={toggleMic}>
            {isMuted ? <MicOff size={22} className="text-red-500" /> : <Mic size={22} />}
          </button>
          <button className="w-12 h-12 rounded-full bg-black/60 border border-white/10 text-white flex items-center justify-center shadow-2xl" onClick={toggleVideo}>
            {isVideoOff ? <VideoOff size={22} className="text-red-500" /> : <Video size={22} />}
          </button>
          <button className="w-12 h-12 rounded-full bg-black/60 border border-white/10 text-white flex items-center justify-center shadow-2xl"><Users size={22} /></button>
          <button className="w-12 h-12 rounded-full bg-black/60 border border-white/10 text-white flex items-center justify-center shadow-2xl"><Share2 size={22} /></button>
          <button className="w-12 h-12 rounded-full bg-black/60 border border-white/10 text-white flex items-center justify-center shadow-2xl"><MoreHorizontal size={22} /></button>
       </div>

       <footer className="absolute bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] left-4 right-4 z-[60] pointer-events-auto">
          <form onSubmit={handleSendComment} className="h-12 bg-black/60 backdrop-blur-xl rounded-full border border-white/10 flex items-center px-5 shadow-2xl">
             <input 
               className="flex-1 bg-transparent border-none outline-none text-[14px] text-white placeholder:text-white/20" 
               placeholder="Broadcasting..." 
               value={commentText} 
               onChange={(e) => setCommentText(e.target.value)} 
             />
             <button type="submit" className={cn("transition-colors", commentText ? "text-primary" : "text-white/40")}>
               <Send size={20} />
             </button>
          </form>
       </footer>

       <div className="absolute bottom-40 right-10 z-[70] pointer-events-none h-[400px] w-32 overflow-visible">
          <AnimatePresence>
            {hearts.map((h) => (
              <motion.div 
                key={h.id} 
                initial={{ y: 0, opacity: 1, x: h.x, scale: 0.5 }} 
                animate={{ y: -500, opacity: 0, x: h.x + (Math.random() * 40 - 20), scale: 1.5 }} 
                transition={{ duration: 2.5, ease: "easeOut" }} 
                className="absolute bottom-0 right-0 text-primary pointer-events-none"
              >
                <Heart fill="currentColor" size={32} />
              </motion.div>
            ))}
          </AnimatePresence>
       </div>
       
       <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-black/20 z-10" />
    </div>
  );
});

HostDashboardSession.displayName = 'HostDashboardSession';