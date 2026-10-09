"use client";

import { useEffect, useRef } from "react";

export function LiveCall({
  persona,
  signalingServer,
}: {
  persona: any;
  signalingServer: WebSocket;
}) {
  const pcRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    const pc = new RTCPeerConnection();
    pcRef.current = pc;

    const setupCall = async () => {
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      localStream.getTracks().forEach((track) =>
        pc.addTrack(track, localStream)
      );

      pc.ontrack = (event) => {
        const remoteAudio = document.getElementById(
          "remoteAudio"
        ) as HTMLAudioElement | null;
        if (remoteAudio) remoteAudio.srcObject = event.streams[0];
      };

      signalingServer.onmessage = async (msg) => {
        const data = JSON.parse(msg.data);
        if (data.type === "answer") {
          await pc.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      signalingServer.send(JSON.stringify({ type: "offer", offer }));
    };

    setupCall();

    return () => {
      pc.close();
    };
  }, [persona, signalingServer]);

  return <audio id="remoteAudio" autoPlay />;
}
