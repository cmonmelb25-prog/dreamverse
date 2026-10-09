"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Phone, PhoneOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface CallIncomingScreenProps {
  name: string;
  image?: string;
  onAcceptAction: () => void | Promise<void>;
  onDeclineAction: () => void | Promise<void>;
  mode?: "voice" | "video";
}

/**
 * Incoming Call Screen
 * Handles the "Ringing" state for the recipient.
 */
export default function CallIncomingScreen({
  name,
  image,
  onAcceptAction,
  onDeclineAction,
  mode = "voice",
}: CallIncomingScreenProps) {
  return (
    <div className="h-full w-full bg-slate-900 text-white flex flex-col items-center justify-between py-24 px-6 overflow-hidden">
      
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-600/40 via-indigo-900 to-slate-950 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] aspect-square bg-blue-500/10 blur-[150px] pointer-events-none" />

      {/* TOP: Identity */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-4">
        <h2 className="text-4xl font-bold text-white tracking-tight">{name}</h2>
        <p className="text-white/40 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">
          Incoming {mode}...
        </p>
      </div>

      {/* MIDDLE: Avatar */}
      <div className="relative z-10">
        <div className="absolute inset-[-20px] rounded-full bg-white/5 animate-ping [animation-duration:3000ms]" />
        <Avatar className="h-40 w-40 border-4 border-white/5 shadow-2xl relative z-10 bg-zinc-900/50">
          <AvatarImage src={image} className="object-cover object-top" />
          <AvatarFallback className="text-4xl bg-zinc-800 text-white/20">{name[0]}</AvatarFallback>
        </Avatar>
      </div>

      {/* BOTTOM: Actions */}
      <div className="relative z-10 flex items-center gap-16 w-full justify-center mb-12">
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={onDeclineAction}
            className="h-16 w-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-2xl shadow-red-500/20 active:scale-90 transition-all border border-white/10"
          >
            <PhoneOff size={32} />
          </button>
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Decline</span>
        </div>

        <div className="flex flex-col items-center gap-4">
          <button
            onClick={onAcceptAction}
            className="h-16 w-16 rounded-full bg-green-500 text-white flex items-center justify-center shadow-2xl shadow-green-500/20 active:scale-90 transition-all border border-white/10"
          >
            <Phone size={32} />
          </button>
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Accept</span>
        </div>
      </div>
    </div>
  );
}
