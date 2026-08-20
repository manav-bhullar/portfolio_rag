'use client';

import { Message } from '@ai-sdk/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';
import React, { useState } from 'react';

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

function ChatMessageContentComponent({
  message,
}: ChatMessageContentProps) {
  // Only handle text parts
  const renderContent = () => {
    return message.parts?.map((part, partIndex) => {
      if (part.type !== 'text' || !part.text) return null;

      let processedText = part.text;
      let followUps: string[] = [];
      
      // Extract follow-up questions
      const followUpMatch = processedText.match(/FOLLOW_UP_QUESTIONS:[\s\S]*/);
      if (followUpMatch) {
        const followUpBlock = followUpMatch[0];
        processedText = processedText.replace(followUpBlock, '').trim();
        
        const items = followUpBlock.match(/- (.*)/g);
        if (items) {
          followUps = items.map(i => i.replace(/^- \[?/, '').replace(/\]?$/, '').trim());
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
                      <ul className="my-4 list-disc pl-6">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="my-4 list-decimal pl-6">{children}</ol>
                    ),
                    li: ({ children }) => <li className="my-1">{children}</li>,
                    code: ({
                      inline,
                      className,
                      children,
                      ...props
                    }: React.ComponentPropsWithoutRef<'code'> & { inline?: boolean }) => {
                      const text = String(children).replace(/\n$/, '');
                      
                      // Check if this is our mock citation
                      if (inline && text.startsWith('[') && text.endsWith(']')) {
                        const sourceId = text.slice(1, -1);
                        return (
                          <span 
                            className="inline-flex cursor-help items-center rounded-full bg-[#3FB37F]/10 px-2.5 py-0.5 text-xs font-semibold text-[#3FB37F] transition-colors hover:bg-[#3FB37F]/20"
                            title={`Source: ${sourceId}`}
                          >
                            {sourceId}
                          </span>
                        );
                      }
                      
                      return <code className={className} {...props}>{children}</code>;
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
          
          {/* Render follow-up questions at the end of the text part */}
          {followUps.length > 0 && (
            <div className="mt-4 flex flex-col gap-2 border-t pt-4">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Suggested Follow-ups</span>
              <div className="flex flex-wrap gap-2">
                {followUps.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      // We need to trigger a chat submission here
                      // But since submitQuery isn't passed down to ChatMessageContent easily,
                      // we can dispatch a custom event that chat.tsx can listen for
                      window.dispatchEvent(new CustomEvent('chat:submit', { detail: q }));
                    }}
                    className="rounded-full border bg-secondary/50 px-3 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-secondary"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    });
  };

  return <div className="w-full">{renderContent()}</div>;
}

export default React.memo(ChatMessageContentComponent, (prevProps, nextProps) => {
  // Use message.id and message.content for text updates
  if (prevProps.message.id !== nextProps.message.id) return false;
  if (prevProps.message.content !== nextProps.message.content) return false;

  // Check parts deeply for tool execution status changes
  const prevParts = prevProps.message.parts || [];
  const nextParts = nextProps.message.parts || [];

  if (prevParts.length !== nextParts.length) return false;

  for (let i = 0; i < prevParts.length; i++) {
    const prevPart = prevParts[i];
    const nextPart = nextParts[i];

    if (prevPart.type !== nextPart.type) return false;

    if (prevPart.type === 'tool-invocation' && nextPart.type === 'tool-invocation') {
      if (prevPart.toolInvocation.state !== nextPart.toolInvocation.state) return false;
    }
  }

  return true;
});
