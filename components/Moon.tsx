'use client';

export function Moon() {
  return (
    <div className="absolute top-[10%] right-[15%]">
      <div className="moon">
        <div className="moon-glow" />
        <div className="moon-phase-overlay" />
      </div>
    </div>
  );
}
