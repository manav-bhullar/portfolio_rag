// @hidden
'use client';

import { useShapeLoop } from '@/hooks/use-shape-loop';

/**
 * M3 Expressive "Loading indicator" component — the real Android/Pixel one.
 * Per spec (components/feedback.md § Loading indicator): "a looping shape
 * morph sequence composed of seven unique Material 3 shapes," uncontained
 * default color role is Primary, flexible 24-240dp (24dp used here — the
 * spec's minimum — since this sits inline next to the "Thinking..." label
 * rather than standing alone). Replaces the previous hand-drawn animated
 * SVG wave, which wasn't a real M3 component.
 */
export default function MessageLoading() {
  const { clipPath } = useShapeLoop();

  return (
    <div
      aria-hidden="true"
      style={{
        width: 24,
        height: 24,
        flexShrink: 0,
        clipPath,
        background: 'var(--primary)',
      }}
    />
  );
}
