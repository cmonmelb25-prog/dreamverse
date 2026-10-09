'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useFirebase } from '@/firebase/provider';
import {
  collection,
  query,
  where,
  onSnapshot
} from '@/firebase/client';

import IncomingCallDialog from './IncomingCallDialog';
import MessengerCallOverlay from './MessengerCallOverlay';
import { CallBackButton } from './CallBackButton'; // New component for the callback button

import { useToast } from '@/hooks/use-toast';
import { vibrate } from '../lib/haptics';
import { sounds } from '../lib/sounds';

import { endMessengerCallAction } from '@/server/actions/messenger-calls';
import { getRealUserClient } from '@/server/actions/get-real-user-client';

import type { User } from '@/lib/types';
import { getSafeDate } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

interface MessengerCall {
  id: string;
  callerId: string;
  recipientId: string;
  callerName: string;
  callerImage?: string;
  mode: 'voice' | 'video';
  status: 'ringing' | 'accepted' | 'ended' | 'rejected' | 'missed' | 'no answer';
  participants: string[];
  acceptedAt?: any;
  createdAt: any;
  updatedAt: any;
}

const TERMINAL_STATES = new Set(['ended', 'rejected', 'missed', 'no answer']);
const MISSED_CALL_STATES = new Set(['missed', 'no answer']);
const CALL_DISCOVERY_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MISSED_CALL_LIFETIME_MS = 5 * 60 * 1000; // 5 minutes for a missed call to show callback

const isValidCallSession = (call: MessengerCall, activeId?: string | null) => {
  if (TERMINAL_STATES.has(call.status)) return false;

  if (activeId && call.id === activeId) return true;

  const date = getSafeDate(call.updatedAt || call.createdAt);
  if (!date) return true;

  const age = Date.now() - date.getTime();
  
  return age < CALL_DISCOVERY_WINDOW_MS;
};

