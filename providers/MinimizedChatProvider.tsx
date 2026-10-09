'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

/**
 * @fileOverview Manages the state of the floating "Chat Head" widget.
 * Supports both AI Resident chats and User-to-User messenger threads.
 */

export type MinimizedChatInfo = {
  id: string; // girlId for AI, or chatId for Messenger
  name: string;
  image: string;
  type: 'chat' | 'messenger';
  hasNewMessage: boolean;
  unreadCount: number;
};

type MinimizedChatContextType = {
  minimizedChat: MinimizedChatInfo | null;
  minimizeChat: (info: Omit<MinimizedChatInfo, 'hasNewMessage' | 'unreadCount'>) => void;
  closeMinimizedChat: () => void;
  updateMinimizedChat: (updates: Partial<MinimizedChatInfo>) => void;
  incrementUnread: () => void;
};

const MinimizedChatContext = createContext<MinimizedChatContextType | null>(null);

export function MinimizedChatProvider({ children }: { children: ReactNode }) {
  const [minimizedChat, setMinimizedChat] = useState<MinimizedChatInfo | null>(null);

  /**
   * Initializes a minimized state for a conversation.
   */
  const minimizeChat = useCallback((info: Omit<MinimizedChatInfo, 'hasNewMessage' | 'unreadCount'>) => {
    setMinimizedChat({ ...info, hasNewMessage: false, unreadCount: 0 });
  }, []);

  /**
   * Completely removes the widget.
   */
  const closeMinimizedChat = useCallback(() => {
    setMinimizedChat(null);
  }, []);

  /**
   * Applies generic updates to the minimized state.
   */
  const updateMinimizedChat = useCallback((updates: Partial<MinimizedChatInfo>) => {
    setMinimizedChat(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  /**
   * Increments the unread badge (used by background listeners).
   */
  const incrementUnread = useCallback(() => {
    setMinimizedChat(prev => prev ? { 
      ...prev, 
      unreadCount: prev.unreadCount + 1, 
      hasNewMessage: true 
    } : null);
  }, []);

  return (
    <MinimizedChatContext.Provider value={{ 
      minimizedChat, 
      minimizeChat, 
      closeMinimizedChat, 
      updateMinimizedChat,
      incrementUnread
    }}>
      {children}
    </MinimizedChatContext.Provider>
  );
}

export function useMinimizedChat() {
  const context = useContext(MinimizedChatContext);
  if (!context) {
    throw new Error('useMinimizedChat must be used within a MinimizedChatProvider');
  }
  return context;
}
