"use client";

import React from "react";
import { Phone } from "lucide-react";
import { useCall } from "@/providers/CallProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPlaceholderImage } from "@/lib/placeholder";
import { Loader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";

type Girl = {
  id: string;
  name: string;
};

type CallContextLite = {
  initiateCall?: () => void;
  girl: Girl | null;
};

export default function CallIdleScreen() {
  const engine = useCall() as CallContextLite;

  const { initiateCall, girl } = engine;

  if (!girl) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-black">
        <Loader />
      </div>
    );
  }

  const girlImage = getPlaceholderImage(girl.id);

  return (
    <div className="h-full w-full bg-black text-white flex flex-col items-center justify-between pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <div className="absolute top-4 left-4">
        <BackButton />
      </div>

      <div className="mt-10 flex flex-col items-center gap-3 px-6 text-center">
        <span className="text-xs text-white/60">mobile</span>
        <h1 className="text-2xl font-semibold tracking-tight">
          {girl.name}
        </h1>
      </div>

      <div className="flex flex-col items-center gap-6">
        <Avatar
          className="shadow-xl border border-white/20"
          style={{ width: "7rem", height: "7rem" }}
        >
          {girlImage && <AvatarImage src={girlImage} />}
          <AvatarFallback className="text-3xl">
            {girl.name.charAt(0)}
          </AvatarFallback>
        </Avatar>

        <span className="text-sm text-white/70">
          Ready to start a call
        </span>
      </div>

      <div className="mb-10">
        <Button
          size="icon"
          onClick={() => initiateCall?.()}
          className="rounded-full bg-green-600 hover:bg-green-700 active:scale-95 transition-all"
          style={{ width: "4.8rem", height: "4.8rem" }}
        >
          <Phone className="w-6 h-6 text-white" />
        </Button>
      </div>
    </div>
  );
}