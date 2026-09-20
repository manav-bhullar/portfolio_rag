# M3 Expressive — Working Plan

Tracking doc for the Material 3 Expressive redesign (branch `m3-expressive-redesign`). Not a spec
reference — that lives in `.claude/skills/m3-expressive/`. This is the project log: what we've
actually done, how, and what's still open.

## The diagnosis (2026-09-15)

Everything shipped so far is a **correct but quiet** micro-fix: real color science, real corner
radii, real shapes on small icon badges, a real loading indicator. All grounded in the actual spec —
none of it guessed. But M3 Expressive's own seven tactics are containment, color, shape, typography,
motion, component flexibility, and hero moments — and we've only really moved the needle on **shape**,
in small (~24-44px) decorative spots. Color *values* are correct now but color *application* hasn't
changed: the page is still one warm-neutral tone with small color pops, not the "rich and nuanced...
mixed on key elements" the spec calls for. Typography, motion, and containment/hero-moments are
**untouched**. That's the gap: we've been fixing atoms, not composing the one or two moments that
should actually be bold.

Going forward, prioritize changes visible at a glance from across the room, not changes you'd need to
inspect CSS to notice.

## Status legend

`Not started` · `Planned` · `In progress` · `Shipped, unverified` · `Confirmed` (user has visually checked it live)

---

## Log

| # | What we thought about changing | How we actually implemented it (not just "installed X") | Status |
|---|---|---|---|
| 1 | Color system — replace hand-picked hex with a real palette | Wrote `scripts/generate-m3-tokens.mjs` using `@material/material-color-utilities`'s `SchemeFidelity` variant, seeded from one brand hue (`#B5481E`). Generates ~90 CSS custom properties (`--md-sys-color-*`) for light + dark from real HCT math. Project accents harmonized to primary via `customColor()`. Wired into `globals.css` by aliasing the old `--background`/`--primary`/etc. vars onto the new tokens. | Shipped, unverified — never explicitly confirmed live |
| 2 | Corner-radius scale — replace ad hoc `--radius` chain | Remapped Tailwind's `rounded-sm..3xl` theme values to the real 10-step M3 scale (8/12/16/20/28/32dp) in `globals.css`, so ~90 existing call sites picked up correct values with no per-component edits. Explicit fix: `button.tsx` was hardcoded `rounded-md`; spec says buttons default to full, changed directly. | Confirmed (user: "minor change," acknowledged as working but small) |
| 3 | Shape library — actually use `shape-morph`, not just install it | Built `ShapeIcon` component (`ui/shape-icon.tsx`) using `useMorph` from `shape-morph/react`. Applied to icon badges in `ProjectCard`, `interests.tsx`, `crazy.tsx`, `resume.tsx` — each project gets a distinct real M3 shape (Cookie9Sided, Clover4Leaf, Burst, Pentagon, Sunny), morphs on hover/press using Expressive-scheme Fast spatial spring values converted from the spec's damping-ratio/stiffness to shape-morph's absolute damping. | Confirmed working, but flagged as visually minor (44px elements) |
| 4 | Loading indicator — real M3 component, not decoration | Pulled the actual Android source (`LoadingIndicator.kt` on `android.googlesource.com`, AOSP) to confirm the real 7-shape sequence: SoftBurst → Cookie9Sided → Pentagon → Pill → Sunny → Cookie4Sided → Oval. Built `useShapeLoop` hook, replaced the hand-drawn SVG wave in `message-loading.tsx`. Color now `--md-sys-color-primary` (spec: uncontained default = Primary), not hardcoded hex. | Confirmed working, flagged as still minor (24px, brief) |
| 4a | Typography — real 30-style type scale | Built `type-scale.css` (Tailwind v4 `@utility` classes) for all 30 baseline+emphasized styles from `tokens.md`, correct Brand/Plain typeface split. Applied to hero headline + 5 section headings immediately. Caught a real bug along the way: `--font-sans` pointed at an unused Geist leftover, fixed to the actually-loaded `--font-inter`. | Shipped with a correction — see 4b |
| 4b | Correction: hero headline regression | Applying the literal `text-display-lg-emphasized` token (57sp, weight 500) to the hero name made it read as *less* expressive than the original hand-tuned `font-black` scale — confirmed by direct user before/after screenshot comparison. Root cause: conflated "use the real component-scale token everywhere" with "hero text is capped by that token." The spec says the opposite for genuine hero moments — tactic #3 ("heavier weights, larger sizes... direct attention") and `shape.md`'s explicit sanction of hero-moment customization ("appropriate — and encouraged"). Fixed by reverting the hero `<h1>` to the bold/large responsive treatment, now documented in `page.tsx` as a deliberate hero-moment exception rather than an oversight. Section headings (smaller, non-hero text) correctly kept the real token values. | Fixed, confirmed by user |

---

## What's still open — ranked by how much it'll actually be felt

