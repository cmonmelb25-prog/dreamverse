'use client';

import React from 'react';
import { useCallLog } from '@/hooks/use-call-log';
import { useFirestore } from '@/firebase/provider';
import { doc } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase/use-memo-firebase';
import type { User, CallLog } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
    Phone, 
    Video, 
    PhoneOutgoing, 
    PhoneMissed,
    ChevronRight,
    Loader
} from 'lucide-react';
import { cn, isUidPattern } from '@/lib/utils';
import { TimeAgo } from '@/components/ui/time-ago';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { initiateMessengerCallAction } from '@/server/actions/messenger-calls';
import { useToast } from '@/hooks/use-toast';
import { allGirls } from '@/lib/server/girls-data';

function CallLogItem({ log }: { log: CallLog }) {
  const firestore = useFirestore();
  const router = useRouter();
  const { user: currentUser } = useUser();
  const { toast } = useToast();

  const isResident = !isUidPattern(log.otherId);
  
  const otherUserDocRef = useMemoFirebase(() => 
    (!firestore || isResident) ? null : doc(firestore, 'users', log.otherId), 
    [firestore, log.otherId, isResident]
  );
  
  const { data: otherUser } = useDoc<User>(
    otherUserDocRef,
    !isResident ? `users/${log.otherId}` : null
  );

  const staticGirl = isResident ? allGirls.find(g => g.id.toLowerCase() === log.otherId.toLowerCase()) : null;

  const displayName = staticGirl?.name || (otherUser?.displayName || otherUser?.username || 'Discovery Member');
  const displayImage = staticGirl?.media.profileImageUrl || otherUser?.photoURL || '';

  const isMissed = log.status === 'missed' || log.status === 'rejected';
  
  const handleRedial = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) return;

    try {
      const res = await initiateMessengerCallAction({
        callerId: currentUser.uid,
        recipientId: log.otherId,
        callerName: currentUser.displayName || 'User', // Changed to displayName
        callerImage: currentUser.photoURL || null,
        mode: log.type
      });

      if (!res.success) throw new Error(res.error);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Redial Failed', description: err.message });
    }
  };

  const formatDuration = (s: number) => {
    if (s <= 0) return '';
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div 
        className="group flex items-center justify-between p-4 rounded-3xl bg-black/40 border border-white/5 hover:border-primary/30 transition-all cursor-pointer shadow-xl mb-3"
        onClick={() => {
            const chatId = isResident ? `/chat/${log.otherId}` : `/messages/${[currentUser?.uid, log.otherId].sort().join('_')}`;
            router.push(chatId);
        }}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="relative">
            <Avatar className="h-14 w-14 border-2 border-white/5 shadow-2xl">
                <AvatarImage src={displayImage} className="object-cover object-top" />
                <AvatarFallback>{displayName[0]}</AvatarFallback>
            </Avatar>
            <div className={cn(
                "absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-background shadow-lg",
                isMissed ? "bg-red-500" : "bg-primary"
            )}>
                {log.type === 'video' ? <Video size={10} className="text-white" /> : <Phone size={10} className="text-white" />}
            </div>
        </div>

        <div className="min-w-0">
           <p className={cn("font-bold text-base truncate", isMissed ? "text-red-400" : "text-white")}>
              {displayName}
           </p>
           <div className="flex items-center gap-2 mt-0.5">
              {log.status === 'missed' ? <PhoneMissed size={12} className="text-red-500" /> : <PhoneOutgoing size={12} className="text-primary" />}
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                {log.status} {log.duration > 0 && `• ${formatDuration(log.duration)}`}
              </span>
           </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right flex flex-col items-end">
           <TimeAgo timestamp={log.timestamp} className="text-[10px] font-black uppercase text-white/30" />
           <ChevronRight size={14} className="text-white/10 group-hover:text-primary transition-colors mt-1" />
        </div>
        <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full bg-white/5 hover:bg-primary/20 hover:text-primary h-10 w-10 shrink-0"
            onClick={handleRedial}
        >
            {log.type === 'video' ? <Video size={18} /> : <Phone size={18} />}
        </Button>
      </div>
    </div>
  );
}

export default function CallsClient() {
  const { calls, isLoading } = useCallLog();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
         <Loader className="animate-spin text-primary h-8 w-8" />
         <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Accessing Logs...</span>
      </div>
    );
  }

  if (!calls || calls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-card/20 rounded-[3rem] border border-dashed border-white/5 text-white/20">
         <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Phone size={32} className="opacity-10" />
         </div>
         <p className="font-headline text-xl uppercase tracking-widest">No call history</p>
         <p className="text-[10px] font-black uppercase tracking-widest mt-2 px-12 text-center opacity-40">Your secure transmission records will appear here.</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {calls.map((log) => (
        <CallLogItem key={log.id} log={log} />
      ))}
    </div>
  );
}
