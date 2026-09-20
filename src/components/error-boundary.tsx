'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCcw, TriangleAlert } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught component error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex h-[100dvh] w-full flex-col items-center justify-center bg-background px-4 text-center">
          <div className="flex max-w-sm flex-col items-center gap-4 rounded-3xl bg-secondary p-8 text-secondary-foreground shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
              <TriangleAlert className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight">Something went wrong</h2>
              <p className="text-sm text-muted-foreground">
                The chat interface encountered an unexpected error.
              </p>
            </div>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="pressable mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-foreground font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RefreshCcw className="h-4 w-4" />
              Reload session
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
