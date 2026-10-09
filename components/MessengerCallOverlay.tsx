'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFirebase } from '@/firebase/provider';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  serverTimestamp, 
  query, 
  orderBy,
  setDoc,
  doc
} from 'firebase/firestore';
import { endMessengerCallAction } from '@/server/actions/messenger-calls';
import { vibrate } from '@/lib/haptics';
import CallInCallScreen from './calls/CallInCallScreen';
import CallOutgoingScreen from './calls/CallOutgoingScreen';
import { Loader } from 'lucide-react';
import { sounds } from '@/lib/sounds';

interface MessengerCallOverlayProps {
  call: any;
  currentUserId: string;
  otherUser: any;
  onEndAction: () => void;
}

export default function MessengerCallOverlay({
  call,
  currentUserId,
  otherUser,
  onEndAction
}: MessengerCallOverlayProps) {
  const { firestore } = useFirebase();

  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(call.mode === 'video');
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const audioSenderRef = useRef<RTCRtpSender | null>(null);
  const videoSenderRef = useRef<RTCRtpSender | null>(null);
  const dtmfSenderRef = useRef<RTCDTMFSender | null>(null); // New ref for DTMF sender

  const isCaller = call.callerId === currentUserId;
  const politeRef = useRef(!isCaller);
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const isHangingUpRef = useRef(false);
  const ringbackRef = useRef<HTMLAudioElement | null>(null);

  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const processedSignalsRef = useRef(new Set<string>());

  const isConnected = connectionState === 'connected';

  const handleHangUp = async (isTimeout = false) => {
    if (isHangingUpRef.current) return;
    isHangingUpRef.current = true;

    vibrate(100);
    
    if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
    }
    
    if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
    }

    if (ringbackRef.current) {
        ringbackRef.current.pause();
        ringbackRef.current = null;
    }

    if (call?.id) {
      const finalStatus = isTimeout ? 'no answer' : (duration > 0 ? 'ended' : (isCaller ? 'ended' : 'missed'));
      await endMessengerCallAction(call.id, { 
        duration, 
        status: finalStatus
      }).catch(() => {});
    }
    
    onEndAction();
  };

  const createOffer = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !firestore) return;
    if (makingOfferRef.current) return;
    if (pc.signalingState !== "stable") return;

    try {
      makingOfferRef.current = true;
      await pc.setLocalDescription();

      if (pc.localDescription) {
        await addDoc(collection(firestore, 'messengerCalls', call.id, 'signals'), {
          type: pc.localDescription.type,
          sdp: pc.localDescription.sdp,
          from: currentUserId,
          timestamp: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("[WebRTC] Offer failed", err);
    } finally {
      makingOfferRef.current = false;
    }
  }, [call.id, currentUserId, firestore]);

  const handleToggleVideo = async () => {
    const pc = pcRef.current;
    if (!pc || !videoSenderRef.current || !firestore) return;

    if (!isVideoOn) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        const videoTrack = stream.getVideoTracks()[0];
        
        localStreamRef.current?.addTrack(videoTrack);
        
        await videoSenderRef.current.replaceTrack(videoTrack);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await addDoc(collection(firestore, 'messengerCalls', call.id, 'signals'), {
           type: 'offer',
           sdp: pc.localDescription?.sdp,
           from: currentUserId,
           timestamp: serverTimestamp()
        });
        
        setIsVideoOn(true);
      } catch (err) {
        console.error("Camera activation failed:", err);
      }
    } else {
      const sender = videoSenderRef.current;
      const oldTrack = sender.track;

      if (oldTrack) {
        oldTrack.stop();
        await sender.replaceTrack(null);
        if (localStreamRef.current) {
            localStreamRef.current.removeTrack(oldTrack);
        }
      }
      setIsVideoOn(false);
    }
  };

  // New function to send DTMF tones
  const sendDTMF = useCallback((digit: string) => {
    if (dtmfSenderRef.current && isConnected) {
      try {
        dtmfSenderRef.current.insertDTMF(digit);
        vibrate(50);
        console.log(`[DTMF] Sent: ${digit}`);
      } catch (error) {
        console.error("[DTMF] Failed to send DTMF tone:", error);
      }
    }
  }, [isConnected]);

  const toggleSpeakerAction = useCallback(async () => {
    if (remoteAudioRef.current) {
      const availableDevices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputDevices = availableDevices.filter(d => d.kind === 'audiooutput');

      const currentSinkId = remoteAudioRef.current.sinkId;

      // Simple toggle between default and the first non-default (e.g., speaker)
      // This logic might need refinement for more complex scenarios (e.g., selecting specific devices)
      const speakerDevice = audioOutputDevices.find(d => d.label.toLowerCase().includes('speaker')) || audioOutputDevices.find(d => d.deviceId !== 'default');

      if (isSpeakerOn) {
        // If speaker is currently on, try to switch to default or earpiece
        await remoteAudioRef.current.setSinkId('default');
      } else if (speakerDevice) {
        // If speaker is currently off, try to switch to speaker
        await remoteAudioRef.current.setSinkId(speakerDevice.deviceId);
      } else {
        console.warn("No specific speaker device found. Toggling default.");
        await remoteAudioRef.current.setSinkId('default'); // Fallback
      }
      setIsSpeakerOn(!isSpeakerOn);
    }
  }, [isSpeakerOn]);

  useEffect(() => {
    if (isCaller && !isConnected && !isHangingUpRef.current) {
      if (!ringbackRef.current) {
        const audio = new Audio(sounds.outgoing);
        audio.loop = true;
        audio.play().catch(err => {
          console.debug("[RINGBACK] Deferred.");
        });
        ringbackRef.current = audio;
      }
    } else {
      if (ringbackRef.current) {
        ringbackRef.current.pause();
        ringbackRef.current = null;
      }
    }
    return () => {
      if (ringbackRef.current) {
        ringbackRef.current.pause();
        ringbackRef.current = null;
      }
    };
  }, [isCaller, isConnected]);

  useEffect(() => {
    if (!firestore || !call.id) return;
    if (pcRef.current) return; 

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }, 
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    });
    pcRef.current = pc;

    // 🛡️ NO ANSWER TIMEOUT
    const connTimeout = setTimeout(() => {
        if (pc.connectionState !== 'connected' && !isHangingUpRef.current) {
            handleHangUp(true);
        }
    }, 60000);

    const audioTransceiver = pc.addTransceiver("audio", { direction: "sendrecv" });
    const videoTransceiver = pc.addTransceiver("video", { direction: "sendrecv" });

    audioSenderRef.current = audioTransceiver.sender;
    videoSenderRef.current = videoTransceiver.sender;

    // Initialize DTMF sender directly from RTCRtpSender.dtmf
    // The .dtmf property will be available on the sender if it has an audio track.
    // It will be null otherwise. No complex fallback with onTrack is needed here.
    dtmfSenderRef.current = audioTransceiver.sender.dtmf || null;

    pc.onnegotiationneeded = createOffer;

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        addDoc(collection(firestore, 'messengerCalls', call.id, 'signals'), {
          type: 'candidate',
          candidate: candidate.toJSON(),
          from: currentUserId,
          timestamp: serverTimestamp()
        }).catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      setConnectionState(state);
      if (state === 'connected') clearTimeout(connTimeout);
      if (state === 'failed' || state === 'closed') {
        handleHangUp(false);
      }
    };

    pc.ontrack = async ({ track, streams }) => {
      if (isHangingUpRef.current) return;
      const stream = streams[0];

      if (track.kind === "video") {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          try { await remoteVideoRef.current.play(); } catch (e) {}
        }
      } else if (track.kind === "audio") {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = stream;
          try { await remoteAudioRef.current.play(); } catch (e) {}
        }
      }
    };

    const initHardware = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true, 
          video: call.mode === 'video' ? { facingMode: 'user' } : false
        });
        
        if (isHangingUpRef.current) {
            stream.getTracks().forEach(t => t.stop());
            return;
        }

        localStreamRef.current = stream;

        const audioTrack = stream.getAudioTracks()[0];
        if (audioSenderRef.current) await audioSenderRef.current.replaceTrack(audioTrack);
        // The dtmfSenderRef will automatically update its track reference when audioSenderRef.current.replaceTrack is called.
        // No explicit re-initialization is needed here as dtmfSenderRef.current refers to the sender's dtmf property.

        if (call.mode === 'video') {
            const videoTrack = stream.getVideoTracks()[0];
            if (videoSenderRef.current) await videoSenderRef.current.replaceTrack(videoTrack);
            if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
        }
      } catch (err) { 
        console.error("[WebRTC] Hardware access failed:", err); 
      }
    };

    initHardware().then(() => {
      if (isCaller) {
        createOffer();
      }
    });

    const q = query(
      collection(firestore, 'messengerCalls', call.id, 'signals'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type !== 'added' || isHangingUpRef.current) continue;
        
        const signalId = change.doc.id;
        if (processedSignalsRef.current.has(signalId)) continue;
        processedSignalsRef.current.add(signalId);

        const data = change.doc.data();
        if (data.from === currentUserId) continue;

        try {
          if (data.type === 'offer' || data.type === 'answer') {
            const description = new RTCSessionDescription({ type: data.type, sdp: data.sdp });
            
            if (data.type === 'answer' && pc.signalingState !== 'have-local-offer') {
                continue;
            }

            const offerCollision = (data.type === 'offer') && (makingOfferRef.current || pc.signalingState !== 'stable');

            ignoreOfferRef.current = !politeRef.current && offerCollision;
            if (ignoreOfferRef.current) continue;

            if (offerCollision) {
                await Promise.all([
                    pc.setLocalDescription({ type: 'rollback' }),
                    pc.setRemoteDescription(description)
                ]);
            } else {
                await pc.setRemoteDescription(description);
            }

            if (data.type === 'offer') {
              await pc.setLocalDescription();
              if (pc.localDescription) {
                  await addDoc(collection(firestore, 'messengerCalls', call.id, 'signals'), {
                    type: pc.localDescription.type,
                    sdp: pc.localDescription.sdp,
                    from: currentUserId,
                    timestamp: serverTimestamp()
                  });
              }
            }

            for (const cand of pendingCandidatesRef.current) {
              await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
            }
            pendingCandidatesRef.current = [];

          } else if (data.type === 'candidate') {
            const candidate = new RTCIceCandidate(data.candidate);
            if (!pc.remoteDescription) {
              pendingCandidatesRef.current.push(data.candidate);
            } else {
              await pc.addIceCandidate(candidate).catch(() => {});
            }
          }
        } catch (err) {
          console.debug("[Signaling] Handshake deferred.");
        }
      }
    });

    return () => { 
      isHangingUpRef.current = true;
      unsubscribe();
      pc.close(); 
      pcRef.current = null; 
      audioSenderRef.current = null;
      videoSenderRef.current = null;
      dtmfSenderRef.current = null; // Clear DTMF sender ref on cleanup
      processedSignalsRef.current.clear();
      pendingCandidatesRef.current = [];
    };
  }, [call.id, currentUserId, firestore, call.mode, isCaller, createOffer, toggleSpeakerAction, sendDTMF]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected) interval = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(interval);
  }, [isConnected]);

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      <audio ref={remoteAudioRef} autoPlay playsInline />
      {isConnected ? (
        <CallInCallScreen
          name={otherUser?.displayName || 'Member'}
          image={otherUser?.photoURL || undefined}
          duration={duration}
          isMuted={isMuted}
          isSpeakerOn={isSpeakerOn}
          isVideoOn={isVideoOn}
          mode={call.mode}
          toggleMuteAction={() => {
              const audioTrack = localStreamRef.current?.getAudioTracks()[0];
              if (audioTrack) audioTrack.enabled = !audioTrack.enabled;
              setIsMuted(!isMuted);
          }}
          toggleSpeakerAction={toggleSpeakerAction}
          toggleVideoAction={handleToggleVideo}
          onEndCallAction={() => handleHangUp(false)}
          remoteVideoRef={remoteVideoRef}
          localVideoRef={localVideoRef}
          onSendDTMF={sendDTMF} // Pass the sendDTMF function
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center">
          {isCaller ? (
             <CallOutgoingScreen name={otherUser?.displayName || 'Member'} image={otherUser?.photoURL || undefined} onEndCallAction={() => handleHangUp(false)} />
          ) : (
             <div className="flex flex-col items-center gap-4">
                <Loader className="animate-spin text-primary h-8 w-8" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Securing Line...</span>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
