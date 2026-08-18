import { trackChatQuery } from '@/lib/analytics-tracker';
'use client';
import { useChat, type Message } from '@ai-sdk/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

const Chat = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('query');
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

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

  const { currentAIMessage, latestUserMessage, hasActiveTool } = useMemo(() => {
    const latestAIMessageIndex = messages.findLastIndex(
      (m) => m.role === 'assistant'
    );
    const latestUserMessageIndex = messages.findLastIndex(
      (m) => m.role === 'user'
    );

    const result = {
      currentAIMessage:
        latestAIMessageIndex !== -1 ? messages[latestAIMessageIndex] : null,
      latestUserMessage:
        latestUserMessageIndex !== -1 ? messages[latestUserMessageIndex] : null,
      hasActiveTool: false,
    };

    if (result.currentAIMessage) {
      result.hasActiveTool =
        result.currentAIMessage.parts?.some(
          (part) =>
            part.type === 'tool-invocation' &&
            part.toolInvocation?.state === 'result'
        ) || false;
    }

    if (latestAIMessageIndex < latestUserMessageIndex) {
      result.currentAIMessage = null;
    }

    return result;
  }, [messages]);

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
    if (initialQuery && !autoSubmitted) {
      setAutoSubmitted(true);
      setInput('');
      submitQuery(initialQuery);
    }
  }, [initialQuery, autoSubmitted, submitQuery, setInput]);

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
    router.push('/');
  };

  // Check if this is the initial empty state (no messages)
  const isEmptyState =
    !currentAIMessage && !latestUserMessage && !loadingSubmit;

  // Calculate header height based on hasActiveTool
  const headerHeight = hasActiveTool ? 24 : 100;

  return (
    <div className="relative h-screen overflow-hidden">
      <div className="absolute top-6 right-8 z-51 flex flex-col-reverse items-center justify-center gap-1 md:flex-row">
        <div
          onClick={handleReset}
          title="Home"
          className="hover:bg-accent cursor-pointer rounded-2xl px-3 py-1.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-foreground h-7 w-7"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
        <WelcomeModal
          trigger={
            <div className=" hover:bg-accent cursor-pointer rounded-2xl px-3 py-1.5">
              <Info className="text-accent-foreground h-8" />
            </div>
          }
        />
        <div className="pt-2">
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

      {/* Fixed Header with Gradient — shows the latest sent message */}
      <div
        className="fixed top-0 right-0 left-0 z-50"
        style={{
          background:
            'linear-gradient(to bottom, rgba(237, 230, 214, 1) 0%, rgba(237, 230, 214, 0.95) 30%, rgba(237, 230, 214, 0.8) 50%, rgba(237, 230, 214, 0) 100%)',
        }}
      >
        <div
          className={`transition-all duration-300 ease-in-out ${hasActiveTool ? 'pt-6 pb-0' : 'py-6'}`}
        >
          <AnimatePresence>
            {latestUserMessage && !currentAIMessage && (
              <motion.div
                {...MOTION_CONFIG}
                className="mx-auto flex max-w-3xl justify-end px-4"
              >
                <ChatBubble variant="sent">
                  <ChatBubbleMessage>
                    <ChatMessageContent
                      message={latestUserMessage}
                      isLast={true}
                      isLoading={false}
                      reload={() => Promise.resolve(null)}
                    />
                  </ChatBubbleMessage>
                </ChatBubble>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto flex h-full max-w-3xl flex-col">
        {/* Scrollable Chat Content */}
        <div
          className="flex-1 overflow-y-auto px-2"
          style={{ paddingTop: `${headerHeight}px` }}
        >
          <AnimatePresence mode="wait">
            {isEmptyState ? (
              <motion.div
                key="landing"
                className="flex min-h-full items-center justify-center"
                {...MOTION_CONFIG}
              >
                <ChatLanding submitQuery={submitQuery} />
              </motion.div>
            ) : currentAIMessage ? (
              <div className="pb-4 pt-12 md:pt-24">
                <SimplifiedChatView
                  message={currentAIMessage}
                  isLoading={isLoading}
                  reload={reload}
                  addToolResult={addToolResult}
                />
              </div>
            ) : (
              loadingSubmit && (
                <motion.div
                  key="loading"
                  {...MOTION_CONFIG}
                  className="px-4 pt-18"
                >
                  <ChatBubble variant="received">
                    <ChatBubbleMessage isLoading />
                  </ChatBubble>
                </motion.div>
              )
            )}
          </AnimatePresence>
        </div>

        {/* Fixed Bottom Bar */}
        <div className="sticky bottom-0 border-t border-border/40 bg-background/95 px-2 pt-4 backdrop-blur-sm md:px-0 md:pb-4">
          <div className="relative flex flex-col items-center gap-3">
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
