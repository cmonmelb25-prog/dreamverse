'use client';

import { Pencil, Search, ChevronLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ChatList from './ChatList';
import Stories from './Stories';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';

/**
 * Signal-style Messenger Sidebar.
 * Clean, fast, and secure aesthetic.
 */
export default function MessagesSidebar() {
  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] overflow-hidden border-r border-white/5">

      {/* FIXED TOP SECTION */}
      <div className="flex-none">
        <header className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-zinc-800/50 hover:bg-zinc-700 text-white">
              <Link href="/feed" aria-label="Back to Feed">
                <ChevronLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex flex-col">
               <h1 className="text-xl font-bold tracking-tight text-white leading-tight">Messages</h1>
               <div className="flex items-center gap-1 opacity-40">
                  <Lock size={8} />
                  <span className="text-[8px] font-black uppercase tracking-widest">End-to-End Encrypted</span>
               </div>
            </div>
          </div>
          <Button asChild variant="secondary" size="icon" className="rounded-full h-9 w-9 bg-[#2C6BED] hover:bg-[#255bc9] text-white shadow-lg shadow-[#2C6BED]/20">
            <Link href="/browse" aria-label="Start a new message">
                <Pencil className="h-4 w-4" />
            </Link>
          </Button>
        </header>

        {/* Search: Capsule Style */}
        <div className="px-4 pb-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 group-focus-within:text-[#2C6BED] transition-colors" />
            <Input
              suppressHydrationWarning
              placeholder="Search"
              className="bg-zinc-900 border-none rounded-full pl-9 focus-visible:ring-1 focus-visible:ring-[#2C6BED] h-9 text-sm text-white placeholder:text-white/20"
            />
          </div>
        </div>

        {/* Stories - Horizontal Scroll */}
        <Stories />
      </div>

      {/* SCROLLABLE LIST SECTION */}
      <div className="flex-1 min-h-0 pt-2">
        <ScrollArea className="h-full">
          <ChatList />
        </ScrollArea>
      </div>
      
      {/* Footer Branding */}
      <div className="p-4 text-center border-t border-white/5 bg-black/20">
         <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/10">Signal Protocol v1.2</p>
      </div>
    </div>
  );
}