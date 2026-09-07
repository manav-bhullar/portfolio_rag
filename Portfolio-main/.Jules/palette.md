## 2024-05-18 - Missing ARIA label in Photos Modal
**Learning:** Found a pattern where custom modal close buttons (like the one in `photos.tsx`) use icon-only content without accessible names, causing issues for screen readers.
**Action:** Always verify full-screen modal close buttons have descriptive `aria-label` attributes.
