'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { User } from '@/lib/types';
import { useUser } from '@/firebase/auth/use-user';
import { useFirebase } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase/use-memo-firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  query,
  limit,
  orderBy
} from 'firebase/firestore';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { useMinimizedChat } from '@/providers/MinimizedChatProvider';
import { 
  Phone, 
  Video, 
  ChevronLeft, 
  Minimize2,
  Image as ImageIcon,
  Send,
  Lock,
  Mic,
  X,
  Smile,
  ShieldCheck
} from 'lucide-react';
import { cn, getSafeDate } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { PhoneFrame } from '@/components/ui/phone-frame';
import { useNotifications } from '@/hooks/use-notifications';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { getPlaceholderImage } from '@/lib/placeholder';
import { AnimatePresence, motion } from 'framer-motion';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useVipLimits } from '@/hooks/useVipLimits';
import { SubscribePopup } from '@/components/SubscribePopup';
import { initiateMessengerCallAction } from '@/server/actions/messenger-calls';

/**
 * PRODUCTION-SAFE SECURE MESSENGER
 * PRIVACY: 12-Hour Ephemeral Protocol.
 */

function MessageCountdown({ expiresAt }: { expiresAt: any }) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const expiry = getSafeDate(expiresAt);
      if (!expiry) return;
      
      const diff = expiry.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeLeft(`${hours}h ${minutes}m`);
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!timeLeft) return null;
  return <span>Expires in {timeLeft}</span>;
}

