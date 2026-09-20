import { useCallback, useEffect, useState } from 'react';
import { type Message } from '@ai-sdk/react';
import { toast } from 'sonner';

const STORAGE_KEY = 'portfolio-chat-history';
const PERSISTENT_KEY = 'portfolio-chat-history-persistent';
const PERSIST_PREF_KEY = 'portfolio-remember-me';

function getRememberMePref(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(PERSIST_PREF_KEY) === 'true';
  } catch {
    return false;
  }
}

function getReturnVisitorTopic(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PERSISTENT_KEY);
    if (!raw) return null;
    const msgs = JSON.parse(raw) as Message[];
    const lastUser = [...msgs].reverse().find((m) => m.role === 'user');
    if (!lastUser) return null;
    const text = typeof lastUser.content === 'string' ? lastUser.content : '';
    return text.slice(0, 60) + (text.length > 60 ? '…' : '');
  } catch {
    return null;
  }
}

function loadStoredMessages(persistent: boolean): Message[] {
  if (typeof window === 'undefined') return [];
  try {
    const sessionRaw = window.sessionStorage.getItem(STORAGE_KEY);
    if (sessionRaw) return JSON.parse(sessionRaw) as Message[];
    if (persistent) {
      const persistRaw = window.localStorage.getItem(PERSISTENT_KEY);
      if (persistRaw) return JSON.parse(persistRaw) as Message[];
    }
    return [];
  } catch {
    return [];
  }
}

export function useChatPersistence(
  messages: Message[],
  setMessages: (messages: Message[] | ((messages: Message[]) => Message[])) => void
) {
  const [hydrated, setHydrated] = useState(false);
  const [persistMemory, setPersistMemory] = useState(false);

  useEffect(() => {
    const isPersistent = getRememberMePref();
    setPersistMemory(isPersistent);

    if (isPersistent) {
      const topic = getReturnVisitorTopic();
      if (topic) {
        toast.success(`Welcome back! Last time you were asking: "${topic}"`);
      }
    }

    const stored = loadStoredMessages(isPersistent);
    if (stored.length > 0) setMessages(stored);
    setHydrated(true);
  }, [setMessages]);

  const togglePersistMemory = useCallback(() => {
    setPersistMemory((prev) => {
      const next = !prev;
      try {
        if (next) {
          window.localStorage.setItem(PERSIST_PREF_KEY, 'true');
          toast.success('Memory enabled — I\'ll remember our conversations across sessions.');
        } else {
          window.localStorage.setItem(PERSIST_PREF_KEY, 'false');
          window.localStorage.removeItem(PERSISTENT_KEY);
          toast('Memory cleared — conversations will reset on new tabs.');
        }
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !hydrated) return;
    try {
      if (messages.length > 0) {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
        if (persistMemory) {
          window.localStorage.setItem(PERSISTENT_KEY, JSON.stringify(messages));
        }
      } else {
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [messages, hydrated, persistMemory]);

  return { hydrated, persistMemory, togglePersistMemory };
}
