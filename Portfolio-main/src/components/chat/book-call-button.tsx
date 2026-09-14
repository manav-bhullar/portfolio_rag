'use client';

import { CalendarClock, ArrowUpRight } from 'lucide-react';

/**
 * Renders nothing unless NEXT_PUBLIC_CAL_LINK is configured (e.g. "yourname/30min")
 * — scheduling is opt-in, so this degrades to just the lead-capture form until
 * a Cal.com account is set up. Links straight to the real Cal.com booking page
 * rather than embedding their popup script, so there's no third-party script
 * behavior to get subtly wrong.
 */
export function BookCallButton() {
  const calLink = process.env.NEXT_PUBLIC_CAL_LINK;
  if (!calLink) return null;

  return (
    <a
      href={`https://cal.com/${calLink}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group pressable mb-3 flex min-h-12 w-full items-center justify-between gap-3 rounded-xl bg-card p-4 transition-colors hover:bg-card/70"
    >
      <div className="flex min-w-0 items-center gap-2">
        <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Book a call directly</span>
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </a>
  );
}

export default BookCallButton;
