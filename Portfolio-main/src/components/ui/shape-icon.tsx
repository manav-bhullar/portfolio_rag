'use client';

import { useState } from 'react';
import { useMorph } from 'shape-morph/react';
import type { ShapeName } from 'shape-morph';

interface ShapeIconProps {
  children: React.ReactNode;
  /** Resting shape. Default Cookie9Sided — the site's signature "cookie" shape
      (see DESIGN.md), now the real M3 shape instead of a hand-drawn approximation. */
  restShape?: ShapeName;
  /** Shape morphed to on hover/press — this is the actual "shape morphing"
      tactic (references/shape.md: "morph should respond to user interaction"),
      not just a static shape swap. */
  activeShape?: ShapeName;
  size?: number;
  background: string;
  color: string;
  className?: string;
}

/**
 * Icon badge rendered as a real M3 shape-library shape (via shape-morph, a
 * faithful port of Google's androidx.graphics.shapes — Google ships no
 * official web version of this library, see shape.md: "Web is not currently
 * available"). Morphs to `activeShape` on hover/press using the Expressive
 * scheme's Fast spatial spring (damping ratio 0.6, stiffness 800 — tokens.md;
 * converted to shape-morph's absolute damping via damping = ratio * 2 *
 * sqrt(stiffness) since mass=1, same convention as framer-motion). Fast
 * spatial is correct here per the spec's own quick reference: "small
 * components" get the fast speed.
 */
export function ShapeIcon({
  children,
  restShape = 'Cookie9Sided',
  activeShape = 'Sunny',
  size = 44,
  background,
  color,
  className,
}: ShapeIconProps) {
  const [active, setActive] = useState(false);
  const { clipPath } = useMorph(restShape, activeShape, {
    progress: active ? 1 : 0,
    spring: { stiffness: 800, damping: 34 },
  });

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        background,
        color,
        clipPath,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onTouchStart={() => setActive(true)}
      onTouchEnd={() => setActive(false)}
    >
      {children}
    </div>
  );
}

export default ShapeIcon;
