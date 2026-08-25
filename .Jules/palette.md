## 2026-08-25 - Use button elements for icon buttons
**Learning:** Icon-only buttons should use the `<button>` HTML element rather than `<div>` with an `onClick` handler to ensure they are keyboard accessible and have proper semantic meaning for screen readers.
**Action:** Always refactor clickable `<div>` elements into `<button>` elements, adding `aria-label` for context and focus ring styling (`focus-visible`) for keyboard users.
