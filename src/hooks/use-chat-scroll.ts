import { useCallback, useEffect, useRef, useState } from 'react';
import { type Message } from '@ai-sdk/react';
import { useVisualViewport } from '@/hooks/use-visual-viewport';

export function useChatScroll(messages: Message[], isLoading: boolean) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const { keyboardOpen } = useVisualViewport();

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      setIsAtBottom(distance < 96);
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const lastRole = messages[messages.length - 1]?.role;
  useEffect(() => {
    if (lastRole === 'user' || isAtBottom) {
      scrollToBottom(lastRole === 'user' ? 'smooth' : 'auto');
    }
  }, [messages, isLoading, lastRole, isAtBottom, scrollToBottom]);

  useEffect(() => {
    if (keyboardOpen && isAtBottom) scrollToBottom('auto');
  }, [keyboardOpen, isAtBottom, scrollToBottom]);

  return { scrollContainerRef, isAtBottom, scrollToBottom };
}
