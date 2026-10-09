// emotion/history-manager.ts

export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number; // ms
}

export interface HistoryManagerOptions {
  maxMessages?: number;   // default 20
  maxMinutes?: number;    // default 60
}

export function trimHistory(
  history: HistoryMessage[],
  options: HistoryManagerOptions = {},
): HistoryMessage[] {
  const {
    maxMessages = 20,
    maxMinutes = 60,
  } = options;

  const now = Date.now();
  const cutoff = now - maxMinutes * 60_000;

  // 1. Sort by timestamp (oldest → newest)
  const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);

  // 2. Remove messages older than cutoff
  let filtered = sorted.filter(m => m.timestamp >= cutoff);

  // 3. Remove messages from the future (device clock drift)
  filtered = filtered.filter(m => m.timestamp <= now);

  // 4. Limit to last N messages
  if (filtered.length > maxMessages) {
    filtered = filtered.slice(filtered.length - maxMessages);
  }

  return filtered;
}