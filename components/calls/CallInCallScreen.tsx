"use client";

import React, { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import CallControls from "./CallControls";
import { Keypad } from "./Keypad"; // Removed .tsx extension

interface CallInCallScreenProps {
  name: string;
  image?: string;
  duration: number;
  isMuted: boolean;
  isSpeakerOn: boolean;
  isVideoOn: boolean; 
  mode: 'voice' | 'video'; 
  toggleMuteAction: () => void;
  toggleSpeakerAction: () => void;
  toggleVideoAction: () => void;
  onEndCallAction: () => void | Promise<void>;
  remoteVideoRef?: React.RefObject<HTMLVideoElement | null>;
  localVideoRef?: React.RefObject<HTMLVideoElement | null>;
  onSendDTMF: (digit: string) => void; // New prop for sending DTMF tones
}

/**
 * IN-CALL UI (Reference Match)
 * High-fidelity violet/dark theme with large central avatar for voice.
 */
export default function CallInCallScreen({
  name,
  image,
  duration,
  isMuted,
  isSpeakerOn,
  isVideoOn,
  mode,
  toggleMuteAction,
  toggleSpeakerAction,
  toggleVideoAction,
  onEndCallAction,
  remoteVideoRef,
  localVideoRef,
  onSendDTMF
}: CallInCallScreenProps) {

  const [showKeypad, setShowKeypad] = useState(false);

  const isVideoCall = mode === 'video';

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="h-full w-full bg-[#0a0a0c] text-white flex flex-col items-center justify-between py-16 px-6 overflow-hidden relative">
      
      {/* REMOTE VIDEO (Reference Match) */}
      <div className={cn(
        "absolute inset-0 z-0 bg-black transition-opacity duration-700",
        isVideoCall ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
         <video ref={remoteVideoRef} autoPlay playsInline muted={false} className="w-full h-full object-cover" crossOrigin="anonymous" />
         <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* LOCAL VIDEO PIP */}
      <div className={cn(
        "absolute top-24 right-6 w-32 aspect-[3/4] bg-[#1a1a1c] rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl z-40 transition-all duration-500",
        isVideoOn ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"
      )}>
         <video ref={localVideoRef} autoPlay playsInline muted={true} className="w-full h-full object-cover scale-x-[-1]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center mt-4">
        <h2 className="text-3xl font-bold text-white tracking-tight font-headline">{name}</h2>
        <span className="text-sm font-medium text-white/40 mt-1">{formatDuration(duration)}</span>
      </div>

      {/* VOICE MODE CENTERPIECE (Reference Match) */}
      {!isVideoCall && (
        <div className="relative z-10 flex flex-col items-center justify-center flex-1">
           <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
              <Avatar className="h-48 w-48 border-4 border-white/5 shadow-[0_0_50px_rgba(106,0,244,0.3)] bg-[#1a1a1c]">
                <AvatarImage src={image} className="object-cover object-top" />
                <AvatarFallback className="bg-zinc-800 text-5xl">{name[0]}</AvatarFallback>
              </Avatar>
           </div>
        </div>
      )}

      {showKeypad && (
        <div className="absolute inset-x-0 bottom-0 z-30 bg-[#0a0a0c] p-6 pb-8 transform transition-transform duration-300 ease-out translate-y-0">
          <Keypad onSendDTMF={onSendDTMF} onClose={() => setShowKeypad(false)} />
        </div>
      )}

      <div className={cn("relative z-10 w-full mb-4", showKeypad && "opacity-0 pointer-events-none")}>
        <CallControls 
          isMuted={isMuted}
          isSpeakerOn={isSpeakerOn}
          isVideoOn={isVideoOn}
          toggleMuteAction={toggleMuteAction}
          toggleSpeakerAction={toggleSpeakerAction}
          toggleVideoAction={toggleVideoAction}
          onEndCallAction={onEndCallAction}
          onKeypadAction={() => setShowKeypad(!showKeypad)} // Toggle keypad visibility
        />
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-white/20">
         <Lock size={10} />
         <span>End-to-End Encrypted</span>
      </div>
    </div>
  );
}
