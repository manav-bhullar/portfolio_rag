'use client';

import { useSyncExternalStore } from 'react';

/**
 * SSR-safe media query hook. Returns `false` on the server and on the very
 * first client render so server and client markup match, then snaps to the
 * real value before paint (useSyncExternalStore re-runs synchronously).
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

/** Tailwind's `md` breakpoint — everything below this is treated as "phone". */
export const useIsMobile = () => !useMediaQuery('(min-width: 768px)');

/** Coarse pointer = touch device. Used to skip hover-only affordances/autofocus. */
export const useIsTouch = () => useMediaQuery('(pointer: coarse)');
