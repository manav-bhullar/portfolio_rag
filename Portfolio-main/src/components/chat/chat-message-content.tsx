'use client';

import { Message } from '@ai-sdk/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import UnderTheHood, { type RetrievalDiagnostics } from './under-the-hood';
import { cn } from '@/lib/utils';

export type ChatMessageContentProps = {
  message: Message;
  isLast?: boolean;
  isLoading?: boolean;
  reload?: () => Promise<string | null | undefined>;
  addToolResult?: (args: { toolCallId: string; result: string }) => void;
  skipToolRendering?: boolean;
};

const CodeBlock = ({ content }: { content: string }) => {
  const [isOpen, setIsOpen] = useState(true);

  // Extract language if present in the first line
  const firstLineBreak = content.indexOf('\n');
  const firstLine = content.substring(0, firstLineBreak).trim();
  const language = firstLine || 'text';
  const code = firstLine ? content.substring(firstLineBreak + 1) : content;

  // Get first few lines for preview
  const previewLines = code.split('\n').slice(0, 1).join('\n');
  const hasMoreLines = code.split('\n').length > 1;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="my-4 w-full overflow-hidden rounded-md"
    >
      <div className="bg-secondary text-secondary-foreground flex items-center justify-between rounded-t-md border-b px-4 py-1">
        <span className="text-xs">
          {language !== 'text' ? language : 'Code'}
        </span>
        <CollapsibleTrigger className="hover:bg-secondary/80 rounded p-1">
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </CollapsibleTrigger>
      </div>

      <div className="bg-accent/80 text-accent-foreground rounded-b-md">
        {!isOpen && hasMoreLines ? (
          <pre className="px-4 py-3">
            <code className="text-sm">{previewLines + '\n...'}</code>
          </pre>
        ) : (
          <CollapsibleContent>
            <div className="custom-scrollbar" style={{ overflowX: 'auto' }}>
              <pre className="min-w-max px-4 py-3">
                <code className="text-sm whitespace-pre">{code}</code>
              </pre>
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
};

export default function ChatMessageContent({
  message,
  isLast = false,
  isLoading = false,
}: ChatMessageContentProps) {
  const diagnostics = (message.annotations as unknown[] | undefined)?.find(
    (a): a is RetrievalDiagnostics =>
      typeof a === 'object' && a !== null && (a as { type?: string }).type === 'retrieval-diagnostics'
  );

  const sourceTitleById = new Map<string, string>(
    diagnostics?.sources.map((s) => [s.id, s.title]) ?? []
  );
  const sourceUrlById = new Map<string, string>(
    diagnostics?.sources.filter((s) => s.url).map((s) => [s.id, s.url as string]) ?? []
  );

  // Follow-up chips should only appear on the last message and only once streaming is done
  const showFollowUps = isLast && !isLoading;

  // Only handle text parts
  const renderContent = () => {
    return message.parts?.map((part, partIndex) => {
      if (part.type !== 'text' || !part.text) return null;

      let processedText = part.text;
      let followUps: string[] = [];
      
      // Extract follow-up questions — strip the block from rendered text regardless,
      // but only render chips when showFollowUps is true (last, non-loading message)
      const followUpMatch = processedText.match(/FOLLOW_UP_QUESTIONS:[\s\S]*/);
      if (followUpMatch) {
        const followUpBlock = followUpMatch[0];
        processedText = processedText.replace(followUpBlock, '').trim();
        
        if (showFollowUps) {
          const items = followUpBlock.match(/- (.*)/g);
          if (items) {
            followUps = items.map(i => i.replace(/^- \[?/, '').replace(/\]?$/, '').trim()).filter(Boolean);
          }
        }
      }

      // Convert citations [citation: source_id] to something we can render
      // We can just use a span with a specific class for now
      processedText = processedText.replace(/\[citation:\s*([^\]]+)\]/g, ' `[$1]` ');

      // Split content by code block markers
      const contentParts = processedText.split('```');

      return (
        <div key={partIndex} className="w-full space-y-4">
          {contentParts.map((content, i) =>
            i % 2 === 0 ? (
              // Regular text content
              <div key={`text-${i}`} className="prose dark:prose-invert w-full">
                <Markdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => (
                      <p className="break-words whitespace-pre-wrap">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="my-2 list-disc pl-5 sm:my-3 sm:pl-6">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="my-2 list-decimal pl-5 sm:my-3 sm:pl-6">{children}</ol>
                    ),
                    li: ({ children }) => <li className="my-1">{children}</li>,
                    code: ({
                      className,
                      children,
                      ...props
                    }: React.ComponentPropsWithoutRef<'code'>) => {
                      const text = String(children).replace(/\n$/, '');

                      // Citation marker we injected above. react-markdown v10 no
                      // longer passes `inline`, so detect by shape: single-line,
                      // no language class, wrapped in [ ]. A citation may carry
                      // several comma-separated ids — render one pill per id so
                      // the row wraps cleanly on a narrow screen instead of one
                      // long monospace token.
                      const isBlock = /language-/.test(className ?? '') || text.includes('\n');
                      if (!isBlock && text.startsWith('[') && text.endsWith(']')) {
                        const ids = text.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean);
                        return (
                          <>
                            {ids.map((sourceId) => {
                              const sourceTitle = sourceTitleById.get(sourceId);
                              const sourceUrl = sourceUrlById.get(sourceId);
                              const pillClassName =
                                'mx-0.5 inline-block max-w-[80vw] truncate rounded-full sm:max-w-sm bg-[#3FB37F]/10 px-2 py-0.5 align-baseline text-[11px] font-semibold text-[#3FB37F] transition-colors hover:bg-[#3FB37F]/20';

                              if (sourceUrl) {
                                return (
                                  <a
                                    key={sourceId}
                                    href={sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={cn(pillClassName, 'cursor-pointer underline decoration-dotted')}
                                    title={`View source: ${sourceTitle ?? sourceId}`}
                                  >
                                    {sourceTitle ?? sourceId}
                                  </a>
                                );
                              }

                              return (
                                <span
                                  key={sourceId}
                                  className={cn(pillClassName, 'cursor-help')}
                                  title={sourceTitle ? `Source: ${sourceTitle}` : `Source: ${sourceId}`}
                                >
                                  {sourceTitle ?? sourceId}
                                </span>
                              );
                            })}
                          </>
                        );
                      }

                      return (
                        <code className={cn('rounded bg-secondary px-1 py-0.5 text-[0.9em]', className)} {...props}>
                          {children}
                        </code>
                      );
                    },
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        {children}
                      </a>
                    ),
                  }}
                >
                  {content}
                </Markdown>
              </div>
            ) : (
              // Code block content
              <CodeBlock key={`code-${i}`} content={content} />
            )
          )}
          
          {/* Follow-up suggestion chips — M3 style, spring-animated, last message only */}
          <AnimatePresence>
            {followUps.length > 0 && (
              <motion.div
                key="follow-ups"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.1 }}
                className="mt-4 flex flex-col gap-2.5 border-t border-border/50 pt-4"
              >
                <span className="text-[11px] font-bold tracking-[0.1em] text-muted-foreground uppercase">
                  Ask next
                </span>
                <div className="flex flex-wrap gap-2">
                  {followUps.map((q, idx) => (
                    <motion.button
                      key={idx}
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 380,
                        damping: 28,
                        delay: 0.12 + idx * 0.06,
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('chat:submit', { detail: q }));
                      }}
                      className="pressable group flex min-h-10 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-left text-sm font-medium text-foreground transition-colors hover:border-[#3FB37F]/40 hover:bg-secondary"
                    >
                      <span className="flex-1">{q}</span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-[#3FB37F]" />
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    });
  };

  return (
    <div className="w-full">
      {renderContent()}
      {diagnostics && <UnderTheHood diagnostics={diagnostics} />}
    </div>
  );
}
