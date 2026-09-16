'use client';
import { trackChatQuery } from '@/lib/analytics-tracker';
import { useChat, type Message } from '@ai-sdk/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// Component imports
import ChatBottombar from '@/components/chat/chat-bottombar';
import ChatLanding from '@/components/chat/chat-landing';
import ChatMessageContent from '@/components/chat/chat-message-content';
import { SimplifiedChatView } from '@/components/chat/simple-chat-view';
import {
  ChatBubble,
  ChatBubbleMessage,
} from '@/components/ui/chat/chat-bubble';
import WelcomeModal from '@/components/welcome-modal';
import { ArrowDown, House, Info, RotateCcw } from 'lucide-react';
import GitHubButton from 'react-github-btn';
import HelperBoost from './HelperBoost';
import { useVisualViewport } from '@/hooks/use-visual-viewport';
import { messageEntranceMotion } from '@/lib/motion';

// Persist the conversation thread across an accidental reload — but only for
// THIS tab. sessionStorage (not localStorage) is what makes that scoping
// happen: it's isolated per-tab, so a genuinely new tab always starts empty
// instead of picking up whatever the last tab was talking about.
const STORAGE_KEY = 'portfolio-chat-history';

function loadStoredMessages(): Message[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Message[]) : [];
  } catch {
    return [];
  }
}

