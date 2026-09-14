'use client';

import { useEffect, useState } from 'react';

/**
 * Keeps `--app-height` on <html> in sync with the *visual* viewport and
 * reports whether the on-screen keyboard is open.
 *
 * Why: `100dvh` does not shrink when the keyboard opens on iOS Safari (the
 * layout viewport stays put, only the visual viewport shrinks), so anything
 * pinned to the bottom of a 100dvh box ends up behind the keys. Sizing the
 * chat shell to `var(--app-height)` makes the composer sit right above them.
 * Android Chrome is handled by `interactiveWidget: resizes-content` in the
 * viewport meta, but this hook is harmless there and gives us the keyboard
 * signal for free.
 */
export function useVisualViewport(): { keyboardOpen: boolean } {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    const root = document.documentElement;
    // The largest height we've seen is our best guess at "no keyboard".
    let maxHeight = vv ? vv.height : window.innerHeight;

    const update = () => {
      const height = vv ? vv.height : window.innerHeight;
      maxHeight = Math.max(maxHeight, height);
      const keyboard = Math.max(0, maxHeight - height);
      root.style.setProperty('--app-height', `${Math.round(height)}px`);
      root.style.setProperty('--keyboard-height', `${Math.round(keyboard)}px`);
      // 120px threshold: browser chrome show/hide is ~60-100px; keyboards are 250px+
      setKeyboardOpen(keyboard > 120);
    };

    update();
    vv?.addEventListener('resize', update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', () => {
      maxHeight = 0; // rotation changes the baseline
      update();
    });
    return () => {
      vv?.removeEventListener('resize', update);
      window.removeEventListener('resize', update);
      root.style.removeProperty('--app-height');
      root.style.removeProperty('--keyboard-height');
    };
  }, []);

  return { keyboardOpen };
}
