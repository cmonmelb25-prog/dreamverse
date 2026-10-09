import { cn } from "@/lib/utils";

type PhoneFrameProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Immersive Phone Frame
 * PC VIEW: Shell decoration removed as per user request.
 * MOBILE VIEW: Container ensures content (including input bar) fits within the visible viewport.
 */
export function PhoneFrame({ children, className }: PhoneFrameProps) {
  return (
    <div className={cn("w-full h-dvh md:h-full flex flex-col items-center justify-center bg-transparent", className)}>
      <div className={cn(
        "relative w-full h-full flex flex-col overflow-hidden bg-background transition-all duration-500",
        // Desktop Container (No frame decoration)
        "md:max-w-[450px] md:h-full md:mx-auto md:border-x md:border-white/5"
      )}>
        {/* Content Zone */}
        <div className="flex-1 flex flex-col min-h-0 relative z-10">
          {children}
        </div>
      </div>
    </div>
  );
}
