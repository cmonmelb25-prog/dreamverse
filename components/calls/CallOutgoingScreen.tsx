"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { PhoneOff } from "lucide-react";
import { Button } from "../ui/button";

interface CallOutgoingScreenProps {
  name: string;
  image?: string;
  onEndCallAction: () => void | Promise<void>;
}

/**
 * Outgoing Call Screen
 * Handles the "Calling" state for the initiator.
 * UPDATED: Lowered End Call button for ergonomic thumb accessibility.
 */
export default function CallOutgoingScreen({
  name,
  image,
  onEndCallAction,
}: CallOutgoingScreenProps) {
  return (
    <div className="h-full w-full bg-slate-900 text-white flex flex-col items-center justify-between py-16 px-6 overflow-hidden">
      
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-600/40 via-indigo-900 to-slate-950 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] aspect-square bg-blue-500/10 blur-[150px] pointer-events-none" />

      {/* TOP: Identity */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <h2 className="text-3xl font-bold text-white tracking-tight">{name}</h2>
        <span className="text-xs font-black uppercase tracking-[0.2em] text-white/40 animate-pulse mt-8">
          Calling...
        </span>
      </div>

      {/* MIDDLE: Avatar */}
      <div className="relative z-10 flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-[-10px] rounded-full bg-white/5 animate-ping [animation-duration:2000ms]" />
          <Avatar className="h-36 w-36 border-4 border-white/5 shadow-2xl relative z-10 bg-zinc-900/50">
            <AvatarImage src={image} className="object-cover object-top" />
            <AvatarFallback className="bg-zinc-800 text-4xl text-white/20">
              {name[0]}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* BOTTOM: Hangup - Lowered for Ergonomics */}
      <div className="relative z-10 w-full flex justify-center mb-24">
        <Button 
          type="button"
          variant="destructive" 
          size="icon" 
          onClick={onEndCallAction}
          className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 shadow-2xl shadow-red-500/20 active:scale-90 transition-all border border-white/10"
        >
          <PhoneOff size={32} />
        </Button>
      </div>
    </div>
  );
}
