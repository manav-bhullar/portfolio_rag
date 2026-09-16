'use client';

import { Message } from '@ai-sdk/react';
import { AnimatePresence } from 'framer-motion';
import { ChatBubble, ChatBubbleMessage } from '@/components/ui/chat/chat-bubble';
import { SimplifiedChatView } from '@/components/chat/simple-chat-view';

export function ShareViewClient({ messages }: { messages: Message[] }) {
  // We provide mock functions for interactive props since this is read-only
  const mockReload = async () => null;
  const mockAddToolResult = () => {};

  return (
    <div className="flex flex-col gap-6">
      <AnimatePresence initial={false}>
        {messages.map((message) => {
          if (message.role === 'user') {
            return (
              <ChatBubble key={message.id} variant="sent">
                <ChatBubbleMessage variant="sent" className="w-auto max-w-[85%] whitespace-pre-wrap">
                  {message.content as string}
                </ChatBubbleMessage>
              </ChatBubble>
            );
          }

          if (message.role === 'assistant') {
            return (
              <SimplifiedChatView
                key={message.id}
                message={message}
                isLoading={false}
                isLast={false} // Prevent follow-up chips from rendering
                reload={mockReload}
                addToolResult={mockAddToolResult}
              />
            );
          }

          return null;
        })}
      </AnimatePresence>
    </div>
  );
}
