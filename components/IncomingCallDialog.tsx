"use client";

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, PhoneOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IncomingCallProps {
  callerName: string;
  callerImage?: string;
  mode: 'voice' | 'video';
  onAcceptAction: () => void;
  onDeclineAction: () => void;
}

/**
 * A functional Incoming Call Dialog for User-to-User Messenger calls.
 * Displays the caller's identity and allows the recipient to respond.
 */
export default function IncomingCallDialog({
  callerName,
  callerImage,
  mode,
  onAcceptAction,
  onDeclineAction,
}: IncomingCallProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-[200] animate-in fade-in duration-300">
      <div className="bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 w-full max-w-sm flex flex-col items-center text-center shadow-2xl overflow-hidden relative">
        
        {/* Background Accent */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <Avatar className="h-32 w-32 border-4 border-primary/20 shadow-xl relative z-10">
            <AvatarImage src={callerImage} className="object-cover object-top" />
            <AvatarFallback className="text-4xl">{callerName[0]}</AvatarFallback>
          </Avatar>
        </div>

        <div className="space-y-1 mb-12 relative z-10">
          <h2 className="text-2xl font-bold text-white tracking-tight">{callerName}</h2>
          <p className="text-primary font-black uppercase tracking-widest text-[10px] animate-pulse">
            Incoming {mode === 'video' ? 'Video' : 'Voice'} Call...
          </p>
        </div>

        <div className="flex items-center gap-12 relative z-10">
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={onDeclineAction}
              className="p-5 rounded-full bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/30 transition-all active:scale-90"
            >
              <PhoneOff size={28} />
            </button>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Decline</span>
          </div>

          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={onAcceptAction}
              className="p-5 rounded-full bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-600/30 transition-all active:scale-90"
            >
              <Phone size={28} />
            </button>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
}
