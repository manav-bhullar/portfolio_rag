'use client';

import { MotionConfig } from 'framer-motion';

/**
 * Honors the OS "Reduce Motion" setting for every framer-motion animation in
 * the tree (transforms/layout animations are skipped, opacity fades stay).
 * Matters most on phones, where the setting is common and springs on a
 * 60Hz low-end GPU are the first thing to jank.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
