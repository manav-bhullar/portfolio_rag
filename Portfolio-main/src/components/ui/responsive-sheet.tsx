'use client';

import * as React from 'react';
import { Drawer } from 'vaul';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

/**
 * One API, two presentations:
 *  - phone  (< md): a vaul bottom sheet — drag handle, swipe-down to dismiss,
 *                   sticky header with the close button always reachable,
 *                   body scrolls independently, safe-area padded.
 *  - desktop (md+): a centered Radix dialog.
 *
 * Centered modals are the wrong shape on a phone: the close button scrolls
 * away, the backdrop margin is too thin to tap, and there's no gesture to
 * dismiss. A sheet fixes all three.
 */
export interface ResponsiveSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible title. Rendered in the sticky header unless `header` is given. */
  title: React.ReactNode;
  /** Optional custom header content (icon + title etc). Close button is added for you. */
  header?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  /** Desktop dialog max width class, e.g. "md:max-w-2xl" */
  desktopClassName?: string;
  /** Sheet height on mobile as a CSS value, or "auto" to size to content (capped at 92dvh). Default 92dvh. */
  mobileHeight?: string;
}

export function ResponsiveSheet({
  open,
  onOpenChange,
  title,
  header,
  description,
  children,
  desktopClassName,
  mobileHeight = '92dvh',
}: ResponsiveSheetProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[2px]" />
          <Drawer.Content
            className="fixed inset-x-0 bottom-0 z-[100] flex flex-col rounded-t-[1.75rem] bg-card outline-none"
            style={
              mobileHeight === 'auto'
                ? { maxHeight: '92dvh' }
                : { height: mobileHeight, maxHeight: mobileHeight }
            }
          >
            {/* Drag handle — the whole header is a drag region for vaul */}
            <div className="flex shrink-0 justify-center pt-3 pb-1">
              <div aria-hidden className="h-1.5 w-10 rounded-full bg-border" />
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3">
              <div className="min-w-0 flex-1">
                {header ?? (
                  <Drawer.Title className="font-display truncate text-xl font-bold text-foreground">
                    {title}
                  </Drawer.Title>
                )}
                {header && <Drawer.Title className="sr-only">{title}</Drawer.Title>}
                {description ? (
                  <Drawer.Description className="sr-only">{description}</Drawer.Description>
                ) : (
                  <Drawer.Description className="sr-only">{typeof title === 'string' ? title : 'Details'}</Drawer.Description>
                )}
              </div>
              <Drawer.Close
                aria-label="Close"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground active:scale-95"
              >
                <X className="h-5 w-5" />
              </Drawer.Close>
            </div>

            {/* Body — the only thing that scrolls. Bottom padding clears the home indicator. */}
            <div
              className="scroll-y min-h-0 flex-1 px-5"
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}
            >
              {children}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className={cn(
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'fixed top-1/2 left-1/2 z-[100] flex max-h-[88dvh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-3xl bg-card shadow-2xl outline-none duration-200',
            desktopClassName
          )}
        >
          <div className="flex shrink-0 items-center justify-between gap-4 px-8 pt-8 pb-4">
            <div className="min-w-0 flex-1">
              {header ?? (
                <DialogPrimitive.Title className="font-display text-2xl font-bold text-foreground">
                  {title}
                </DialogPrimitive.Title>
              )}
              {header && <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>}
              <DialogPrimitive.Description className="sr-only">
                {description ?? (typeof title === 'string' ? title : 'Details')}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              aria-label="Close"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-secondary/70"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="scroll-y min-h-0 flex-1 px-8 pb-8">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default ResponsiveSheet;
