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

  const previousMessageCount = useRef(messages.length);
  const lastRole = messages[messages.length - 1]?.role;
  
  useEffect(() => {
    const isNewMessage = messages.length > previousMessageCount.current;
    previousMessageCount.current = messages.length;

    // Only force scroll if the user just sent a message, OR if they are actively sitting at the bottom of the chat.
    if (lastRole === 'user' && isNewMessage) {
      scrollToBottom('smooth');
    } else if (isAtBottom) {
      scrollToBottom('auto');
    }
  }, [messages, isAtBottom, lastRole, scrollToBottom]);

  useEffect(() => {
    if (keyboardOpen && isAtBottom) scrollToBottom('auto');
  }, [keyboardOpen, isAtBottom, scrollToBottom]);

  return { scrollContainerRef, isAtBottom, scrollToBottom };
}
