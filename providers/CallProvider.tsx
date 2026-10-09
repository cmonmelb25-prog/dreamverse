"use client";

import React, { createContext, useContext, ReactNode, useEffect } from "react";
import { useCallEngine } from "./useCallEngine";
import type { AIGirl } from "@/lib/types";
import { useUser } from "@/firebase/auth/use-user";
import { useRouter } from "next/navigation";
import { useVipLimits } from "@/hooks/useVipLimits";
import { useToast } from "@/hooks/use-toast";
import { Loader } from "@/components/ui/loader";

export type CallProviderProps = {
  children: ReactNode;
  initialGirl: AIGirl;
  initialMode: "voice" | "video";
};

type CallEngineType = ReturnType<typeof useCallEngine>;

const CallContext = createContext<CallEngineType | null>(null);

export function CallProvider({
  children,
  initialGirl,
  initialMode,
}: CallProviderProps) {
  const engine = useCallEngine(initialGirl, initialMode);
  const router = useRouter();
  const { user, vipTier, isAdmin, isLoading: isUserLoading } = useUser();
  const { canVoiceCall, canVideoCall } = useVipLimits({
    id: user?.uid || "",
    vipTier: vipTier || "non-vip",
    isAdmin: !!isAdmin,
  });
  const { toast } = useToast();

  // VIP gating
  useEffect(() => {
    if (isUserLoading) return;

    const canPlaceCall =
      initialMode === "video"
        ? canVideoCall(initialGirl)
        : canVoiceCall(initialGirl);

    const featureName =
      initialMode === "video" ? "Video calls" : "Voice calls";

    if (!canPlaceCall) {
      toast({
        title: "VIP Access Required",
        description: `${featureName} with ${initialGirl.name} are a premium feature.`,
        variant: "destructive",
      });

      router.replace(`/profile/${initialGirl.id}`);
    }
  }, [
    isUserLoading,
    canVoiceCall,
    canVideoCall,
    initialGirl,
    router,
    toast,
    initialMode,
  ]);

  const canPlaceCall =
    initialMode === "video"
      ? canVideoCall(initialGirl)
      : canVoiceCall(initialGirl);

  if (isUserLoading || !canPlaceCall) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <CallContext.Provider value={engine}>
      {children}
    </CallContext.Provider>
  );
}

export function useCall(): CallEngineType {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
}
