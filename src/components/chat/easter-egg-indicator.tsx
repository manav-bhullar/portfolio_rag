'use client';

import { useEasterEggs } from '@/hooks/use-easter-eggs';

export default function EasterEggIndicator() {
  const { foundEggs, total } = useEasterEggs();

  if (foundEggs.length === 0) return null;

  return (
    <div 
      className="hidden sm:flex pointer-events-auto h-11 items-center justify-center rounded-full bg-accent/50 px-3 text-sm font-medium text-muted-foreground mr-1"
      title={`${foundEggs.length} out of ${total} Easter eggs found`}
    >
      <span className="mr-1.5">🥚</span>
      {foundEggs.length}/{total}
    </div>
  );
}
