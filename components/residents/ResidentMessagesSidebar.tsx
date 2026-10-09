'use client';

import { Search, Sparkles, ChevronLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import ResidentChatList from './ResidentChatList';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * AI Resident Chat Sidebar.
 * LAYOUT: Observatory styling with fixed heading.
 */
export default function ResidentMessagesSidebar() {
  return (
<div className="flex flex-1 flex-col min-h-0 bg-background relative overflow-visible">
      <div className="flex-none pt-2">
        <header className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-primary/10 hover:bg-primary/20 text-primary">
              <Link href="/feed" aria-label="Back to Feed">
                <ChevronLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 font-headline">
              INBOX <Sparkles className="h-5 w-5 text-primary" />
            </h1>
          </div>
        </header>

        <div className="px-4 pb-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search conversations..."
              className="bg-zinc-800/50 rounded-full pl-10 border-transparent focus-visible:ring-primary h-9 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <ResidentChatList />
        </ScrollArea>
      </div>
    </div>
  );
}
