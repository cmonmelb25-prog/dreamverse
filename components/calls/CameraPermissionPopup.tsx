"use client";

import { useCall } from "@/providers/CallProvider";
import { Button } from "@/components/ui/button";

export default function CameraPermissionPopup() {
  const { enableVideoMode, disableVideoMode } = useCall();

  return (
    <div
      className="
        absolute inset-0 z-50
        flex items-center justify-center
        bg-black/40 backdrop-blur-sm
        pb-[env(safe-area-inset-bottom)]
        pt-[env(safe-area-inset-top)]
      "
      role="dialog"
      aria-modal="true"
    >
      <div className="w-72 rounded-2xl bg-[#F2F2F7] text-black text-center shadow-2xl overflow-hidden">

        <div className="px-4 pt-4 pb-3">
          <h3 className="font-semibold text-[15px] leading-snug">
            “DreamVerse” Would Like to Access the Camera
          </h3>

          <p className="text-xs mt-2 text-black/70 leading-relaxed">
            This allows video sharing with the person you’re calling.
          </p>
        </div>

        <div className="border-t border-black/10 grid grid-cols-1">
          <Button
            type="button"
            variant="ghost"
            onClick={disableVideoMode}
            className="rounded-none h-10 text-[15px] text-blue-500 font-normal border-b border-black/10 active:opacity-70"
          >
            Don’t Allow
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={enableVideoMode}
            className="rounded-none h-10 text-[15px] text-blue-500 font-semibold active:opacity-70"
          >
            OK
          </Button>
        </div>

      </div>
    </div>
  );
}