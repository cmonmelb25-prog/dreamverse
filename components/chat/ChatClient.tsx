'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Mic, 
  X, 
  Heart,
  Loader,
  Image as ImageIcon,
  Smile,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, detectMediaType, isValidMediaUrl } from '@/lib/utils';
import { TimeAgo } from '@/components/ui/time-ago';
import type { Message, AuthorSnapshot, AIGirl, ReactionActor } from '@/lib/types';
import { useUser } from '@/firebase/auth/use-user';
import { useToast } from '@/hooks/use-toast';
import { addChatReactionAction } from '@/server/actions/chat-reactions';
import { REACTION_EMOJIS } from '@/lib/constants';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

/**
 * MESSAGES COMPONENT
 * UPDATED: Matches violet/obsidian reference theme.
 */
export function MessagesComponent({
  messages,
  isReplying,
  chatId,
  currentUserIdentity
}: {
  messages: Message[];
  isReplying: boolean;
  chatId?: string;
  currentUserIdentity: AuthorSnapshot | null;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isReplying]);

  return (
    <div className="flex flex-col min-h-full p-4 pb-4 space-y-4">
      <div className="flex-1" />
      
      {messages.map((msg, index) => (
        <MessageBubble 
          key={msg.id || `msg-${index}`} 
          msg={msg} 
          chatId={chatId}
          currentUserIdentity={currentUserIdentity}
        />
      ))}

      {isReplying && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3"
        >
          <div className="bg-[#1a1a1c] rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 shadow-lg border border-white/5">
            <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" />
          </div>
        </motion.div>
      )}

      <div ref={messagesEndRef} className="h-px w-full shrink-0" />
    </div>
  );
}

function MessageBubble({ 
  msg, 
  chatId,
  currentUserIdentity 
}: { 
  msg: Message; 
  chatId?: string;
  currentUserIdentity: AuthorSnapshot | null;
}) {
  const isMe = msg.sender === 'user' || msg.sender === currentUserIdentity?.id;
  const { toast } = useToast();
  const [popoverOpen, setPopoverOpen] = useState(false);

  const displayMediaUrl = (msg.mediaUrl && isValidMediaUrl(msg.mediaUrl)) ? msg.mediaUrl : null;
  const mediaType = detectMediaType(msg.mediaUrl);

  const handleReaction = async (emoji: string) => {
    if (!chatId || !msg.id || !currentUserIdentity) return;
    setPopoverOpen(false);
    try {
      const reactionActor: ReactionActor = {
        actorId: currentUserIdentity.id,
        actorType: 'user',
        id: currentUserIdentity.id,
        name: currentUserIdentity.name,
        profileImageUrl: currentUserIdentity.profileImageUrl || null,
        author: currentUserIdentity
      };
      await addChatReactionAction({ chatId, messageId: msg.id, emoji, actor: reactionActor });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Reaction failed' });
    }
  };

  return (
    <div className={cn("flex w-full group", isMe ? "justify-end" : "justify-start")}>
      <div className={cn("flex flex-col max-w-[85%] gap-1", isMe ? "items-end" : "items-start")}>
        <div className={cn(
          "relative px-4 py-3 shadow-2xl transition-all duration-300 rounded-[22px]",
          isMe 
            ? "bg-gradient-to-r from-[#6a00f4] to-[#ff0084] text-white rounded-br-[4px]" 
            : "bg-[#1a1a1c] border border-white/5 text-white/90 rounded-bl-[4px]"
        )}>
          {displayMediaUrl && (
            <div className="mb-2 rounded-xl overflow-hidden bg-black/20">
               {mediaType === 'audio' ? (
                 <div className="flex items-center gap-3 bg-primary/20 p-3 rounded-full min-w-[200px]">
                    <Mic size={16} className="text-white" />
                    <div className="flex-1 h-1 bg-white/20 rounded-full relative">
                        <div className="absolute inset-y-0 left-0 bg-white rounded-full w-[40%]" />
                    </div>
                    <span className="text-[10px] font-bold">0:12</span>
                 </div>
               ) : mediaType === 'video' ? (
                 <video src={displayMediaUrl} controls playsInline className="max-h-[300px] rounded-lg" />
               ) : (
                 <img src={displayMediaUrl} alt="Attachment" className="max-h-[300px] object-contain rounded-lg" />
               )}
            </div>
          )}
          {msg.text && <p className="text-[15px] leading-snug font-medium">{msg.text}</p>}
        </div>
        <div className="flex items-center gap-2 px-2">
          <TimeAgo timestamp={msg.timestamp} className="text-[9px] font-black uppercase text-white/20" />
          {!isMe && (
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-primary"><Heart size={10} /></button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-1 bg-black/90 backdrop-blur-xl border-white/10 rounded-full flex gap-1 shadow-2xl">
                {REACTION_EMOJIS.slice(0, 6).map(emoji => (
                  <button key={emoji} onClick={() => handleReaction(emoji)} className="p-1.5 hover:bg-white/10 rounded-full transition-transform hover:scale-125 text-lg">{emoji}</button>
                ))}
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * INPUT COMPONENT
 * REFINED: Layout follows user specification.
 * - Emoji/Images inside left.
 * - Voice inside right.
 * - Send standalone outside.
 */
export function InputComponent({
  girl,
  onSendMessageAction,
  isSending,
  canSendVoice,
  onVipRequiredAction
}: {
  girl: AIGirl;
  onSendMessageAction: (text: string, mediaUrl?: string, type?: any) => void | Promise<void>;
  isSending: boolean;
  canSendVoice?: boolean;
  onVipRequiredAction?: () => void;
}) {
  const { user } = useUser();
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!text && !isRecording) return;
    await onSendMessageAction(text);
    setText('');
  };

  return (
    <div className="input-bar-container w-full p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50">
      <div className="max-w-4xl mx-auto flex items-center gap-3">
        {/* INNER BAR CAPSULE */}
        <div className="relative flex-1 flex items-center bg-[#232326] border border-white/5 rounded-full px-4 h-12 shadow-inner">
           {/* LEFT SIDE: EMOJI & IMAGES */}
           <div className="flex items-center gap-2.5 mr-2">
             <button type="button" className="text-white/40 hover:text-white transition-colors"><Smile size={20} /></button>
             <button type="button" className="text-white/40 hover:text-white transition-colors"><ImageIcon size={18} /></button>
           </div>

           <input 
             value={text} 
             onChange={(e) => setText(e.target.value)} 
             onKeyDown={(e) => e.key === 'Enter' && handleSend()}
             placeholder="Type message..." 
             className="flex-1 bg-transparent border-none outline-none text-white text-[15px] placeholder:text-white/20"
             disabled={isSending}
           />

           {/* RIGHT SIDE: VOICE MESSAGE */}
           <button 
             type="button" 
             className={cn("text-white/40 hover:text-white transition-colors ml-2", isRecording && "text-red-500 animate-pulse")}
           >
             <Mic size={20} />
           </button>
        </div>

        {/* SEND BUTTON: OUTSIDE THE BAR */}
        <button 
          onClick={handleSend}
          disabled={isSending || (!text && !isRecording)}
          className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center transition-all flex-shrink-0",
            text ? "bg-primary text-white scale-105 shadow-[0_0_20px_rgba(106,0,244,0.4)]" : "bg-[#232326] text-white/40"
          )}
        >
          {isSending ? <Loader className="animate-spin h-5 w-5" /> : <Send size={20} />}
        </button>
      </div>
    </div>
  );
}
