'use client';

import { useState } from 'react';
import { Drawer } from 'vaul';
import { BookmarkIcon, BookmarkMinus, X } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useBookmarks } from '@/hooks/use-bookmarks';

export default function BookmarksDrawer() {
  const [open, setOpen] = useState(false);
  const { bookmarks, removeBookmark } = useBookmarks();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="View Saved Answers"
        title="Saved Answers"
        className="pressable pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full text-foreground hover:bg-accent relative"
      >
        <BookmarkIcon className="h-5 w-5" strokeWidth={2} />
        {bookmarks.length > 0 && (
          <span className="absolute top-2 right-2 flex h-3 w-3 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
            {bookmarks.length}
          </span>
        )}
      </button>

      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-[101] mt-24 flex max-h-[85vh] flex-col rounded-t-[32px] bg-background">
            <div className="flex-1 overflow-y-auto rounded-t-[32px] p-6 pt-10">
              <div className="mx-auto max-w-xl">
                <Drawer.Handle className="mb-6 bg-muted-foreground/20" />
                
                <div className="mb-8 flex items-center justify-between">
                  <Drawer.Title className="text-2xl font-bold font-display">
                    Saved Answers
                  </Drawer.Title>
                  <Drawer.Close className="rounded-full bg-accent p-2 hover:bg-accent/80 transition-colors">
                    <X className="h-5 w-5" />
                  </Drawer.Close>
                </div>

                {bookmarks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <BookmarkIcon className="h-12 w-12 mb-4 opacity-20" />
                    <p>No saved answers yet.</p>
                    <p className="text-sm mt-1">Tap the bookmark icon on any message to save it here.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    {bookmarks.map((bookmark) => (
                      <div key={bookmark.id} className="relative rounded-2xl border border-border bg-card p-5 shadow-sm">
                        <button
                          onClick={() => removeBookmark(bookmark.messageId)}
                          className="absolute right-3 top-3 rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-destructive transition-colors"
                          title="Remove bookmark"
                        >
                          <BookmarkMinus className="h-4 w-4" />
                        </button>
                        <div className="prose prose-sm dark:prose-invert max-w-none pr-8">
                          <Markdown remarkPlugins={[remarkGfm]}>
                            {bookmark.content}
                          </Markdown>
                        </div>
                        <div className="mt-3 text-xs text-muted-foreground opacity-60">
                          {new Date(bookmark.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
