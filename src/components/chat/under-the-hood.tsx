'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Cpu, ExternalLink } from 'lucide-react';

export interface RetrievalDiagnostics {
  type: 'retrieval-diagnostics';
  /** Router decision; absent on messages from before the router existed. */
  intent?: 'chitchat' | 'off_topic' | 'lookup' | 'broad';
  rewrittenQuery: string | null;
  sources: { id: string; title: string; score: number; url?: string }[];
  retrievalLatencyMs: number;
  model: string;
}

const INTENT_LABELS: Record<NonNullable<RetrievalDiagnostics['intent']>, string> = {
  chitchat: 'Small talk (no search)',
  off_topic: 'Off-topic (no search)',
  lookup: 'Specific question',
  broad: 'Broad question',
};

export function UnderTheHood({ diagnostics }: { diagnostics: RetrievalDiagnostics }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3 border-t pt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
      >
        <Cpu className="h-3.5 w-3.5" />
        Under the hood
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="mt-2 space-y-2 rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>Model: <span className="font-medium text-foreground">{diagnostics.model}</span></span>
            <span>Retrieval: <span className="font-medium text-foreground">{diagnostics.retrievalLatencyMs}ms</span></span>
            {diagnostics.intent && (
              <span>Route: <span className="font-medium text-foreground">{INTENT_LABELS[diagnostics.intent]}</span></span>
            )}
          </div>

          {diagnostics.rewrittenQuery && (
            <div>
              Rewritten query: <span className="italic text-foreground">&ldquo;{diagnostics.rewrittenQuery}&rdquo;</span>
            </div>
          )}

          {diagnostics.sources.length === 0 && (diagnostics.intent === 'lookup' || diagnostics.intent === 'broad') && (
            <div>No document passed the relevance threshold, so no context was sent.</div>
          )}

          {diagnostics.sources.length > 0 && (
            <div>
              <div className="mb-1 font-medium text-foreground">Retrieved chunks</div>
              <ul className="space-y-1">
                {diagnostics.sources.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2">
                    {s.url ? (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-w-0 items-center gap-1 truncate underline decoration-dotted hover:text-foreground"
                      >
                        <span className="truncate">{s.title}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="truncate">{s.title}</span>
                    )}
                    <span className="shrink-0 font-mono">{s.score.toFixed(3)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default UnderTheHood;