const Chat = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('query');
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  // Stored history is read *after* mount (see effect below) so the server
  // and first client render agree — reading localStorage inside useState's
  // initializer caused a hydration mismatch on every reload with history.
  const [hydrated, setHydrated] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const { keyboardOpen } = useVisualViewport();

  const {
    messages,
    input,
    handleInputChange,
    isLoading,
    stop,
    setMessages,
    setInput,
    reload,
    addToolResult,
    append,
    error,
  } = useChat({
    onResponse: (response) => {
      if (response) {
        setLoadingSubmit(false);
      }
    },
    onFinish: () => {
      setLoadingSubmit(false);
    },
    onError: (error) => {
      setLoadingSubmit(false);
      console.error('Chat error:', error.message, error.cause);
      toast.error(`Error: ${error.message}`);
    },
    onToolCall: (tool) => {
      const toolName = tool.toolCall.toolName;
      console.log('Tool call:', toolName);
    },
  });

  const isToolInProgress = messages.some(
    (m) =>
      m.role === 'assistant' &&
      m.parts?.some(
        (part) =>
          part.type === 'tool-invocation' &&
          part.toolInvocation?.state !== 'result'
      )
  );

  const submitQuery = useCallback((query: string) => {
    if (!query.trim() || isToolInProgress) return;

    // Keep URL in sync with latest active query
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('query', query.trim());
        window.history.replaceState(null, '', url.pathname + url.search);
      } catch (e) {
        console.error('Failed to update URL search params:', e);
      }
    }

    // Pre-process default questions to save API quota with robust matching
    const normalizedQuery = query.toLowerCase().replace(/\s+/g, ' ').trim();
    
    const isMe = normalizedQuery.includes('who are you and what do you do');
    const isProjects = normalizedQuery.includes('what are your projects');
    const isSkills = normalizedQuery.includes('technical skills and tech stack');
    const isFun = normalizedQuery.includes('what do you do for fun');
    const isContact = normalizedQuery.includes('how can i contact you');

    if (isMe || isProjects || isSkills || isFun || isContact) {
      let toolName = '';
      let textContent = '';
      
      if (isMe) {
        toolName = 'getPresentation';
        textContent = "Hey 👋 I'm Manav Bhullar. I build across three domains - full-stack web dev, data analytics, and AI/ML. Here is my background!";
      } else if (isProjects) {
        toolName = 'getProjects';
        textContent = "Here are some of the projects I've been working on! I love building full-stack distributed systems, data pipelines, and RAG applications.";
      } else if (isSkills) {
        toolName = 'getSkills';
        textContent = "I've worked with a wide range of technologies across web development, data engineering, and AI. Here is my tech stack!";
      } else if (isFun) {
        toolName = 'getCrazy';
        textContent = "Outside of coding, I'm really into fitness and reading! But since you asked for crazy stories, let me tell you about how I built a zero-polling hardware-interrupt remote workspace, and how I rate-limited my own portfolio...";
      } else if (isContact) {
        toolName = 'getContact';
        textContent = "You can find me on GitHub, LinkedIn, or shoot me an email. Let's build something cool together!";
      }

      const userMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: query,
      };

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: textContent,
        parts: [
          { type: 'text', text: textContent },
          {
            type: 'tool-invocation',
            toolInvocation: {
              toolCallId: 'mock_' + Date.now(),
              toolName: toolName,
              args: {},
              state: 'result',
              result: { success: true },
            }
          }
        ]
      };

      // Echo the user's message immediately so the thread responds to the tap
      // at once; the canned answer lands after a short "Thinking..." beat.
      setMessages([...messages, userMessage as unknown as Message]);
      setLoadingSubmit(true);
      setTimeout(() => {
        setMessages((prev) => [...prev, assistantMessage as unknown as Message]);
        setLoadingSubmit(false);
      }, 500);

      // Track chat message sent event in PostHog
      if (typeof window !== 'undefined') {
        trackChatQuery(query);
      }

      return;
    }

    setLoadingSubmit(true);

    // Track chat message sent event in PostHog
    if (typeof window !== 'undefined') {
      trackChatQuery(query);
    }

    append({
      role: 'user',
      content: query,
    });
  }, [isToolInProgress, messages, setMessages, append]);

  // Restore the persisted thread once, on the client, after mount.
  useEffect(() => {
    const stored = loadStoredMessages();
    if (stored.length > 0) setMessages(stored);
    setHydrated(true);
  }, [setMessages]);

  useEffect(() => {
    // Don't replay the landing page's query param over a restored thread —
    // only auto-submit it into a genuinely fresh (empty) session.
    if (hydrated && initialQuery && !autoSubmitted && messages.length === 0) {
      setAutoSubmitted(true);
      setInput('');
      submitQuery(initialQuery);
    }
  }, [hydrated, initialQuery, autoSubmitted, submitQuery, setInput, messages.length]);

  // Session memory: persist the full thread so a reload doesn't lose it.
  useEffect(() => {
    if (typeof window === 'undefined' || !hydrated) return;
    try {
      if (messages.length > 0) {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } else {
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // sessionStorage unavailable (private mode, quota) — degrade silently
    }
  }, [messages, hydrated]);

  // Track whether the reader is pinned to the bottom of the thread. We only
  // auto-follow streaming output while pinned — yanking someone back down
  // while they're reading a project card mid-stream is the single most
  // annoying thing a chat UI can do on a phone.
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
    // Always follow our own just-sent message; otherwise only follow while pinned.
    if (lastRole === 'user' || isAtBottom) scrollToBottom(lastRole === 'user' ? 'smooth' : 'auto');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isLoading, lastRole]);

  // When the keyboard slides up the visible area shrinks; keep the latest
  // message in view instead of leaving the reader staring at the middle.
  useEffect(() => {
    if (keyboardOpen && isAtBottom) scrollToBottom('auto');
  }, [keyboardOpen, isAtBottom, scrollToBottom]);

  useEffect(() => {
    const handleChatSubmit = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        submitQuery(customEvent.detail);
      }
    };
    window.addEventListener('chat:submit', handleChatSubmit);
    return () => window.removeEventListener('chat:submit', handleChatSubmit);
  }, [submitQuery]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isToolInProgress || isLoading) return;
    submitQuery(input);
    setInput('');
  };

  const handleStop = () => {
    stop();
    setLoadingSubmit(false);
  };

  const handleReset = () => {
    setMessages([]);
    setInput('');
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    router.push('/');
  };

  // Check if this is the initial empty state (no messages)
  const isEmptyState = messages.length === 0 && !loadingSubmit;

  const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;

  const showInlineError = !!error && !isLoading && !loadingSubmit && lastRole === 'user';

  return (
    <div className="app-shell relative flex flex-col overflow-hidden">
      {/* Header — safe-area padded, fades into the thread. Absolutely
          positioned so the thread scrolls underneath it. */}
      <header
        className="pt-safe pointer-events-none absolute inset-x-0 top-0 z-50"
        style={{
          background:
            'linear-gradient(to bottom, rgba(237, 230, 214, 1) 0%, rgba(237, 230, 214, 0.85) 60%, rgba(237, 230, 214, 0) 100%)',
        }}
      >
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-end gap-1 px-2 sm:h-16 sm:px-4">
          <button
            type="button"
            onClick={handleReset}
            aria-label="Start over"
            title="Home"
            className="pressable pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full text-foreground hover:bg-accent"
          >
            <House className="h-6 w-6" strokeWidth={2} />
          </button>
          <WelcomeModal
            trigger={
              <button
                type="button"
                aria-label="About this portfolio"
                className="pressable pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full text-foreground hover:bg-accent"
              >
                <Info className="h-6 w-6" strokeWidth={2} />
              </button>
            }
          />
          {/* GitHub star — hidden on phones to keep the header to two clear targets */}
          <div className="pointer-events-auto hidden pl-2 pt-1 sm:block">
            <GitHubButton
              href="https://github.com/manav-bhullar"
              data-color-scheme="no-preference: light; light: light; dark: light_high_contrast;"
              data-size="large"
              data-show-count="true"
              aria-label="Visit manav-bhullar on GitHub"
            >
              Star
            </GitHubButton>
          </div>
        </div>
      </header>

      {/* Scrollable thread */}
      <div
        ref={scrollContainerRef}
        className="scroll-y min-h-0 flex-1 px-4 md:px-2"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3.5rem)' }}
      >
        <div className="mx-auto flex min-h-full max-w-3xl flex-col">
          {isEmptyState ? (
            <motion.div
              key="landing"
              className="flex flex-1 items-center justify-center"
              {...messageEntranceMotion}
            >
              <ChatLanding submitQuery={submitQuery} />
            </motion.div>
          ) : (
            <div className="flex flex-col gap-4 pt-2 pb-4 sm:pt-4">
              <AnimatePresence initial={false}>
                {messages.map((message) =>
                  message.role === 'user' ? (
                    <motion.div
                      key={message.id}
                      {...messageEntranceMotion}
                      className="flex justify-end md:px-2"
                    >
                      <ChatBubble variant="sent" className="max-w-[88%] sm:max-w-[80%]">
                        <ChatBubbleMessage>
                          <ChatMessageContent
                            message={message}
                            isLast={message.id === lastMessageId}
                            isLoading={false}
                            reload={() => Promise.resolve(null)}
                          />
                        </ChatBubbleMessage>
                      </ChatBubble>
                    </motion.div>
                  ) : (
                    <motion.div key={message.id} {...messageEntranceMotion}>
                      <SimplifiedChatView
                        message={message}
                        isLoading={isLoading && message.id === lastMessageId}
                        reload={reload}
                        addToolResult={addToolResult}
                      />
                    </motion.div>
                  )
                )}

                {/* "Thinking..." shown after the user's message, before the
                    assistant message has arrived yet */}
                {loadingSubmit && lastRole === 'user' && (
                  <motion.div key="loading" {...messageEntranceMotion} className="md:px-4">
                    <ChatBubble variant="received">
                      <ChatBubbleMessage isLoading />
                    </ChatBubble>
                  </motion.div>
                )}

                {/* Inline failure state. A toast alone is easy to miss on a
                    phone (and it lands on top of the composer); the thread
                    itself should say what happened and offer a retry. */}
                {showInlineError && (
                  <motion.div key="error" {...messageEntranceMotion} className="md:px-4">
                    <div
                      role="alert"
                      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-secondary px-4 py-3 text-sm text-foreground"
                    >
                      <span className="min-w-0 flex-1">
                        I couldn&apos;t get a reply just now — the model is busy.
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setLoadingSubmit(true);
                          reload();
                        }}
                        className="pressable flex min-h-10 items-center gap-1.5 rounded-full bg-foreground px-4 text-sm font-semibold text-primary-foreground"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Retry
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Composer — chips + input. Sits inside the keyboard-aware shell so it
          rides up with the keyboard instead of disappearing behind it. */}
      <div className="relative shrink-0 border-t border-border/40 bg-background/95 backdrop-blur-sm">
        {/* Scroll-to-latest — appears once the reader has scrolled up */}
        <AnimatePresence>
          {!isEmptyState && !isAtBottom && (
            <motion.button
              key="to-bottom"
              type="button"
              initial={{ opacity: 0, y: 8, scale: 0.9, x: '-50%' }}
              animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
              exit={{ opacity: 0, y: 8, scale: 0.9, x: '-50%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              onClick={() => scrollToBottom()}
              aria-label="Scroll to latest message"
              className="pressable absolute -top-12 left-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-[0_6px_20px_-6px_rgba(25,25,25,0.3)]"
            >
              <ArrowDown className="h-5 w-5" />
            </motion.button>
          )}
        </AnimatePresence>

        <div
          className="mx-auto flex max-w-3xl flex-col items-center px-3 pt-2 sm:px-2 sm:pt-3 md:px-0"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 10px)' }}
        >
          <HelperBoost
            submitQuery={submitQuery}
            setInput={setInput}
            collapsed={keyboardOpen}
          />
          <ChatBottombar
            input={input}
            handleInputChange={handleInputChange}
            handleSubmit={onSubmit}
            isLoading={isLoading}
            stop={handleStop}
            isToolInProgress={isToolInProgress}
          />
        </div>
      </div>
    </div>
  );
};

export default Chat;
