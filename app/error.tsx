'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Bug, RefreshCcw, Send } from 'lucide-react';
import Link from 'next/link';

/**
 * Global Error Boundary (Shielded)
 * Replaces technical error messages with a friendly bug-reporting interface.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Technical logging for developers (Console only)
    console.error('DreamVerse Runtime Exception:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center relative overflow-hidden">
      {/* Visual background elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] aspect-square bg-primary/5 blur-[120px] pointer-events-none rounded-full" />
      
      <div className="relative z-10 space-y-6 max-w-md animate-in fade-in zoom-in duration-500">
        <div className="inline-flex items-center justify-center rounded-[2rem] bg-amber-500/10 p-6 border border-amber-500/20 shadow-[0_0_40px_rgba(245,158,11,0.15)] mb-2">
          <Bug className="h-12 w-12 text-amber-500 animate-pulse" />
        </div>
        
        <div className="space-y-2">
          <h2 className="font-headline text-3xl font-bold text-white tracking-tight leading-tight">
            Oops! Looks like you found a bug.
          </h2>
          
          <p className="text-white/60 text-sm leading-relaxed px-4">
            Our observatory sensors detected a timeline glitch. Help us catch it and report the issue so we can stabilize the reality.
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <Button
            asChild
            className="animated-border-button h-12 rounded-2xl shadow-xl font-bold uppercase tracking-widest text-xs"
          >
            <Link href="/settings?report=true">
              <Send className="mr-2 h-4 w-4" />
              <span>Report Issue</span>
            </Link>
          </Button>
          
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => reset()}
              className="border-white/10 bg-white/5 hover:bg-white/10 h-12 rounded-2xl text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white"
            >
              <RefreshCcw className="mr-2 h-3 w-3" />
              <span>Restore</span>
            </Button>

            <Button
              asChild
              variant="ghost"
              className="h-12 rounded-2xl text-xs font-bold uppercase tracking-widest text-white/20 hover:text-white"
            >
              <Link href="/feed">
                Exit to Feed
              </Link>
            </Button>
          </div>
        </div>

        <div className="pt-8 opacity-20">
          <p className="text-[10px] font-black uppercase tracking-[0.4em]">System Error // Glitch Identified</p>
        </div>
      </div>
      
      {/* Error details hidden in production, shown only in dev console */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-12 group max-w-full relative z-20">
          <summary className="text-[9px] font-black uppercase tracking-widest text-white/10 cursor-pointer hover:text-white/30 transition-colors list-none">
            Technical Coordinates (Developer Only)
          </summary>
          <pre className="mt-4 max-w-lg overflow-auto rounded-2xl bg-black/40 border border-white/5 p-4 text-left text-[10px] text-amber-500/60 no-scrollbar">
            {error.message}
          </pre>
        </details>
      )}
    </div>
  );
}
