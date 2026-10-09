"use client";

import { useState } from "react";
import { useCall } from "@/providers/CallProvider";
import { MicOff, Volume2, Camera, Sparkles, PhoneOff } from "lucide-react";
import { getPlaceholderImage } from "@/lib/placeholder";
import { Loader } from "../ui/loader";
import Image from "next/image";

export default function CallVideoScreen() {
  const {
    girl,
    callDuration,
    toggleMute,
    toggleSpeaker,
    disableVideoMode,
    endCall,
    isMuted,
    isSpeakerOn,
  } = useCall();

  const [showControls, setShowControls] = useState(true);

  if (!girl) {
    return (
      <div className="h-full w-full bg-black flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  const videoAsset = getPlaceholderImage(girl.id);

  const minutes = Math.floor(callDuration / 60)
    .toString()
    .padStart(2, "0");

  const seconds = (callDuration % 60)
    .toString()
    .padStart(2, "0");

  return (
    <div
      className="relative h-full w-full text-white overflow-hidden pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] bg-black"
      onClick={() => setShowControls((prev) => !prev)}
    >
      {videoAsset ? (
        <Image
          src={videoAsset}
          alt={girl.name}
          fill
          className="object-cover"
          priority
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 bg-black" />
      )}

      <div className="absolute inset-0 bg-black/25" />

      {showControls && (
        <div className="absolute top-10 left-0 right-0 text-center z-10">
          <h1 className="text-2xl font-semibold">{girl.name}</h1>
          <p className="text-sm opacity-80 mt-1">
            {minutes}:{seconds}
          </p>
        </div>
      )}

      {showControls && (
        <div className="absolute bottom-16 left-0 right-0 flex flex-col items-center gap-8 z-10">
          
          <div className="flex gap-10">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
              className={`
                w-14 h-14 rounded-full flex items-center justify-center
                bg-black/40 border border-white/25 backdrop-blur-xl
                ${isMuted ? "bg-white/20" : ""}
                active:scale-95 transition-all
              `}
            >
              <MicOff className="w-6 h-6 text-white" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleSpeaker();
              }}
              className={`
                w-14 h-14 rounded-full flex items-center justify-center
                bg-black/40 border border-white/25 backdrop-blur-xl
                ${isSpeakerOn ? "bg-white/20" : ""}
                active:scale-95 transition-all
              `}
            >
              <Volume2 className="w-6 h-6 text-white" />
            </button>

            <button
              className="
                w-14 h-14 rounded-full flex items-center justify-center
                bg-black/40 border border-white/25 backdrop-blur-xl
                active:scale-95 transition-all
              "
            >
              <Camera className="w-6 h-6 text-white" />
            </button>

            <button
              className="
                w-14 h-14 rounded-full flex items-center justify-center
                bg-black/40 border border-white/25 backdrop-blur-xl
                active:scale-95 transition-all
              "
            >
              <Sparkles className="w-6 h-6 text-white" />
            </button>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              endCall();
            }}
            className="
              w-18 h-18 rounded-full flex items-center justify-center
              bg-red-600 active:scale-95 transition-all
              border border-white/10 shadow-lg
            "
            style={{ width: "4.5rem", height: "4.5rem" }}
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              disableVideoMode();
            }}
            className="text-white/75 text-xs underline mt-1"
          >
            Switch to Voice Call
          </button>
        </div>
      )}
    </div>
  );
}