'use client';
import { trackChatQuery } from '@/lib/analytics-tracker';
import { useChat, type Message } from '@ai-sdk/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import posthog from 'posthog-js';

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
import { Info } from 'lucide-react';
import GitHubButton from 'react-github-btn';
import HelperBoost from './HelperBoost';

const MOTION_CONFIG = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
  transition: {
    duration: 0.3,
    ease: 'easeOut',
  },
} as const;

// Persist the conversation thread across page reloads (session memory) —
// keyed in localStorage, not synced anywhere, so it's purely per-browser.
const STORAGE_KEY = 'portfolio-chat-history';

function loadStoredMessages(): Message[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
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
  const [initialMessages] = useState<Message[]>(loadStoredMessages);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    setMessages,
    setInput,
    reload,
    addToolResult,
    append,
  } = useChat({
    initialMessages,
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
        textContent = "Outside of coding, I'm really into fitness and reading! But since you asked for a crazy story, let me tell you about how I rate-limited myself out of my own portfolio...";
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

      setLoadingSubmit(true);
      
      // Artificial delay to show "Thinking..." UX
      setTimeout(() => {
        setMessages([...messages, userMessage as unknown as Message, assistantMessage as unknown as Message]);
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

  useEffect(() => {
    // Don't replay the landing page's query param over a restored thread —
    // only auto-submit it into a genuinely fresh (empty) session.
    if (initialQuery && !autoSubmitted && messages.length === 0) {
      setAutoSubmitted(true);
      setInput('');
      submitQuery(initialQuery);
    }
  }, [initialQuery, autoSubmitted, submitQuery, setInput, messages.length]);

  // Session memory: persist the full thread so a reload doesn't lose it.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (messages.length > 0) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // localStorage unavailable (private mode, quota) — degrade silently
    }
  }, [messages]);

  // Auto-scroll the thread to the newest message as it streams in.
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

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
    if (!input.trim() || isToolInProgress) return;
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
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    router.push('/');
  };

  // Check if this is the initial empty state (no messages)
  const isEmptyState = messages.length === 0 && !loadingSubmit;

  const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;

  return (
    <div className="relative h-[100dvh] overflow-hidden">
      <div className="absolute top-3 right-3 sm:top-6 sm:right-8 z-51 flex flex-row items-center justify-center gap-1 sm:gap-2">
        <div
          onClick={handleReset}
          title="Home"
          className="hover:bg-accent cursor-pointer rounded-xl sm:rounded-2xl px-2 py-1 sm:px-3 sm:py-1.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-foreground h-5 w-5 sm:h-7 sm:w-7"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
        <WelcomeModal
          trigger={
            <div className="hover:bg-accent cursor-pointer rounded-xl sm:rounded-2xl px-2 py-1 sm:px-3 sm:py-1.5">
              <Info className="text-accent-foreground h-5 sm:h-8" />
            </div>
          }
        />
        {/* GitHub star — hidden on mobile to avoid overcrowding the top bar */}
        <div className="pt-1 hidden sm:block">
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

      {/* Fixed gradient fade at the top of the scrolling thread */}
      <div
        className="pointer-events-none fixed top-0 right-0 left-0 z-40 h-16 sm:h-20"
        style={{
          background:
            'linear-gradient(to bottom, rgba(237, 230, 214, 1) 0%, rgba(237, 230, 214, 0.8) 50%, rgba(237, 230, 214, 0) 100%)',
        }}
      />

      {/* Main Content Area */}
      <div className="container mx-auto flex h-full max-w-3xl flex-col">
        {/* Scrollable Chat Content — the full threaded conversation */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-2 pt-14 sm:pt-16"
        >
          {isEmptyState ? (
            <motion.div
              key="landing"
              className="flex min-h-full items-center justify-center"
              {...MOTION_CONFIG}
            >
              <ChatLanding submitQuery={submitQuery} />
            </motion.div>
          ) : (
            <div className="flex flex-col gap-4 pt-4 pb-4">
              <AnimatePresence initial={false}>
                {messages.map((message) =>
                  message.role === 'user' ? (
                    <motion.div
                      key={message.id}
                      {...MOTION_CONFIG}
                      className="flex justify-end px-2"
                    >
                      <ChatBubble variant="sent">
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
                    <motion.div key={message.id} {...MOTION_CONFIG}>
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
                {loadingSubmit && messages[messages.length - 1]?.role === 'user' && (
                  <motion.div key="loading" {...MOTION_CONFIG} className="px-4">
                    <ChatBubble variant="received">
                      <ChatBubbleMessage isLoading />
                    </ChatBubble>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Fixed Bottom Bar */}
        <div className="sticky bottom-0 border-t border-border/40 bg-background/95 px-2 pt-3 sm:pt-4 backdrop-blur-sm md:px-0"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
        >
          <div className="relative flex flex-col items-center gap-2 sm:gap-3">
            <HelperBoost submitQuery={submitQuery} setInput={setInput} />
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
    </div>
  );
};

export default Chat;