export function MessengerCallManager() {
  const { user: currentUser } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [activeCall, setActiveCall] = useState<MessengerCall | null>(null);
  const [lastMissedCall, setLastMissedCall] = useState<MessengerCall | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);

  const ringerRef = useRef<HTMLAudioElement | null>(null);
  const lastVibrateRef = useRef<string | null>(null);
  const activeIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeIdRef.current = activeCall?.id || null;
  }, [activeCall?.id]);

  useEffect(() => {
    if (!currentUser?.uid || !firestore) return;

    const q = query(
      collection(firestore, 'messengerCalls'),
      where('participants', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        const calls = snapshot.docs
          .map(d => ({ ...d.data(), id: d.id } as MessengerCall));
          
        const activeCalls = calls.filter(c => isValidCallSession(c, activeIdRef.current));

        console.log(
          "[CALL DEBUG] MANAGER VISIBILITY SCAN:",
          calls.map(c => ({
            id: c.id,
            status: c.status,
            created: getSafeDate(c.createdAt)?.toISOString(),
            updated: getSafeDate(c.updatedAt)?.toISOString(),
            isTerminal: TERMINAL_STATES.has(c.status),
            isCaller: c.callerId === currentUser.uid
          }))
        );

        if (activeCalls.length === 0) {
          setActiveCall(null);
          setOtherUser(null);

          // Check for missed calls to show callback option
          const now = Date.now();
          const mostRecentMissedCall = calls
            .filter(c => 
              c.recipientId === currentUser.uid && 
              MISSED_CALL_STATES.has(c.status) &&
              (now - (getSafeDate(c.updatedAt || c.createdAt)?.getTime() ?? 0)) < MISSED_CALL_LIFETIME_MS
            )
            .sort((a, b) => {
              const aTime = getSafeDate(a.updatedAt || a.createdAt)?.getTime() ?? 0;
              const bTime = getSafeDate(b.updatedAt || b.createdAt)?.getTime() ?? 0;
              return bTime - aTime;
            })[0] || null;
            
          setLastMissedCall(mostRecentMissedCall);
          return;
        }

        const active = [...activeCalls].sort((a, b) => {
          const aPriority = a.status === 'accepted' ? 1 : 0;
          const bPriority = b.status === 'accepted' ? 1 : 0;

          if (aPriority !== bPriority) return bPriority - aPriority;

          const aTime = getSafeDate(a.updatedAt || a.createdAt)?.getTime() ?? 0;
          const bTime = getSafeDate(b.updatedAt || b.createdAt)?.getTime() ?? 0;
          return bTime - aTime;
        })[0];

        setActiveCall((prev) => {
          if (
            prev?.id === active.id && 
            prev?.status === active.status
          ) {
            return prev;
          }
          // If a new active call is found, clear any missed call notification
          setLastMissedCall(null);
          return active;
        });
      },
      async (err) => {
        if (err.code === 'permission-denied') return;

        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'messengerCalls',
          operation: 'list',
        } satisfies SecurityRuleContext));
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid, firestore]);

  useEffect(() => {
    if (!activeCall || !currentUser?.uid) return;

    const otherId = activeCall.participants.find(id => id !== currentUser.uid);
    if (!otherId) return;

    let cancelled = false;
    getRealUserClient(otherId)
      .then((profile) => {
        if (!cancelled) setOtherUser(profile);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [activeCall?.id, activeCall?.participants, currentUser?.uid]);

  useEffect(() => {
    if (!activeCall || !currentUser?.uid) return;

    const isRecipient = activeCall.recipientId === currentUser.uid;
    const isRinging = activeCall.status === 'ringing';
    const vibKey = activeCall.id + activeCall.status;

    if (isRinging && isRecipient) {
      if (lastVibrateRef.current !== vibKey) {
        vibrate([500, 200, 500]);
        lastVibrateRef.current = vibKey;
      }

      if (!ringerRef.current) {
        const audio = new Audio(sounds.incoming);
        audio.loop = true;
        audio.volume = 0.5;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            console.debug('[CALL] Ringtone auto-play deferred.');
          });
        }
        ringerRef.current = audio;
      }
    } else {
      lastVibrateRef.current = null;
      if (ringerRef.current) {
        ringerRef.current.pause();
        ringerRef.current = null;
      }
    }

    return () => {
      if (ringerRef.current) {
        ringerRef.current.pause();
        ringerRef.current = null;
      }
    };
  }, [activeCall?.status, activeCall?.id, activeCall?.recipientId, currentUser?.uid]);

  const handleAccept = async () => {
    if (!activeCall) return;
    vibrate(50);
    try {
      if (ringerRef.current) {
        ringerRef.current.pause();
        ringerRef.current = null;
      }
      await fetch('/api/messenger/call/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: activeCall.id })
      });
    } catch (err) {
      setActiveCall(null);
    }
  };

  const handleDecline = async () => {
    if (!activeCall) return;
    vibrate(80);
    try {
      await endMessengerCallAction(activeCall.id, { status: 'rejected' });
    } catch {}
  };

  const handleCallback = useCallback(async () => {
    if (!lastMissedCall || !currentUser) return;

    try {
      // Assuming the same recipientId for callback is the original callerId
      const response = await fetch('/api/messenger/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerId: currentUser.uid,
          recipientId: lastMissedCall.callerId, 
          callerName: currentUser.displayName || 'You',
          callerImage: currentUser.photoURL || null,
          mode: lastMissedCall.mode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Calling back...',
          description: `Calling ${lastMissedCall.callerName}...`,
        });
        setLastMissedCall(null); // Clear missed call after initiating callback
      } else {
        throw new Error(data.error || 'Failed to initiate callback');
      }
    } catch (err) {
      console.error('[CALLBACK ERROR]', err);
      toast({
        title: 'Callback Failed',
        description: 'Could not initiate callback. Please try again.',
        variant: 'destructive',
      });
    }
  }, [lastMissedCall, currentUser, toast]);

  const showCallOverlay = ((activeCall?.status === 'ringing' && activeCall?.recipientId !== currentUser?.uid) || activeCall?.status === 'accepted');

  return (
    <>
      {activeCall && activeCall.status === 'ringing' && activeCall.recipientId === currentUser?.uid && (
        <IncomingCallDialog
          callerName={activeCall.callerName}
          callerImage={activeCall.callerImage}
          mode={activeCall.mode}
          onAcceptAction={handleAccept}
          onDeclineAction={handleDecline}
        />
      )}

      {showCallOverlay && (
        <MessengerCallOverlay
          call={activeCall as MessengerCall}
          currentUserId={currentUser!.uid}
          otherUser={otherUser}
          onEndAction={() => {}} 
        />
      )}

      {!activeCall && lastMissedCall && (
        <CallBackButton
          callerName={lastMissedCall.callerName}
          onCallback={handleCallback}
        />
      )}
    </>
  );
}

export default MessengerCallManager;
