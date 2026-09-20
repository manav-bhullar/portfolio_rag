/**
 * M3 Expressive motion springs — real values from tokens.md (Expressive
 * scheme), not hand-picked durations. Source numbers are damping RATIO +
 * stiffness (the Android/Compose convention); Framer Motion wants an
 * absolute damping coefficient, so each is converted via
 *   damping = ratio * 2 * sqrt(stiffness)     (mass = 1, standard assumption)
 * — the same conversion already used for `ShapeIcon` and `useShapeLoop`'s
 * shape-morph springs, kept in sync with those here.
 *
 * Spatial vs effects (spec's own distinction, and a named "common mistake"
 * in the skill's SKILL.md if conflated): spatial springs move/resize/reshape
 * things and are allowed to bounce (damping ratio 0.6-0.8). Effects springs
 * animate color/opacity and must NEVER overshoot — damping ratio 1.0, always,
 * in both schemes.
 */

const spatial = {
  fast: { type: 'spring', stiffness: 800, damping: 34 }, // small components
  default: { type: 'spring', stiffness: 380, damping: 31 }, // most UI
  slow: { type: 'spring', stiffness: 200, damping: 23 }, // full-screen/large
} as const;

const effects = {
  fast: { type: 'spring', stiffness: 3800, damping: 123 },
  default: { type: 'spring', stiffness: 1600, damping: 80 },
  slow: { type: 'spring', stiffness: 800, damping: 57 },
} as const;

export const springs = { spatial, effects } as const;

/**
 * Chat message / tool-card entrance — the single most-seen animation on the
 * site (every message, every inline project/skills/contact card). Was a flat
 * `duration: 0.3` fade with no spring at all. Position and scale are spatial
 * changes (Default speed — tokens.md quick reference: "Default for most");
 * opacity is an effects change, so it gets the effects spring instead of
 * inheriting the spatial one — a bouncy fade is the spec's named common
 * mistake, not a matter of taste.
 */
export const messageEntranceMotion = {
  initial: { opacity: 0, y: 20, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 12, scale: 0.98 },
  transition: {
    y: spatial.default,
    scale: spatial.default,
    opacity: effects.default,
  },
} as const;
