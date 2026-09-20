'use client';

import { Suspense } from 'react';
import Chat from '@/components/chat/chat';
import { ErrorBoundary } from '@/components/error-boundary';

export default function Page() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div>Loading chat...</div>}>
        <Chat />
      </Suspense>
    </ErrorBoundary>
  );
}