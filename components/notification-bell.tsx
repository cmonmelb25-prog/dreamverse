'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TimeAgo } from '@/components/ui/time-ago';
import { Loader } from '@/components/ui/loader';
import type { Notification } from '@/lib/types';
import { useNotifications, type WithId } from '@/hooks/use-notifications';
import { ScrollArea } from '@/components/ui/scroll-area';

function NotificationItem({
  notification,
  onClick,
}: {
  notification: WithId<Notification>;
  onClick: (notification: WithId<Notification>) => void;
}) {
  const actorImageSrc = notification.actor.profileImageUrl || '';

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-md hover:bg-secondary/50 cursor-pointer transition-colors"
      onClick={() => onClick(notification)}
    >
      <Avatar
        className="mt-1 shrink-0"
        style={{
          width: '2.4rem',
          height: '2.4rem',
        }}
      >
        <AvatarImage src={actorImageSrc} className="object-cover object-top" />
        <AvatarFallback>{notification.actor.name[0]}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-normal leading-snug">
          <span className="font-bold text-primary">{notification.actor.name}</span>{' '}
          <span className="text-white/90">{notification.message}</span>
        </p>

        <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mt-1">
          <TimeAgo timestamp={notification.createdAt} />
        </div>
      </div>

      {!notification.read && (
        <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0 shadow-[0_0_8px_rgba(255,0,132,0.6)]" />
      )}
    </div>
  );
}

/**
 * Standardized Notification Bell.
 * FIXED: Displays all unread activity types correctly without filtering.
 */
export default function NotificationBell() {
  const {
    notifications,
    unreadBellCount,
    isLoading,
    markBellAsRead,
    clearAllNotifications,
    handleNotificationClick,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open && unreadBellCount > 0) {
      markBellAsRead();
    }
  };

  const onNotificationClick = (notif: WithId<Notification>) => {
    setIsOpen(false);
    handleNotificationClick(notif);
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-white/10 active:scale-95 transition-all">
          <Bell className="text-white h-5 w-5" />

          {unreadBellCount > 0 && (
            <div className="absolute top-1 right-1 flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-black h-5 w-5 border-2 border-background shadow-lg scale-90">
              {unreadBellCount > 9 ? '9+' : unreadBellCount}
            </div>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="p-0 overflow-hidden bg-black/90 backdrop-blur-2xl border-white/10 shadow-2xl rounded-2xl w-[90vw] sm:w-[24rem]"
        align="end"
        sideOffset={12}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <span className="text-sm font-bold uppercase tracking-widest text-white/60">
            Activity
          </span>
          {notifications.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto p-0 text-[10px] text-muted-foreground hover:text-primary font-black uppercase tracking-widest"
              onClick={(e) => {
                e.stopPropagation();
                clearAllNotifications();
              }}
            >
              Clear All
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[60dvh] overflow-y-auto">
          <div className="p-1 space-y-1">
            {isLoading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3">
                <Loader className="h-4 w-4 animate-spin text-primary" />
                <p className="text-xs font-bold uppercase tracking-widest text-white/40 animate-pulse">Syncing DreamVerse...</p>
              </div>
            ) : notifications && notifications.length > 0 ? (
              notifications.map((notif: WithId<Notification>) => (
                <NotificationItem
                  key={notif.id}
                  notification={notif}
                  onClick={onNotificationClick}
                />
              ))
            ) : (
              <div className="p-12 text-center flex flex-col items-center gap-2">
                <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-2">
                  <Bell className="h-6 w-6 text-white/20" />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-white/30">No new activity</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}