"use client";
import { logEngagementAction } from "@/server/actions/log-engagement-action";

import { useState, useRef, useEffect, useCallback } from "react";
import type { AIGirl } from "@/lib/types";
import { useUser } from "@/firebase/auth/use-user";
import { sounds } from "@/lib/sounds";
import { useToast } from "@/hooks/use-toast";

export type CallState =
  | "idle"
  | "calling"
  | "incoming"
  | "in-call"
  | "camera-permission"
  | "video"
  | "ended";

export function useCallEngine(
  initialGirl: AIGirl,
  initialMode: "voice" | "video"
) {
  const { user } = useUser();
  const { toast } = useToast();

  const [callState, setCallState] = useState<CallState>("idle");
  const [currentCallMode, setCurrentCallMode] =
    useState<"voice" | "video">(initialMode);
  const [girl, setGirl] = useState<AIGirl | null>(initialGirl);

  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [lastAIResponse, setLastAIResponse] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [initialGreeting, setInitialGreeting] = useState<{
    text: string;
    audio: string;
  } | null>(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);

  const [showKeypad, setShowKeypad] = useState(false);
  const [showContacts, setShowContacts] = useState(false);

  // Sentinel to prevent re-dialing loops after hang-up
  const hasAutoStartedRef = useRef(false);

  // NEW: mouth shape for iOS talking avatar
  const [mouthShape, setMouthShape] = useState<"neutral" | "talking">(
    "neutral"
  );

  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scriptedVideoTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const callStateRef = useRef(callState);
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // mouthShape follows isSpeaking
  useEffect(() => {
    if (isSpeaking) {
      setMouthShape("talking");
    } else {
      setMouthShape("neutral");
    }
  }, [isSpeaking]);

  const cleanupCallResources = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (scriptedVideoTimerRef.current) {
      clearTimeout(scriptedVideoTimerRef.current);
      scriptedVideoTimerRef.current = null;
    }
  }, []);

  const playAudio = useCallback((audioDataUri: string, isRingtone = false) => {
    const isValid =
      typeof audioDataUri === "string" &&
      (audioDataUri.startsWith("data:audio") ||
        audioDataUri.startsWith("http") ||
        audioDataUri.startsWith("/") ||
        audioDataUri.startsWith("blob:"));

    if (!isValid) {
      console.error("Invalid audio source provided to playAudio:", audioDataUri);
      if (!isRingtone) setIsSpeaking(false);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
    }

    const newAudio = new Audio(audioDataUri);
    audioRef.current = newAudio;
    newAudio.loop = isRingtone;

    if (!isRingtone) {
      setIsSpeaking(true);
    }

    newAudio.play().catch((e) => {
      console.error("Audio playback error:", e);
      if (!isRingtone) setIsSpeaking(false);
    });

    newAudio.onended = () => {
      if (!isRingtone) {
        setIsSpeaking(false);
      }
    };
  }, []);

  const endCall = useCallback(() => {
    setCallState("ended");
  }, []);

  const playAudioFallback = useCallback(
    async (text: string) => {
      try {
        const res = await fetch("/api/call/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, girlId: girl?.id }),
        });

        if (!res.ok) throw new Error("TTS failed");
        const data = await res.json();
        if (data.audio) playAudio(data.audio);
      } catch (err) {
        console.error("Fallback TTS error:", err);
      }
    },
    [girl, playAudio]
  );

  const runFallbackSequence = useCallback(async () => {
    if (callStateRef.current !== "in-call") return;
    const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

    await playAudioFallback("hello?");
    await wait(2000);

    if (callStateRef.current !== "in-call") return;
    await playAudioFallback("hello…?");
    await wait(2000);

    if (callStateRef.current !== "in-call") return;
    await playAudioFallback("I can’t hear you. Try calling back.");
    await wait(1000);

    endCall();
  }, [endCall, playAudioFallback]);

  const startSilenceDetection = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(runFallbackSequence, 8000);
  }, [runFallbackSequence]);

  const sendAudioToServer = useCallback(
    async (audioBlob: Blob) => {
      if (!girl || !user || isThinking) return;

      setIsThinking(true);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      const formData = new FormData();
      formData.append("audio", audioBlob, "user_audio.webm");
      formData.append("girlId", girl.id);
      formData.append("userId", user.uid);

      const endpoint =
        currentCallMode === "video" ? "/api/video-call" : "/api/call";

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
           throw new Error(`Server returned HTML/Error: ${response.status}`);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
           throw new Error("Invalid API response format");
        }

        const data: {
          audio?: string;
          text?: string;
          videoUrl?: string;
        } = await response.json();

        if (data.audio) {
          setLastAIResponse(data.text ?? "");
          if (currentCallMode === "video" && data.videoUrl) {
            setCurrentVideoUrl(data.videoUrl);
          }
          playAudio(data.audio);
          startSilenceDetection();
        }
      } catch (error) {
        console.error("Error sending audio to server:", error);
      } finally {
        setIsThinking(false);
      }
    },
    [girl, user, isThinking, playAudio, startSilenceDetection, currentCallMode]
  );

  const startRecording = useCallback(
    async (stream: MediaStream) => {
      if (mediaRecorderRef.current) return;

      try {
        let mimeType = "";

        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
          mimeType = "audio/ogg;codecs=opus";
        } else {
          mimeType = ""; // Let browser choose
        }

        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        recorder.onstart = () => setIsRecording(true);

        recorder.onstop = async () => {
          setIsRecording(false);
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });
          audioChunksRef.current = [];
          if (
            audioBlob.size > 0 &&
            (callStateRef.current === "in-call" ||
              callStateRef.current === "video")
          ) {
            await sendAudioToServer(audioBlob);
          }
          mediaRecorderRef.current = null;
        };

        recorder.start(1000); // Send audio chunks every second
      } catch (error) {
        console.error("Error starting recording:", error);
      }
    },
    [sendAudioToServer]
  );

  const startCallTimer = useCallback(() => {
    if (callTimerRef.current) return;
    callTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  const initiateVoiceCall = useCallback(async () => {
    if (!girl) return;

    if (girl.media?.videoCallUrl) {
      setCallState("video");
      setCurrentVideoUrl(girl.media.videoCallUrl);
      const estimatedDuration = 10000;
      scriptedVideoTimerRef.current = setTimeout(() => endCall(), estimatedDuration);
      return;
    }

    setCurrentCallMode("voice");
    setCallState("calling");
    playAudio(sounds.outgoing, true);

    try {
      const minRingingTime = new Promise((resolve) =>
        setTimeout(resolve, 2000)
      );
      const greetingFetch = fetch("/api/call/greeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ girlId: girl.id }),
      });

      const [_, response] = await Promise.all([minRingingTime, greetingFetch]);
      
      if (!response.ok) {
        throw new Error("Greeting fetch failed");
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
         throw new Error("Invalid greeting response");
      }

      const data = await response.json();

      if (callStateRef.current !== "calling") return;

      if (data.audio) {
        if (audioRef.current) audioRef.current.pause();
        setLastAIResponse(data.text ?? "");
        setInitialGreeting({ text: data.text, audio: data.audio });
        setCallState("in-call");
      } else {
        throw new Error("Failed to get greeting audio.");
      }
    } catch (err) {
      console.error("Initiate call failed:", err);
      endCall();
    }
  }, [girl, playAudio, endCall]);

  const initiateVideoCall = useCallback(() => {
    setCurrentCallMode("video");
    setCallState("camera-permission");
  }, []);

  const initiateCall = useCallback(() => {
    if (currentCallMode === "video") {
      initiateVideoCall();
    } else {
      initiateVoiceCall();
    }
  }, [currentCallMode, initiateVideoCall, initiateVoiceCall]);

  // Auto-start based on initialMode when entering idle
  useEffect(() => {
    if (callState === "idle" && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      if (initialMode === "video") {
        initiateVideoCall();
      } else {
        initiateVoiceCall();
      }
    }
  }, [initialMode, callState, initiateVideoCall, initiateVoiceCall]);

  const answerCall = useCallback(async () => {
    if (audioRef.current) audioRef.current.pause();
    setCallState("in-call");
  }, []);

  useEffect(() => {
    if (callState === "in-call" || callState === "video") {
      const setupCall = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          streamRef.current = stream;
          startCallTimer();

          if (callState === "in-call" && initialGreeting) {
            playAudio(initialGreeting.audio);
            setInitialGreeting(null);
            if (audioRef.current) {
              audioRef.current.onended = () => startSilenceDetection();
            }
          } else {
            startSilenceDetection();
          }

          await startRecording(stream);
        } catch (err) {
          console.error("Failed to setup in-call state:", err);
          endCall();
        }
      };
      setupCall();
    }

    if (callState === "ended") {
      const durationSnapshot = callDuration;
      const modeSnapshot = currentCallMode;
      cleanupCallResources();

      if (girl && user) {
        (async () => {
          // 1. Log engagement if it was a real call
          if (durationSnapshot > 0) {
            await logEngagementAction({
              actorType: "user",
              actorId: user.uid,
              targetType: "girl",
              type: "call",
              weight: 0,
              targetId: girl.id,
            });
          }

          // 2. Automatic call logging to chat history
          const mins = Math.floor(durationSnapshot / 60);
          const secs = durationSnapshot % 60;
          const modeLabel = modeSnapshot === 'video' ? 'Video' : 'Voice';
          const logText = durationSnapshot > 0 
            ? `${modeLabel} call ended (${mins}:${secs.toString().padStart(2, '0')})`
            : `Missed ${modeLabel.toLowerCase()} call`;

          try {
            await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                girlId: girl.id, 
                userId: user.uid, 
                message: logText,
                type: 'system',
                clientMessageId: `call-log-${Date.now()}`
              })
            });
          } catch (e) {
            console.warn("Failed to log call history to chat", e);
          }
        })();
      }

      const timer = setTimeout(() => {
        setCallState("idle");
        setCallDuration(0);
      }, 2000);

      return () => clearTimeout(timer);
    }

    return cleanupCallResources;
  }, [
    callState,
    initialGreeting,
    user,
    girl,
    callDuration,
    currentCallMode,
    playAudio,
    startRecording,
    startCallTimer,
    startSilenceDetection,
    endCall,
    cleanupCallResources,
  ]);

  const rejectCall = useCallback(() => {
    if (audioRef.current) audioRef.current.pause();
    endCall();
  }, [endCall]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const newMutedState = !prev;
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = !newMutedState;
        });
      }
      return newMutedState;
    });
  }, []);

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => !prev);
    toast({ title: isSpeakerOn ? "Speaker Off" : "Speaker On" });
  }, [isSpeakerOn, toast]);

  const requestVideoMode = useCallback(
    () => setCallState("camera-permission"),
    []
  );

  const enableVideoMode = useCallback(() => {
    setCurrentCallMode("video");
    setCallState("video");
  }, []);

  const disableVideoMode = useCallback(() => {
    setCurrentCallMode("voice");
    setCallState("in-call");
  }, []);

  const toggleKeypad = () => setShowKeypad(!showKeypad);
  const toggleContacts = () => setShowContacts(!showContacts);
  const addCall = () => toast({ title: "Multi-call", description: "Adding participants feature coming soon." });

  return {
    callState,
    girl,
    callDuration,
    isMuted,
    isSpeakerOn,
    lastAIResponse,
    isSpeaking,
    isRecording,
    isThinking,
    currentVideoUrl,
    mouthShape,
    showKeypad,
    showContacts,
    setGirl,
    initiateCall,
    initiateVoiceCall,
    initiateVideoCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleSpeaker,
    requestVideoMode,
    enableVideoMode,
    disableVideoMode,
    toggleKeypad,
    toggleContacts,
    addCall
  };
}
