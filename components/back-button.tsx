'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BackButton({ className, showText = true }: { className?: string; showText?: boolean }) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      onClick={() => router.back()}
      className={cn("mb-4", className)}
    >
      <ChevronLeft className={cn("h-4 w-4", showText && "mr-2")} />
      {showText && 'Back'}
    </Button>
  );
}
