export const DAILY_MESSAGE_LIMIT = 10;
export const MATCH_DAY_MESSAGE_LIMIT = 20;
export const DAILY_COMMENT_LIMIT = 4;
export const DAILY_FREE_GIFT_LIMIT = 1;

export const STORAGE_KEY_PREFIX = 'dreamverse_limits_';

// ======================================================
// GENERIC DAILY LIMIT LOGIC
// ======================================================

type LimitData = {
    date: string;
    count: number;
};

export const getDailyLimitData = (key: string): LimitData => {
    if (typeof window === 'undefined') return { date: new Date().toDateString(), count: 0 };
    const stored = localStorage.getItem(key);
    if (!stored) return { date: new Date().toDateString(), count: 0 };

    try {
        const data = JSON.parse(stored) as LimitData;
        const today = new Date().toDateString();
        // If the stored date is not today, reset the count.
        if (data.date !== today) {
            localStorage.removeItem(key);
            return { date: today, count: 0 };
        }
        return data;
    } catch {
        localStorage.removeItem(key);
        return { date: new Date().toDateString(), count: 0 };
    }
};

export const setDailyLimitData = (key: string, newCount: number) => {
    if (typeof window === 'undefined') return;
    const today = new Date().toDateString();
    localStorage.setItem(key, JSON.stringify({ date: today, count: newCount }));
};

// ======================================================
// MATCH DAY SPECIFIC LOGIC
// ======================================================

export const startMatchDay = (userId: string, otherUserId: string) => {
    if (typeof window === 'undefined') return;
    const key = `${STORAGE_KEY_PREFIX}matchday_${userId}_${otherUserId}`;
    const today = new Date().toDateString();
    // This just sets the date, the count is stored separately.
    localStorage.setItem(key, today);
};

export const isMatchDay = (userId: string, otherUserId: string): boolean => {
    if (typeof window === 'undefined') return false;
    const key = `${STORAGE_KEY_PREFIX}matchday_${userId}_${otherUserId}`;
    const storedDate = localStorage.getItem(key);
    if (!storedDate) return false;
    
    return storedDate === new Date().toDateString();
};
