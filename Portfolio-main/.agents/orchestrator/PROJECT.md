# Project: Portfolio Mobile Responsiveness & Codebase Linter Fix

## Architecture
Next.js / React portfolio application with Tailwind CSS.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | R1: Viewport Heights | Replace `h-screen`, `min-h-screen` with `h-[100dvh]`, `min-h-[100dvh]` in `src/app/page.tsx`, `src/components/chat/chat.tsx`, `src/components/analytics/Dashboard.tsx` | M1 | ORIGINAL_REQUEST |
| 2 | R2: Header Buttons Positioning | Adjust absolute positioning and spacing for header buttons in `page.tsx` and `chat.tsx` using responsive classes (e.g. `right-4 md:right-8`) | M1 | ORIGINAL_REQUEST |
| 3 | R3: Modal Paddings | Decrease base paddings in modals (`welcome-modal.tsx`, `ProjectsCarousel.tsx`) for mobile screens, using responsive prefixes (`md:`, `sm:`) | M1 | ORIGINAL_REQUEST |
| 4 | R4: Clean ESLint Passing | Resolve all ESLint errors across the codebase so `npx next lint` exits 0 with 0 errors | M2 | VICTORY_AUDITOR |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Mobile Responsiveness & Viewport Fixes | R1, R2, R3 implementation across target files | none | DONE |
| 2 | Codebase ESLint Remediation | Fix all 18 ESLint errors and warnings across the codebase | M1 | IN_PROGRESS |

## Code Layout
- `src/app/page.tsx`: Home page layout & header buttons
- `src/components/chat/chat.tsx`: Chat view layout & header buttons & viewport height
- `src/components/analytics/Dashboard.tsx`: Analytics dashboard viewport height
- `src/components/welcome-modal.tsx`: Welcome modal responsive paddings
- `src/components/projects/ProjectsCarousel.tsx`: Projects carousel modal padding & viewport height
- All other files flagged by `npx next lint` (see `/Volumes/Codes/portfolio/Portfolio-main/.agents/victory_auditor/audit_report.md`)
