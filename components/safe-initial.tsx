'use client';

import { useEffect, useState } from "react";

export function SafeInitial({ characterName }: { characterName?: string | null }) {
  const [initials, setInitials] = useState('?');

  useEffect(() => {
    if (!characterName || typeof characterName !== "string") {
      setInitials('?');
      return;
    }

    const cleaned = characterName.trim();
    if (!cleaned) {
      setInitials('?');
      return;
    }

    const parts = cleaned.split(/\s+/); // handles multiple spaces cleanly

    if (parts.length > 1) {
      const first = parts[0][0];
      const last = parts[parts.length - 1][0];
      setInitials(`${first}${last}`.toUpperCase());
    } else {
      setInitials(parts[0][0].toUpperCase());
    }
  }, [characterName]);

  return (
    <span suppressHydrationWarning>
      {initials}
    </span>
  );
}