## 2024-05-18 - [Anchor Link Semantics]
**Learning:** Found elements visually styled as links but technically implemented as `<div>` or `<button>` with Javascript `window.open` handlers, which broke native keyboard/screenreader semantics.
**Action:** Always replace non-semantic link elements with proper `<a>` tags and `href`s (including `mailto:` and `tel:`) to ensure proper accessibility and keyboard navigation without adding Javascript overhead.
