'use client';
import { useEffect, useRef } from 'react';

export function VideoCall({ persona }: { persona: any }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const startVideo = async () => {
      const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) videoRef.current.srcObject = localStream;

      // Here, you can also add AI avatar video tracks
      // Example: aiCanvas.captureStream(30).getTracks().forEach(track => pc.addTrack(track));
    };

    startVideo();
  }, []);

  return <video ref={videoRef} autoPlay playsInline />;
}
