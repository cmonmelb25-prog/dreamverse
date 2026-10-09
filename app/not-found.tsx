import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Compass, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="mb-6 rounded-full bg-primary/10 p-4 border border-primary/20 shadow-[0_0_30px_rgba(255,0,132,0.2)]">
        <Compass className="h-12 w-12 text-primary animate-pulse" />
      </div>

      <h2 className="mb-2 font-headline text-4xl font-bold text-white tracking-tight">
        Lost in the Multiverse
      </h2>
      
      <p className="mb-8 max-w-md text-muted-foreground text-sm leading-relaxed">
        The coordinates you requested don't exist in this reality. Let's get you back to the main observatory.
      </p>

      <Button asChild className="animated-border-button px-10 h-12">
        <Link href="/feed">
          <Home className="mr-2 h-4 w-4" />
          <span>Return Home</span>
        </Link>
      </Button>
      
      <div className="mt-12 text-[10px] font-black uppercase tracking-[0.3em] text-white/10">
        Error 404 // Coordinate Mismatch
      </div>
    </div>
  );
}
