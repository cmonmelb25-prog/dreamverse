"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
  Users,
  Grid3x3,
  Volume2,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { vibrate } from "@/lib/haptics";

/**
 * Reusable iOS-Style Control Button
 * UPDATED: Includes haptic feedback for every interaction.
 */
const ControlButton = ({
  icon: Icon,
  label,
  onClick,
  isActive = false,
  disabled = false,
}: {
  icon: any;
  label: string;
  onClick?: () => void;
  isActive?: boolean;
  disabled?: boolean;
}) => (
  <div className="flex flex-col items-center gap-2">
    <button
      onClick={() => {
        vibrate(30);
        try {
          onClick && onClick();
        } catch (err) {
          console.error("[CallControls] ControlButton handler error:", err);
        }
      }}
      disabled={disabled}
      type="button"
      className={cn(
        "h-14 w-14 md:h-16 md:w-16 rounded-full flex items-center justify-center transition-all active:scale-95 border border-white/10 shadow-lg",
        isActive 
          ? "bg-white text-slate-900" 
          : "bg-white/10 text-white hover:bg-white/20",
        disabled && "opacity-30 cursor-not-allowed"
      )}
    >
      <Icon size={24} />
    </button>
    <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">{label}</span>
  </div>
);

interface CallControlsProps {
  isMuted: boolean;
  isSpeakerOn: boolean;
  isVideoOn?: boolean;
  toggleMuteAction: () => void;
  toggleSpeakerAction: () => void;
  toggleVideoAction?: () => void;
  onEndCallAction: () => void | Promise<void>;
  onAddCallAction?: () => void;
  onKeypadAction?: () => void;
  onContactsAction?: () => void;
}

export default function CallControls({
  isMuted,
  isSpeakerOn,
  isVideoOn = false,
  toggleMuteAction,
  toggleSpeakerAction,
  toggleVideoAction,
  onEndCallAction,
  onAddCallAction = () => {},
  onKeypadAction = () => {},
  onContactsAction = () => {},
}: CallControlsProps) {
  return (
    <div className="w-full flex flex-col items-center gap-12 pb-8">
      {/* 2x3 iOS Grid */}
      <div className="grid grid-cols-3 gap-y-6 gap-x-6 justify-items-center w-full max-w-sm">
        <ControlButton
          icon={isMuted ? MicOff : Mic}
          label="mute"
          onClick={toggleMuteAction}
          isActive={isMuted}
        />
        <ControlButton 
          icon={Plus} 
          label="add call" 
          onClick={onAddCallAction} 
        />
        <ControlButton 
          icon={Grid3x3} 
          label="keypad" 
          onClick={onKeypadAction} 
        />
        <ControlButton
          icon={Volume2}
          label="speaker"
          onClick={toggleSpeakerAction}
          isActive={isSpeakerOn}
        />
       {toggleVideoAction && (
          <ControlButton
            icon={isVideoOn ? Video : VideoOff}
            label="video"
            onClick={toggleVideoAction}
            isActive={isVideoOn}
          />
        )}

        <ControlButton 
          icon={Users} 
          label="contacts" 
          onClick={onContactsAction} 
        />
      </div>

      {/* Main End Call Button - Lowered for Ergonomics */}
      <Button
        type="button"
        variant="destructive"
        size="icon"
        onClick={() => {
          vibrate(100);
          try {
            // onEndCallAction may be async; guard against exceptions
            onEndCallAction && (onEndCallAction as any)();
          } catch (err) {
            console.error("[CallControls] onEndCallAction error:", err);
          }
        }}
        className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 shadow-2xl shadow-red-500/20 active:scale-90 transition-all border border-white/10"
      >
        <PhoneOff size={32} />
      </Button>
    </div>
  );
}