Impact tag = how big a fraction of the screen/how often it's seen, not implementation effort. Micro
changes are correct-but-quiet — the exact mistake items 3-4 above made (real shapes, but only on
24-44px elements). Prioritize Macro before Medium before Micro.

| # | What we could change | How to actually implement it | Impact | Status |
|---|---|---|---|---|
| 5 | **Carousel items morph shape on scroll/tap** — spec-mandated, not invented: `components/containment.md` § Carousel states "dynamic carousel items change shape when scrolled; tapping an item changes the shape slightly plus a touch ripple." The projects carousel is one of the most-interacted-with elements on the site and currently just has static rectangular cards. | See "Implementation deep-dives" below — the naive version (morphing the card's own rectangle into an abstract shape) breaks the spec's own text-heavy-container rule. Real target: the card's already-existing decorative accent blob. | **Macro** | Not started |
| 6 | **A real FAB (Floating Action Button)** — the site has zero FABs. Spec: a FAB carries "the most important action on a screen... in front of all other content," persists while scrolling, uses primary color. Landing it well combines shape + color + containment (3 tactics at once) in one always-on-screen element. | Add a Medium FAB (mobile) / Large FAB (desktop) per `components/fabs.md` sizing, primary-container color role (spec default), positioned per spec (bottom-trailing on compact/medium, upper-left on expanded). Needs a decision on what action it represents — likely "ask a question" / open chat input, given the chat-first navigation model. | **Macro** | Not started |
| 7 | **Hero background shape, done for real** — `.shape-blob-hero` is a hand-drawn SVG wave clip-path, not an actual `shape-morph` shape. | See "Implementation deep-dives" below — found a real, pre-existing spec violation while scoping this: the wavy clip-path is currently applied to the *text-bearing* hero card, not a decorative layer. | **Macro** | Not started |
| 8 | **Rich, nuanced color application** — move color from "small accent pops" to "mixed on key elements" per tactic #2 | Identify 3-5 "key elements" per screen (primary CTA, active/selected states, the chat send button, category headers) and deliberately assign primary/secondary/tertiary fills to them — not just leaving most of the UI on neutral surface tones. Needs a concrete before/after audit of where color currently appears vs. spec guidance, then targeted recoloring. | **Macro** | Not started |
| 9 | ~~Typography — real 30-style type scale~~ | Shipped as 4a, with a correction logged as 4b. Still open: convert remaining smaller text (card titles, chip labels, chat message body, item sub-headings) to the real scale — only the hero + 5 section headings are converted so far. | Macro | Superseded by 4a/4b — remainder still open |
| 10 | **Motion — real spring physics** | Replace ad hoc `framer-motion` `duration: 0.3`-style transitions (chat message entrance, card reveal, chip press) with the actual Expressive spring tokens already computed in earlier research (damping/stiffness per spatial vs. effects, fast/default/slow). Felt without being able to name why. | **Macro** (site-wide, but per-interaction subtle) | Not started |
| 11 | **Quick-question chips / category filters morph on selection** — spec: "toggle buttons swap their resting shape — round when unselected, square when selected." | Apply the `useMorph` pattern to `HelperBoost.tsx` chip selection state. Visible on every landing view, so it's seen constantly even though each chip is small. | Medium | Not started |
| 12 | **Send button shape-morph by state** | Spec: "pressed buttons become more square." Morph the chat send button's shape between idle/press/sending states using the same `ShapeIcon`/`useMorph` pattern already proven to work. Used in every chat turn, but the element itself is small. | Medium | Not started (previously scoped, deprioritized in favor of loading indicator) |
| 13 | **Bottom-sheet drag handle morph** | Morph the drag handle shape as the user drags, for real interaction feedback (spec: shape morph communicates "actions in progress"). | Micro | Not started |
| 14 | **MB brand mark → real shape** | Replace the hand-approximated `.shape-blob` CSS squircle with an actual `shape-morph` shape (e.g. Cookie12Sided), possibly ambient-morphing between two shapes. Real use case, but the mark isn't very prominent in the current layout, so fixing it won't read as major on its own. | Micro–Medium | Not started |
| 15 | **More icon-badge shapes elsewhere** (contact icons, skills category icons) | Same `ShapeIcon` pattern as project cards. Explicitly deprioritized: repeats the exact mistake of items 3-4 (real shapes, but only in small badges) rather than fixing the actual gap. | Micro — skip unless doing a final consistency pass | Not planned |
| 16 | **Cleanup** — remove dead Apple-carousel/legacy components now the direction is settled | Delete `apple-cards-carousel.tsx` and unused `ui/` leftovers (`animated-testimonials`, `compare`, `sparkles`, `turbo-title`, `input-landing`) once confirmed genuinely unreferenced. | N/A (hygiene, not visual) | Not started |

---

## Implementation deep-dives

### #5 — Carousel items morph shape on scroll/tap

**The naive version is wrong.** The obvious reading — clip each `ProjectCard`'s own rectangle into
Cookie9Sided or similar as it comes into focus — directly breaks a rule from `shape.md`: *"Avoid
applying unconventional shapes to text-heavy containers."* Project cards have a title, a blurb, tags,
and a metric — genuinely text-heavy. Morphing the card itself into an organic blob would clip or
garble that text.

**What the spec actually means here**, read against how Google's own Carousel component works: item
shape morph in the real component is about *image/visual* elements changing size-class/silhouette as
they move through large → medium → small carousel slots — not swapping text containers into abstract
blobs.

**The correct target already exists in this codebase**: `ProjectCard.tsx` already renders a small
decorative accent blob behind each card corner (`.shape-card-accent`, one real `shape-morph` shape per
project — Cookie9Sided, Clover4Leaf, Burst, Pentagon, Sunny, assigned in `accentShape`, done in item 3).
That accent is *not* text — it's pure decoration. That's the spec-legal, high-impact target:

1. In `ProjectsCarousel.tsx`, compute a continuous 0–1 "focus" value per card from scroll position
   (reuse the existing scroll-math already there for the dot indicator — `onScroll` + `requestAnimationFrame`
   reading `offsetLeft`/`scrollLeft` relative to viewport center — don't add a second competing scroll
   listener).
2. Pass that focus value down to each `ProjectCard`, and drive its accent blob's *size* (not the card's
   own shape) between a small resting scale and a large "bloomed" scale as focus approaches 1 — plain
   CSS `transform: scale()` interpolation is enough here, no `useMorph` needed for the size change.
