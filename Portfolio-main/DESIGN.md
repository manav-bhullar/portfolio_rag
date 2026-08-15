# Manav Bhullar Portfolio — Design System

Source of truth: the second Nano Banana output (landing hero + project carousel). Material 3 Expressive in spirit — organic shape language, confident color, warm human tone — adapted to a real desktop web app, not a literal mobile screen.

## Philosophy

Warm, confident, human-built. The organic "cookie" shape isn't decoration on one hero element — it's the system's signature move, applied consistently: a colorful accent shape bleeds out from behind a clean, readable rectangular content area. Content stays legible; the shape carries the personality.

## Color

Two-tier warm neutral base, plus one distinct saturated accent per project/domain.

| Token | Approx. hex | Use |
|---|---|---|
| `surface-outer` | `#EDE6D6` | Page background (warm tan/beige) |
| `surface-card` | `#FAF7EF` | Card/content surface (warm near-white) |
| `ink` | `#191919` | Primary text |
| `ink-muted` | `#5C5952` | Secondary text, tags |
| `outline` | `#D8D0BE` | Card/input borders |

Per-project accent (each project gets one, used as its card's organic blob-accent color and its icon tint):

| Project | Accent | Approx. hex |
|---|---|---|
| Floq | Green | `#3FB37F` |
| SCALES v3.0 | Orange/peach | `#F0954A` |
| PIP-RAG | Pink/magenta | `#E0559C` |
| Olist Analytics | Blue | `#3E8EDE` |
| NYC Taxi Analytics | Violet | `#8B5FE0` |

The "MB" mark uses all of these as one multi-stop gradient (green → purple → magenta → orange) on a near-black rounded-square base — it's the one place the full palette appears together; everywhere else, one accent per element.

*Hex values above are close visual approximations from the reference image, not exact-extracted — nail down exact values against the real reference file during implementation, these are safe to start building with.*

## Shape

- **Signature pattern — organic accent + clean content:** a card's actual content sits in a rectangle with soft, moderate corner rounding (~20-24px). Behind/around one or two corners, a colored organic blob shape (the project's accent color) bleeds out — visible as an irregular wavy edge peeking from behind the card, not a uniform border. This is on: project cards, and the page-level hero container. It is NOT on: the search input, chips, buttons — those stay clean, symmetric pill/rounded-rectangle shapes. The organic treatment is a signature accent, not applied to every element.
- **Hero container:** the whole landing composition sits inside one large, irregular wavy-edged card shape (corners genuinely uneven, not a standard rounded rectangle) on the tan background.
- **The "MB" mark:** a soft rounded square (squircle), not a full organic blob — distinct from the card treatment.
- **Pills (search bar, chips, tags, buttons):** standard fully-rounded pill shape, thin outline, no organic treatment.

## Typography

- **Eyebrow/label** (e.g. "LET'S BUILD SOMETHING IMPACTFUL."): small, bold, uppercase, letter-spaced sans-serif.
- **Display/headline** (e.g. "Ask about my work."): large, bold, rounded-geometric friendly sans — confident and warm, not a novelty poster face, not monospace. (Something in the family of Poppins/Baloo/Nunito — pick one during implementation and check it renders the "Ask about my work." weight/warmth.)
- **Body/UI text:** clean, plain sans-serif, readable at small sizes (card descriptions, tags, chip labels).
- Never monospace for prose/labels — reserve it only for an actual code snippet, which doesn't appear anywhere in this scope.

## Iconography

Small, friendly, two-tone line-and-flat illustration icons — one per project, tinted with that project's accent color. Not literal emoji, not a generic icon-font glyph; a custom illustrative mark:
- **Floq:** car + location pin (route/matching)
- **SCALES v3.0:** browser window + checkmark (verification)
- **PIP-RAG:** document + magnifying glass (retrieval/search)
- **Olist Analytics:** bar chart / small dashboard mark
- **NYC Taxi Analytics:** map pin cluster / route mark

## Motion (carried from earlier spec — apply during implementation)

- New chat message: spring bounce, ~300ms
- Card reveal (carousel, tool-triggered cards): elastic reveal, slow curve
- Chip/button press: tactile bounce on press, physics-based release
- Carousel scroll: elastic scroll with slow decelerate

## Structural rules (unchanged, still hard rules)

- Single centered column. No persistent top header bar, no sidebar, no nav menu.
- Me/Projects/Skills/Fun/Contact are conversation-starter chips, not navigation — **all equally weighted, none shown in a selected/active state.**
- Never fabricate content — use only the real project names, metrics, and contact info already established (see the Nano Banana rules doc for the full real-content reference).
- Never depict a photorealistic human face — the "MB" mark is the identity treatment everywhere.

## Component mapping to the actual codebase

| Design element | Real component |
|---|---|
| Hero/landing composition | `src/app/page.tsx`, `src/components/chat/chat-landing.tsx` |
| Chip row | `src/components/chat/HelperBoost.tsx` |
| Project cards | `src/components/projects/Data.tsx`, `apple-cards-carousel.tsx` |
| Skills grid | `src/components/skills.tsx` (already has per-category color-blocking structurally — needs these tokens) |
| Contact card | `src/components/contact.tsx` |
| Bio/presentation card | `src/components/presentation.tsx` |
