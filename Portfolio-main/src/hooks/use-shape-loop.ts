'use client';

import { useEffect, useState } from 'react';
import { useMorph } from 'shape-morph/react';
import type { ShapeName } from 'shape-morph';

/**
 * The exact seven-shape sequence Android's real M3 Expressive loading
 * indicator morphs through — androidx.compose.material3
 * LoadingIndicatorDefaults.IndeterminateIndicatorPolygons, confirmed against
 * the AOSP source (LoadingIndicator.kt). Not a guessed/approximated set.
 */
export const M3_LOADING_SHAPES: ShapeName[] = [
  'SoftBurst',
  'Cookie9Sided',
  'Pentagon',
  'Pill',
  'Sunny',
  'Cookie4Sided',
  'Oval',
];

/**
 * Loops through a shape sequence, morphing from one to the next and
 * advancing on completion. Mirrors the real loading indicator's continuous
 * "always mid-morph, never resting" motion.
 */
export function useShapeLoop(shapes: ShapeName[] = M3_LOADING_SHAPES, stepDuration = 500) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    const raf = requestAnimationFrame(() => setProgress(1));
    const timeout = setTimeout(() => {
      setIndex((i) => (i + 1) % shapes.length);
    }, stepDuration);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [index, shapes, stepDuration]);

  const start = shapes[index];
  const end = shapes[(index + 1) % shapes.length];
  return useMorph(start, end, { progress, duration: stepDuration });
}
