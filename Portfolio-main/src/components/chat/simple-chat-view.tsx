'use client';

import { Message } from '@ai-sdk/react';
import { motion } from 'framer-motion';
import { ChatRequestOptions } from 'ai';
import {
  ChatBubble,
  ChatBubbleMessage,
} from '@/components/ui/chat/chat-bubble';
import MessageLoading from '@/components/ui/chat/message-loading';
import ChatMessageContent from './chat-message-content';
import ToolRenderer, { ToolInvocationItem } from './tool-renderer';

interface SimplifiedChatViewProps {
  message: Message;
  isLoading: boolean;
  reload: (
    chatRequestOptions?: ChatRequestOptions
  ) => Promise<string | null | undefined>;
  addToolResult?: (args: { toolCallId: string; result: string }) => void;
}

const MOTION_CONFIG = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
  transition: {
    duration: 0.3,
    ease: 'easeOut',
  },
} as const;

export function SimplifiedChatView({
  message,
  isLoading,
  reload,
  addToolResult,
}: SimplifiedChatViewProps) {
  if (message.role !== 'assistant') return null;

  // Extract tool invocations that are in "result" state
  const toolInvocations: ToolInvocationItem[] = [];
  if (message.parts) {
    for (const part of message.parts) {
      if (
        part.type === 'tool-invocation' &&
        part.toolInvocation &&
        part.toolInvocation.state === 'result'
      ) {
        toolInvocations.push(part.toolInvocation as ToolInvocationItem);
      }
    }
  }

  // Only display the first tool (if any)
  const currentTool = toolInvocations.length > 0 ? [toolInvocations[0]] : [];

  // Active tool invocation in progress (state !== 'result')
  const activeToolInvocationPart = message.parts?.find(
    (part) =>
      part.type === 'tool-invocation' &&
      part.toolInvocation?.state !== 'result'
  );

  const hasTextContent = message.content.trim().length > 0;
  const hasTools = currentTool.length > 0;
  const isToolInProgress = !!activeToolInvocationPart;
  const showLoading = isToolInProgress || (isLoading && !hasTools && !hasTextContent);

  const activeToolName =
    activeToolInvocationPart?.type === 'tool-invocation'
      ? activeToolInvocationPart.toolInvocation?.toolName
      : undefined;

  const TOOL_LABELS: Record<string, string> = {
    getProjects: 'Loading projects...',
    getPresentation: 'Loading presentation...',
    getResume: 'Loading resume...',
    getContact: 'Loading contact information...',
    getSkills: 'Loading skills...',
    getInterests: 'Loading interests...',
    getCrazy: 'Loading something crazy...',
  };

  const loadingText = activeToolName ? (TOOL_LABELS[activeToolName] || `Executing ${activeToolName}...`) : 'Thinking...';

  return (
    <motion.div {...MOTION_CONFIG} className="flex h-full w-full flex-col px-4">
      {/* Single scrollable container for both tool and text content */}
      <div className="custom-scrollbar flex h-full w-full flex-col overflow-y-auto">
        {/* Tool invocation result - displayed at the top */}
        {hasTools && (
          <div className="mb-4 w-full">
            <ToolRenderer
              toolInvocations={currentTool}
              messageId={message.id || 'current-msg'}
            />
          </div>
        )}

        {/* Text content */}
        {hasTextContent && (
          <div className="w-full">
            <ChatBubble variant="received" className="w-full">
              <ChatBubbleMessage className="w-full">
                <ChatMessageContent
                  message={message}
                  isLast={true}
                  isLoading={isLoading}
                  reload={reload}
                  addToolResult={addToolResult}
                  skipToolRendering={true}
                />
              </ChatBubbleMessage>
            </ChatBubble>
          </div>
        )}

        {/* Visible "Thinking..." / Tool Action Loading Indicator */}
        {showLoading && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-3 py-3 text-muted-foreground"
          >
            <MessageLoading />
            <span className="text-sm font-medium animate-pulse text-foreground/80">
              {loadingText}
            </span>
          </div>
        )}

        {/* Add some padding at the bottom for better scrolling experience */}
        <div className="pb-4"></div>
      </div>
    </motion.div>
  );
}
