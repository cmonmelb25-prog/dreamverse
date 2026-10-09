"use client";

import { useCall } from "@/providers/CallProvider";

type Girl = {
  name: string;
};

type CallContext = {
  girl?: Girl | null;
};

export default function CallEndedScreen() {
  const { girl } = useCall() as CallContext;

  return (
    <div className="h-full w-full bg-black text-white flex flex-col items-center justify-center pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">
        Call Ended
      </h1>

      {girl?.name && (
        <p className="text-sm text-white/70">
          {girl.name}
        </p>
      )}
    </div>
  );
}