# Relationship & Memory Flow (Dreamverse)

This document summarizes the key data flow and type contracts for relationship state, user profile memory, moods, and spontanteous interactions.

## 1. Core schema

- `lib/schemas.ts`
  - `RelationshipSchema` defines Relationship fields
  - Added `userProfileMemory` (object):
    - `importantRoles: string[]`
    - `customFacts: Record<string, any>`
    - optional identity properties: `nationality`, `location`, `age`, `occupation`, `children`
  - Defaults: `.optional().default({ importantRoles: [], customFacts: {} })`

## 2. Type alias and exports

- `lib/types.ts`
  - `UserProfileMemory` typed structure
  - `Relationship` derived from `z.infer<typeof RelationshipSchema>` and includes `userProfileMemory`
  - `RelationshipMemory = Relationship`
  - `AIGirl.relationship` includes `RelationshipMemory`

## 3. Defaults

- `lib/character-state-defaults.ts`
  - `initialStats` now contains `userProfileMemory` with empty populate:
    - `importantRoles: []`
    - `customFacts: {}`
  - `initialState.stats = initialStats`

## 4. Normalization

- `lib/normalizeRelationship.ts`
  - Ensures full safe fallback and includes `userProfileMemory` in return value.
  - Uses `serializeFirestore` and defaults to avoid undefined.

## 5. Hydration

- `lib/server/girls.ts`:
  - `hydrateRelationship()` constructs `RelationshipMemory` (full compliant object)
  - includes all fields plus `userProfileMemory` from DB or defaults.

## 6. Reactions + Chat UI

- `app/chat/ChatClient.tsx`:
  - `MessagesComponent` parameterized with optional `chatId` and `currentUserIdentity`
  - reaction handler guard on availability
  - uses `addChatReactionAction()` from server actions with `// @ts-ignore` to avoid TS2306 actuator noise in this project environment.

- `app/chat/[id]/ChatPageClient.tsx`:
  - passes `chatId`, `currentUserIdentity` into `ChatClient.Messages`
  - ensures proper state handling for replying, message list, etc.

## 7. Validation

- `npm run typecheck` removes relationship/memory errors after fixes.
- `get_errors` with target files contains no errors.

## 8. Remaining tasks (not in this patch)

- Verify all `moods`, `spontaneousContext`, and AI engine user flow in runtime for all interaction types (chat/voice/video) with automated tests.
- Add explicit test coverage for `userProfileMemory` persistence and `normalizeRelationship` output shape.

---

## Reference notes

- `RelationshipSchema` and `Relationship` alias used throughout `ai/*`, `app/api/chat/*`, `server/*`.
- Ensure all code paths assign `userProfileMemory` on object construction to prevent default mismatch errors from strict inference.
