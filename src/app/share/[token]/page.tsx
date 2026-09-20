import { notFound } from 'next/navigation';
import { Redis } from '@upstash/redis';
import { Message } from '@ai-sdk/react';
import Link from 'next/link';
import { House, MessageSquarePlus } from 'lucide-react';
import { ShareViewClient } from './share-view-client';

const getRedis = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
};

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  const redis = getRedis();

  if (!redis) {
    return (
      <div className="flex h-screen items-center justify-center p-4 text-center">
        <p className="text-muted-foreground">Sharing is not configured on this environment.</p>
      </div>
    );
  }

  const key = `portfolio_share_${token}`;
  const rawData = await redis.get<string | Message[]>(key);

  if (!rawData) {
    notFound();
  }

  const messages: Message[] = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

  return (
    <div className="app-shell relative flex flex-col overflow-hidden">
      {/* Header */}
      <header
        className="pt-safe pointer-events-none absolute inset-x-0 top-0 z-50"
        style={{
          background:
            'linear-gradient(to bottom, rgba(237, 230, 214, 1) 0%, rgba(237, 230, 214, 0.85) 60%, rgba(237, 230, 214, 0) 100%)',
        }}
      >
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-2 sm:h-16 sm:px-4">
          <div className="pointer-events-auto px-2">
            <span className="text-sm font-bold tracking-wider text-muted-foreground uppercase">
              Shared Snapshot
            </span>
          </div>
          <div className="flex gap-1">
            <Link
              href="/"
              title="Home"
              className="pressable pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full text-foreground hover:bg-accent"
            >
              <House className="h-6 w-6" strokeWidth={2} />
            </Link>
          </div>
        </div>
      </header>

      {/* Thread Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="pb-safe mx-auto max-w-3xl px-2 pb-32 pt-20 sm:px-4 sm:pt-24 md:px-8 lg:px-12">
          <ShareViewClient messages={messages} />
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="pb-safe absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-background via-background/95 to-transparent pt-12 pb-6 px-4">
        <div className="mx-auto max-w-sm">
          <Link
            href="/chat"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-base font-semibold text-background transition-transform active:scale-95"
          >
            <MessageSquarePlus className="h-5 w-5" />
            Start your own conversation
          </Link>
        </div>
      </div>
    </div>
  );
}
