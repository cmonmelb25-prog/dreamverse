'use client';

/**
 * Auth background component.
 * REFINED: Uses absolute positioning instead of fixed to prevent Next.js 15 auto-scroll warnings.
 */
export function AuthBackground() {
    return (
        <div
            className="absolute inset-0 w-full h-full object-cover -z-10 pointer-events-none"
            style={{
                backgroundImage: `url('https://i.imgur.com/EnjsiGQ.jpg')`,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
                filter: 'blur(0px) brightness(0.5)',
            }}
        />
    );
}