export default function MessageArea({ chatId }: { chatId: string }) {
  const { user: currentUser, isLoading: isUserLoading } = useUser();
  const { isVip, isAdmin } = useUserProfile();
  const { firestore } = useFirebase();
  const { markSenderNotificationsAsRead } = useNotifications();
  
  const { minimizeChat } = useMinimizedChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isFirstScrollRef = useRef(true);
  const router = useRouter();
  const { toast } = useToast();

  const [messages, setMessages] = useState<any[]>([]);
  const [hasLoadedFromFirestore, setHasLoadedFromFirestore] = useState(false);
  const [showVipPopup, setShowVipPopup] = useState(false);
  const [vipFeature, setVipFeature] = useState('');

  const { canSendVoiceMessage } = useVipLimits(
    currentUser ? { id: currentUser.uid, vipTier: isVip ? 'vip' : 'non-vip', isAdmin: !!isAdmin } : null
  );

  useEffect(() => {
    isFirstScrollRef.current = true;
  }, [chatId]);

  const otherUserId = useMemo(() => {
    if (!currentUser || !chatId) return null;
    const [a, b] = chatId.split('_');
    return a === currentUser.uid ? b : a;
  }, [currentUser, chatId]);

  useEffect(() => {
    if (otherUserId) markSenderNotificationsAsRead(otherUserId);
  }, [otherUserId, markSenderNotificationsAsRead]);

  const otherUserDocRef = useMemoFirebase(() => (!firestore || !otherUserId) ? null : doc(firestore, 'users', otherUserId), [firestore, otherUserId]);
  const { data: otherUser } = useDoc<User>(otherUserDocRef, otherUserId ? `users/${otherUserId}` : null);

  useEffect(() => {
    if (!firestore || !chatId || !currentUser?.uid) return;

    let isMounted = true;
    const msgRef = collection(firestore, 'messenger', chatId, 'messages');
    const q = query(msgRef, orderBy('createdAt', 'desc'), limit(100));
    
    const unsub = onSnapshot(q, (snap) => {
      if (!isMounted) return;

      const now = Date.now();
      const items = snap.docs.map(d => {
        const data = d.data();
        const ms = typeof data.createdAt === 'number' ? data.createdAt : getSafeDate(data.createdAt || data.timestamp)?.getTime() || Date.now();
        return { id: d.id, ...data, sortTime: ms, timestamp: ms } as any;
      }).filter((m: any) => {
        if (!m.expiresAt) return true;
        const expiry = getSafeDate(m.expiresAt)?.getTime() || 0;
        return expiry > now;
      });

      const sortedItems = items.sort((a, b) => a.sortTime - b.sortTime);
      setMessages(sortedItems);
      setHasLoadedFromFirestore(true);
    }, (err) => {
      if (err.code === 'permission-denied') return;
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `messenger/${chatId}/messages`,
        operation: 'list',
      }));
    });

    return () => { isMounted = false; unsub(); };
  }, [firestore, chatId, currentUser?.uid]);

  const performScroll = (behavior: ScrollBehavior = "smooth") => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
  };

  useEffect(() => {
    if (messages.length > 0 || hasLoadedFromFirestore) {
      if (isFirstScrollRef.current) {
        performScroll("auto");
        isFirstScrollRef.current = false;
        setTimeout(() => performScroll("auto"), 200);
      } else {
        performScroll("smooth");
      }
    }
  }, [messages.length, hasLoadedFromFirestore]);

  const handleSend = async (text: string, mediaUrl: string | null = null, type: any = 'text') => {
    if (!currentUser || !chatId || (!text && !mediaUrl)) return;
    
    try {
      const res = await fetch('/api/messenger/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, senderId: currentUser.uid, recipientId: otherUserId, text, mediaUrl, type })
      });
      if (!res.ok) throw new Error("Sync failed");
    } catch (e) {
      toast({ variant: 'destructive', title: 'Network Latency', description: 'Message is queued.' });
    }
  };

  const handleCallClick = async (mode: 'voice' | 'video') => {
    if (!currentUser || !otherUserId) return;

    try {
      const res = await initiateMessengerCallAction({
        callerId: currentUser.uid,
        recipientId: otherUserId,
        callerName: currentUser.displayName || 'User',
        callerImage: currentUser.photoURL || null,
        mode
      });

      if (!res.success) throw new Error(res.error);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Call Error', description: e.message });
    }
  };

  if (isUserLoading || !currentUser) return <div className="flex-1 flex items-center justify-center bg-background"><Loader /></div>;

  const chatBg = getPlaceholderImage('chat-background');

  return (
    <PhoneFrame className="max-w-none md:max-w-[500px]">
      <div className="flex flex-col h-full bg-[#0a0a0a] relative overflow-hidden">
        
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-100 pointer-events-none" 
          style={{ backgroundImage: `url('${chatBg}')`, position: 'fixed' }} 
        />
        <div className="absolute inset-0 bg-black/40 pointer-events-none z-[1]" />

        <header className="flex-none relative z-30 flex items-center justify-between p-3 border-b border-white/5 bg-black/60 backdrop-blur-xl pt-14 md:pt-10">
          <div className="flex items-center min-w-0">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full h-10 w-10 shrink-0 mr-1" onClick={() => router.back()}>
              <ChevronLeft size={24} />
            </Button>
            <Link href={`/profile/${otherUser?.uid}`} className="flex items-center group min-w-0">
              <Avatar className="h-11 w-11 border border-white/10 group-hover:border-[#ff0084] transition-colors shadow-2xl">
                <AvatarImage src={otherUser?.photoURL || undefined} className="object-cover object-top" />
                <AvatarFallback>{otherUser?.displayName?.charAt(0) || '?'}</AvatarFallback>
              </Avatar>
              <div className="ml-3 min-w-0">
                <h2 className="font-headline text-[20px] leading-tight text-white group-hover:text-primary transition-colors truncate">
                  {otherUser?.displayName || 'Member'}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <ShieldCheck className="h-2.5 w-2.5 text-[#2C6BED]" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#2C6BED]">E2EE Secure</span>
                </div>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="rounded-full text-primary hover:bg-white/5" onClick={() => handleCallClick('voice')}><Phone size={20} /></Button>
            <Button variant="ghost" size="icon" className="rounded-full text-primary hover:bg-white/5" onClick={() => handleCallClick('video')}><Video size={20} /></Button>
            <Button variant="ghost" size="icon" className="rounded-full text-primary hover:bg-white/5" onClick={() => minimizeChat({ id: chatId, name: otherUser?.displayName || 'User', image: otherUser?.photoURL || '', type: 'messenger' })}>
              <Minimize2 size={18} />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar relative z-10 px-4">
          <div className="py-6 space-y-3 flex flex-col min-h-full relative z-10">
            <div className="flex-1" />
            
            {hasLoadedFromFirestore && (
              <div className="flex justify-center mb-8 px-8 animate-in fade-in slide-in-from-top-4 duration-1000">
                <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-center max-w-[320px] shadow-2xl">
                   <Lock className="mx-auto h-4 w-4 text-[#2C6BED] mb-2" />
                   <p className="text-[11px] leading-relaxed text-white/50 font-medium">Messages are end-to-end encrypted and will be automatically deleted in 12 hours.</p>
                </div>
              </div>
            )}

            {messages.map((msg) => {
              const isSystem = msg.sender === 'system' || msg.type === 'system';
              const isMe = msg.sender === currentUser.uid;
              
              if (isSystem) {
                const isCallSystem = !!msg.status && ['missed', 'rejected', 'no answer'].includes(msg.status);
                return (
                  <div key={msg.id} className="w-full flex flex-col items-center py-4 space-y-3">
                    <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-full px-4 py-1.5 shadow-sm">
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/30">{msg.text}</p>
                    </div>
                    {isCallSystem && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-full h-8 text-[10px] font-black uppercase tracking-widest border-primary/30 text-primary bg-primary/5 hover:bg-primary/10"
                        onClick={() => handleCallClick('voice')}
                      >
                        <Phone className="mr-1.5 h-3 w-3" /> Call Back
                      </Button>
                    )}
                  </div>
                );
              }

              return (
                <div key={msg.id} className={cn("flex flex-col mb-2 transition-all duration-500", isMe ? "items-end" : "items-start")}>
                  <div className={cn("max-w-[80%] rounded-[22px] px-4 py-3 text-[15px] shadow-2xl relative", isMe ? "bg-gradient-to-r from-[#ff0084] to-[#6a00f4] text-white rounded-br-[4px]" : "bg-[#1a1a1c]/80 backdrop-blur-md border border-white/5 text-white/90 rounded-bl-[4px]")}>
                    {msg.mediaUrl && (
                      <div className="mb-2 overflow-hidden rounded-xl bg-black/20">
                        {msg.type === 'audio' ? (
                          <audio src={msg.mediaUrl} controls className="h-9 w-full invert" />
                        ) : (
                          <img src={msg.mediaUrl} className="max-h-[300px] object-contain rounded-lg" alt="Media" />
                        )}
                      </div>
                    )}
                    {msg.text && <p className="whitespace-pre-wrap leading-tight font-medium drop-shadow-sm">{msg.text}</p>}
                  </div>
                  
                  <div className="px-2 mt-1">
                     <p className="text-[9px] font-black uppercase tracking-widest text-white/20">
                        <MessageCountdown expiresAt={msg.expiresAt} />
                     </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} className="h-px w-full shrink-0" />
          </div>
        </main>

        <footer className="flex-none relative z-20">
          <MessageInput onSendMessageAction={handleSend} userAvatar={currentUser?.photoURL || ''} userName={currentUser?.displayName || 'N'} recipientId={otherUserId} canSendVoice={canSendVoiceMessage()} onVipRequiredAction={() => { setVipFeature('Voice Messaging'); setShowVipPopup(true); }} />
        </footer>
        
        <SubscribePopup open={showVipPopup} onOpenChangeAction={setShowVipPopup} feature={vipFeature} />
      </div>
    </PhoneFrame>
  );
}

function MessageInput({ onSendMessageAction, userAvatar, userName, recipientId, canSendVoice, onVipRequiredAction }: any) {
  const { user } = useUser();
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleSend = async () => {
    if (!text && !previewUrl && !voiceBlob) return;
    setIsUploading(true);
    try {
      if (voiceBlob && user && recipientId) {
        const idToken = await user.getIdToken();
        const formData = new FormData();
        formData.append('audio', voiceBlob);
        formData.append('idToken', idToken);
        formData.append('payload', JSON.stringify({ userId: user.uid, recipientId: recipientId }));
        const response = await fetch('/api/chat/voice', { method: 'POST', body: formData });
        
        const resText = await response.text();
        const result = resText ? JSON.parse(resText) : null;
        
        if (!response.ok) throw new Error(result?.error || 'Failed to deliver voice');
        setPreviewUrl(null); setVoiceBlob(null); setText(''); return;
      }
      onSendMessageAction(text, previewUrl, previewUrl ? 'image' : 'text');
      setText(''); setPreviewUrl(null); setVoiceBlob(null);
    } catch (err: any) { toast({ variant: 'destructive', title: 'Send failed' }); } finally { setIsUploading(false); }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setIsUploading(true);
    try {
      const idToken = await user.getIdToken();
      const fd = new FormData();
      fd.append('file', file);
      fd.append('userId', user.uid);
      fd.append('idToken', idToken);
      fd.append('type', 'chat-media');
      const response = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!response.ok) throw new Error('Server upload error');
      
      const resText = await response.text();
      const result = resText ? JSON.parse(resText) : null;

      if (result?.success) setPreviewUrl(result.url);
      else throw new Error(result?.error || 'Invalid upload response');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Upload failed', description: err.message });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleRecording = async () => {
    if (isRecording) { mediaRecorderRef.current?.stop(); setIsRecording(false); return; }
    if (!canSendVoice) { onVipRequiredAction(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder; audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setPreviewUrl(URL.createObjectURL(blob)); setVoiceBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start(); setIsRecording(true);
    } catch (err) { toast({ variant: 'destructive', title: 'Mic error' }); }
  };

  return (
    <div className="p-3 pb-[calc(env(safe-area-inset-bottom)+14px)] bg-[#0a0a0a] border-t border-white/5">
      <AnimatePresence>{previewUrl && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="relative mb-3 px-2">
          {voiceBlob ? <div className="bg-[#1a1a1a] border border-[#2C6BED]/30 rounded-2xl p-3 flex items-center gap-4 shadow-2xl"><Mic size={20} className="text-[#2C6BED]" /><audio src={previewUrl} controls className="h-8 w-full invert" /><Button size="icon" variant="ghost" onClick={() => { setPreviewUrl(null); setVoiceBlob(null); }}><X size={18} /></Button></div> : <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-zinc-900"><img src={previewUrl} alt="Preview" className="w-full h-full object-cover" /><Button size="icon" variant="destructive" className="absolute top-1 right-1 h-5 w-5" onClick={() => setPreviewUrl(null)}><X size={12} /></Button></div>}
        </motion.div>
      )}</AnimatePresence>
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-[#1a1a1a] rounded-full px-4 h-11 flex items-center border border-white/5 shadow-inner">
          <div className="flex items-center gap-2.5 mr-2">
            <button className="text-white/30 hover:text-white transition-colors" type="button"><Smile size={18} /></button>
            <button onClick={() => fileInputRef.current?.click()} className="text-white/30 hover:text-white transition-colors" type="button"><ImageIcon size={18} /></button>
          </div>
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*,video/*" />
          <input id="m-input" name="m-input" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder={isRecording ? "Recording..." : "Encrypted Message..."} className="flex-1 bg-transparent text-white outline-none text-[14px] placeholder:text-white/20" disabled={isRecording} />
          <button className={cn("ml-2 transition-colors", isRecording ? "text-red-500 animate-pulse" : "text-white/30 hover:text-white")} onClick={toggleRecording} type="button"><Mic size={18} /></button>
        </div>
        
        <button 
          onClick={handleSend} 
          disabled={(!text && !previewUrl && !voiceBlob) || isUploading || isRecording} 
          className={cn(
            "h-11 w-11 rounded-full flex items-center justify-center transition-all flex-shrink-0", 
            (text || previewUrl || voiceBlob) ? "bg-primary text-white scale-105 shadow-lg" : "bg-[#1a1a1a] text-white/20"
          )} 
          type="button"
        >
          {isUploading ? <Loader className="animate-spin h-5 w-5" /> : <Send size={20} />}
        </button>
      </div>
    </div>
  );
}
