'use client';

interface PlaneProps {
  fromLeft: boolean;
  duration: number;
  top: string;
}

/**
 * Renders a distant aircraft with a steady white light and a quick-blinking red strobe.
 */
export function Plane({ fromLeft, duration, top }: PlaneProps) {
  return (
    <div
      className="plane-track"
      style={{
        top,
        animationName: fromLeft ? 'plane-left-right' : 'plane-right-left',
        animationDuration: `${duration}s`,
        // Distant planes should be tiny
        transform: 'scale(0.4)'
      }}
    >
      <div className="plane">
          {/* Steady small white navigation light */}
          <div className="plane-light white"></div>
          {/* Quick-blinking red strobe */}
          <div className="plane-light red"></div>
      </div>
    </div>
  );
}
