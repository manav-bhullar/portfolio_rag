'use client';
import { trackChatQuery } from '@/lib/analytics-tracker';
import { useChat, type Message } from '@ai-sdk/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';

import ChatBottombar from '@/components/chat/chat-bottombar';
import ChatLanding from '@/components/chat/chat-landing';
import ChatMessageContent from '@/components/chat/chat-message-content';
import { SimplifiedChatView } from '@/components/chat/simple-chat-view';
import { ChatBubble, ChatBubbleMessage } from '@/components/ui/chat/chat-bubble';
import HelperBoost from './HelperBoost';
import { ArrowDown, RotateCcw } from 'lucide-react';
import { useVisualViewport } from '@/hooks/use-visual-viewport';
import { messageEntranceMotion } from '@/lib/motion';

import { useChatPersistence } from '@/hooks/use-chat-persistence';
import { useChatScroll } from '@/hooks/use-chat-scroll';
import { ChatHeader } from '@/components/chat/chat-header';

export default function Chat() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('query');
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
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
    body: {
      visitorType: typeof window !== 'undefined' ? window.localStorage.getItem('portfolio_visitor_type') : null,
    },
    onResponse: (response) => {
      if (response) setLoadingSubmit(false);
    },
    onFinish: () => setLoadingSubmit(false),
    onError: (error) => {
      setLoadingSubmit(false);
      console.error('Chat error:', error.message, error.cause);
      toast.error(`Error: ${error.message}`);
    },
    onToolCall: (tool) => {
      console.log('Tool call:', tool.toolCall.toolName);
    },
  });

  const { hydrated, persistMemory, togglePersistMemory } = useChatPersistence(messages, setMessages);
  const { scrollContainerRef, isAtBottom, scrollToBottom } = useChatScroll(messages, isLoading);

  // Memoize the O(N) check over all messages so it doesn't re-run on every keystroke
  const isToolInProgress = useMemo(() => {
    return messages.some(
      (m) => m.role === 'assistant' && m.parts?.some(
        (part) => part.type === 'tool-invocation' && part.toolInvocation?.state !== 'result'
      )
    );
  }, [messages]);

  const submitQuery = useCallback((query: string) => {
    if (!query.trim() || isToolInProgress) return;

    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('query', query.trim());
        window.history.replaceState(null, '', url.pathname + url.search);
      } catch (e) {
        console.error('Failed to update URL search params:', e);
      }
    }

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

      const userMessage = { id: Date.now().toString(), role: 'user', content: query };
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

      setMessages([...messages, userMessage as Message]);
      setLoadingSubmit(true);
      setTimeout(() => {
        setMessages((prev) => [...prev, assistantMessage as Message]);
        setLoadingSubmit(false);
      }, 500);

      if (typeof window !== 'undefined') trackChatQuery(query);
      return;
    }

    setLoadingSubmit(true);
    if (typeof window !== 'undefined') trackChatQuery(query);
    append({ role: 'user', content: query });
  }, [isToolInProgress, messages, setMessages, append]);

  useEffect(() => {
    if (hydrated && initialQuery && !autoSubmitted && messages.length === 0) {
      setAutoSubmitted(true);
      setInput('');
      submitQuery(initialQuery);
    }
  }, [hydrated, initialQuery, autoSubmitted, submitQuery, setInput, messages.length]);

  useEffect(() => {
    const handleChatSubmit = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) submitQuery(customEvent.detail);
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

  const isEmptyState = messages.length === 0 && !loadingSubmit;
  const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;
  const lastRole = messages[messages.length - 1]?.role;
  const showInlineError = !!error && !isLoading && !loadingSubmit && lastRole === 'user';

  return (
    <div className="app-shell relative flex flex-col overflow-hidden">
      <ChatHeader
        messages={messages}
        setMessages={setMessages}
        setInput={setInput}
        persistMemory={persistMemory}
        togglePersistMemory={togglePersistMemory}
      />

      <div
        ref={scrollContainerRef}
        className="scroll-y min-h-0 flex-1 px-4 md:px-2"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3.5rem)' }}
      >
        <div className="mx-auto flex min-h-full max-w-3xl flex-col">
          {isEmptyState ? (
            <motion.div key="landing" className="flex flex-1 items-center justify-center" {...messageEntranceMotion}>
              <ChatLanding submitQuery={submitQuery} />
            </motion.div>
          ) : (
            <div className="flex flex-col gap-4 pt-2 pb-4 sm:pt-4">
              <AnimatePresence initial={false}>
                {messages.map((message) =>
                  message.role === 'user' ? (
                    <motion.div key={message.id} {...messageEntranceMotion} className="flex justify-end md:px-2">
                      <ChatBubble variant="sent" className="max-w-[88%] sm:max-w-[80%]">
                        <ChatBubbleMessage>
                          <ChatMessageContent message={message} isLast={message.id === lastMessageId} isLoading={false} reload={() => Promise.resolve(null)} />
                        </ChatBubbleMessage>
                      </ChatBubble>
                    </motion.div>
                  ) : (
                    <motion.div key={message.id} {...messageEntranceMotion}>
                      <SimplifiedChatView message={message} isLoading={isLoading && message.id === lastMessageId} isLast={message.id === lastMessageId} reload={reload} addToolResult={addToolResult} />
                    </motion.div>
                  )
                )}

                {loadingSubmit && lastRole === 'user' && (
                  <motion.div key="loading" {...messageEntranceMotion} className="md:px-4">
                    <ChatBubble variant="received"><ChatBubbleMessage isLoading /></ChatBubble>
                  </motion.div>
                )}

                {showInlineError && (
                  <motion.div key="error" {...messageEntranceMotion} className="md:px-4">
                    <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-secondary px-4 py-3 text-sm text-foreground">
                      <span className="min-w-0 flex-1">I couldn&apos;t get a reply just now — the model is busy.</span>
                      <button type="button" onClick={() => { setLoadingSubmit(true); reload(); }} className="pressable flex min-h-10 items-center gap-1.5 rounded-full bg-foreground px-4 text-sm font-semibold text-primary-foreground">
                        <RotateCcw className="h-4 w-4" />Retry
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <div className="relative shrink-0 border-t border-border/40 bg-background/95 backdrop-blur-sm">
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

        <div className="mx-auto flex max-w-3xl flex-col items-center px-3 pt-2 sm:px-2 sm:pt-3 md:px-0" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 10px)' }}>
          <HelperBoost submitQuery={submitQuery} setInput={setInput} collapsed={keyboardOpen} />
          <ChatBottombar input={input} handleInputChange={handleInputChange} handleSubmit={onSubmit} isLoading={isLoading} stop={handleStop} isToolInProgress={isToolInProgress} />
        </div>
      </div>
    </div>
  );
}
