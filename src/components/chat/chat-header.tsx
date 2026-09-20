import React, { useCallback, useState } from 'react';
import { type Message } from '@ai-sdk/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Brain, House, Info, Loader2, Share } from 'lucide-react';
import GitHubButton from 'react-github-btn';

import WelcomeModal from '@/components/welcome-modal';
import BookmarksDrawer from './bookmarks-drawer';
import EasterEggIndicator from './easter-egg-indicator';

interface ChatHeaderProps {
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  setInput: (input: string) => void;
  persistMemory: boolean;
  togglePersistMemory: () => void;
}

export function ChatHeader({
  messages,
  setMessages,
  setInput,
  persistMemory,
  togglePersistMemory,
}: ChatHeaderProps) {
  const router = useRouter();
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = useCallback(async () => {
    if (messages.length === 0) return;
    setIsSharing(true);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });
      if (!res.ok) throw new Error('Failed to share');
      const { token } = await res.json();
      const shareUrl = `${window.location.origin}/share/${token}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied! Anyone with the link can view this chat.');
    } catch {
      toast.error('Failed to create share link.');
    } finally {
      setIsSharing(false);
    }
  }, [messages]);

  const handleReset = () => {
    setMessages([]);
    setInput('');
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem('portfolio-chat-history');
      } catch {
        // ignore
      }
    }
    router.push('/');
  };

  return (
    <header
      className="pt-safe pointer-events-none absolute inset-x-0 top-0 z-50"
      style={{
        background:
          'linear-gradient(to bottom, rgba(237, 230, 214, 1) 0%, rgba(237, 230, 214, 0.85) 60%, rgba(237, 230, 214, 0) 100%)',
      }}
    >
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-end gap-1 px-2 sm:h-16 sm:px-4">
        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleShare}
            disabled={isSharing}
            aria-label="Share conversation"
            title="Share"
            className="pressable pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full text-foreground hover:bg-accent disabled:opacity-50"
          >
            {isSharing ? (
              <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} />
            ) : (
              <Share className="h-5 w-5" strokeWidth={2} />
            )}
          </button>
        )}
        <EasterEggIndicator />
        <BookmarksDrawer />
        <button
          type="button"
          onClick={togglePersistMemory}
          aria-label={persistMemory ? 'Forget me' : 'Remember me'}
          title="Cross-Session Memory"
          className={`pressable pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
            persistMemory
              ? 'bg-[#3FB37F]/20 text-[#3FB37F] hover:bg-[#3FB37F]/30'
              : 'text-foreground hover:bg-accent'
          }`}
        >
          <Brain className="h-5 w-5" strokeWidth={2} />
        </button>
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
  );
}
