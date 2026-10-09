export function VoiceCallUI({ call }: { call: any }) {
  const girl = call.girl;

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-between text-white"
      style={{
        background: "linear-gradient(180deg, #000000, #1a1a1a, #000000)",
      }}
    >
      {/* Top Spacer */}
      <div className="pt-[clamp(2rem,6vh,4rem)]" />

      {/* Center Content */}
      <div className="flex flex-col items-center text-center space-y-4 px-4">
        <img
          src={girl.profileImageUrl}
          alt={girl.name}
          className="rounded-full shadow-lg border border-white/20"
          style={{
            width: "clamp(6rem, 22vw, 9rem)",
            height: "clamp(6rem, 22vw, 9rem)",
          }}
        />

        <h2
          className="font-semibold tracking-wide"
          style={{
            fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
          }}
        >
          {girl.name}
        </h2>

        <p
          className="opacity-70"
          style={{
            fontSize: "clamp(1rem, 2.5vw, 1.4rem)",
          }}
        >
          {call.status === "ringing"
            ? "Calling…"
            : call.status === "connected"
            ? `Connected · ${call.seconds}s`
            : "Call ended"}
        </p>
      </div>

      {/* Bottom Controls */}
      <div className="pb-[clamp(2rem,6vh,4rem)] flex justify-center">
        {call.status !== "connected" ? (
          <button
            onClick={call.acceptCall}
            className="rounded-full active:scale-95 transition-all shadow-[0_0_20px_rgba(0,255,0,0.5)]"
            style={{
              backgroundColor: "rgb(34,197,94)",
              width: "clamp(4rem, 14vw, 5.5rem)",
              height: "clamp(4rem, 14vw, 5.5rem)",
            }}
          />
        ) : (
          <button
            onClick={call.endCall}
            className="rounded-full active:scale-95 transition-all shadow-[0_0_20px_rgba(255,0,0,0.5)]"
            style={{
              backgroundColor: "rgb(239,68,68)",
              width: "clamp(4rem, 14vw, 5.5rem)",
              height: "clamp(4rem, 14vw, 5.5rem)",
            }}
          />
        )}
      </div>
    </div>
  );
}