3. Layer `useMorph` on top for the *shape itself* — e.g. the resting accent shape slowly morphs toward
   a second, "activated" shape (per project) as focus increases, using the same Expressive Fast-spatial
   spring already computed for `ShapeIcon`.
4. On tap: a brief, distinct morph pulse (shape overshoots toward a third shape and springs back) plus
   a touch-ripple effect — the spec's literal "tapping an item changes the shape slightly plus a touch
   ripple."
5. Off-focus cards' accents shrink/fade rather than disappearing outright, so the row still reads as
   one coherent shape-family as you scroll.

This reuses 100% of the shape work already shipped (item 3) — no new shape assignments needed, just a
scroll-driven focus value feeding the existing `accentShape` map.

### #7 — Hero background shape, done for real

While scoping this, found something worth fixing regardless of the shape upgrade: `page.tsx`'s hero
has **two** shape layers, and they're not equivalent:

1. A blurred, multi-color **gradient blob** behind everything (`absolute -inset-4 ... rounded-[40%_60%...]
   blur-2xl`) — genuinely decorative, no text on it. This is the correct, spec-legal target for a real
   `shape-morph` shape.
2. `.shape-blob-hero` itself (the SVG wavy clip-path, `#hero-wave-clip`) — but this is applied directly
   to the card that **contains the headline, subheading, search bar, and chips** (`page.tsx` line ~106:
   `className="shape-blob-hero relative z-10 flex ... bg-card ... text-center"`). That's a text-heavy
   container wearing an irregular wave shape — the same rule violation as #5's naive version, except
   this one's already live in production, not something I'd be introducing.

**Implementation plan:**

1. Layer 1 (gradient blob) → replace the hand-tuned `rounded-[...]` percentage shape with a real large
   `shape-morph` shape (candidates: Bun, Flower, SoftBoom — organic, good at large scale) rendered via
   `useShape` or `useShapeLoop` with a *slow* step duration (4–6s, matching the Expressive "slow spatial"
   spring: damping 0.8, stiffness 200 — same conversion method already used elsewhere) for a living,
   ambient background rather than a static shape.
2. Layer 2 (the actual card) → stop clipping the text container into a wave. Two options, need your
   call: (a) simplest — drop `.shape-blob-hero` entirely and let the card be a plain, bold rounded
   rectangle (Extra-large-increased, 32dp, already in the corner-radius scale from item 2) with all its
   visual interest coming from Layer 1's shape behind it; or (b) keep some asymmetry but make it a real
   `shape-morph`-derived silhouette *specifically checked* to never clip the text at any content length
   (the codebase's own `DESIGN.md` already documents a past real bug where a percentage-based organic
   radius clipped a heading — this is the same failure class, worth being careful about).
3. My recommendation is (a): let the ambient background blob (Layer 1) carry the "wow," keep the actual
   readable card boring-safe. Matches tactic #4 ("give the most important content... the brightest
   surface" — implies *legible*, not organically clipped).

---

## Working rule from here

Every future entry needs the user to explicitly confirm it live (browser, not a description) before its
Status moves past "Shipped, unverified" — several items above never got that confirmation and shouldn't
be assumed working. And prioritize items 5-7 before smaller polish items (9-11): those are the ones
that will actually *feel* different, not just measure correctly against the spec.
