// src/components/chat/chat-bottombar.tsx
'use client';

import { ChatRequestOptions } from 'ai';
import { ArrowUp, Square } from 'lucide-react';
import React, { useEffect } from 'react';
import { useIsTouch } from '@/hooks/use-media-query';

interface ChatBottombarProps {
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (
    e: React.FormEvent<HTMLFormElement>,
    chatRequestOptions?: ChatRequestOptions
  ) => void;
  isLoading: boolean;
  stop: () => void;
  input: string;
  isToolInProgress: boolean;
}

export default function ChatBottombar({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  stop,
  isToolInProgress,
}: ChatBottombarProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isTouch = useIsTouch();

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      e.key === 'Enter' &&
      !e.nativeEvent.isComposing &&
      !isToolInProgress &&
      input.trim()
    ) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
    }
  };

  // Autofocus only with a real keyboard. On a phone, focusing on mount pops
  // the on-screen keyboard over half the screen before the visitor has read
  // anything — they should tap the field when they're ready to type.
  useEffect(() => {
    if (!isTouch) inputRef.current?.focus();
  }, [isTouch]);

  const canSend = !!input.trim() && !isToolInProgress && !isLoading;

  return (
    <form onSubmit={handleSubmit} className="w-full md:px-4">
      <div className="mx-auto flex min-h-12 items-center gap-2 rounded-full border border-border/50 bg-card py-1.5 pr-1.5 pl-4 shadow-[0_4px_14px_rgba(0,0,0,0.05)] transition-[border-color,box-shadow] focus-within:border-[#3FB37F] focus-within:shadow-[0_4px_20px_rgba(63,179,127,0.15)] sm:pl-5">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          aria-label="Ask me anything"
          placeholder={isToolInProgress ? 'Tool is in progress...' : 'Ask me anything'}
          // 16px on phones: anything smaller makes iOS Safari zoom in on focus
          className="min-w-0 flex-1 border-none bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
          disabled={isToolInProgress}
          enterKeyHint="send"
          autoComplete="off"
          autoCorrect="on"
          autoCapitalize="sentences"
          spellCheck
        />

        {isLoading ? (
          <button
            type="button"
            onClick={stop}
            aria-label="Stop generating"
            className="pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-primary-foreground"
          >
            <Square className="h-4 w-4 fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            aria-label="Send message"
            disabled={!canSend}
            className="pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-primary-foreground transition-opacity disabled:opacity-40"
          >
            <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </form>
  );
}
