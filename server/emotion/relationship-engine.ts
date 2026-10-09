
// emotion/relationship-engine.ts

import { InferredTone, RelationshipStats } from "./types";

/**
 * Applies tone-based emotional deltas to relationshipStats.
 * Fully aligned with the new Relationship model:
 * - relationshipStats.xp
 * - relationshipStats.confidence
 * - relationshipStats.interest
 * - interestCeiling caps emotional openness
 */
export function applyToneRelationshipDelta(
  stats: RelationshipStats,
  tone: InferredTone,
  isArgument: boolean,
  interestCeiling: "none" | "friend" | "high" | "romantic" = "none"
): RelationshipStats {
  let { xp, confidence, interest } = stats;

  // Tone-based emotional deltas
  if (tone === "rude") {
    xp -= 15;
    confidence -= 8;
    interest -= 8;
  } else if (tone === "defensive") {
    xp -= 8;
    confidence -= 5;
    interest -= 3;
  } else if (tone === "cold" || tone === "distant") {
    xp -= 5;
    confidence -= 4;
    interest -= 4;
  } else if (tone === "sweet" || tone === "playful" || tone === "flirty") {
    xp += 10;
    confidence += 6;
    interest += 5;
  } else if (tone === "sad") {
    xp += 5;
    confidence += 3;
  }

  // Argument penalty
  if (isArgument) {
    xp -= 5;
    confidence -= 3;
  }

  // Clamp base values
  xp = Math.max(0, xp);
  confidence = Math.max(0, Math.min(100, confidence));
  interest = Math.max(0, Math.min(100, interest));

  // Apply compatibility ceiling
  if (interestCeiling === "none") {
    interest = 0;
  } else if (interestCeiling === "friend") {
    interest = Math.min(interest, 40);
  } else if (interestCeiling === "high") {
    interest = Math.min(interest, 70);
  } else if (interestCeiling === "romantic") {
    interest = Math.min(interest, 100);
  }

  return { xp, confidence, interest };
}
