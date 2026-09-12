## 2024-05-24 - [Semantic Links for Interactive Actions]
**Learning:** Using `div` or `button` with `onClick={window.open(...)}` for basic links (email, phone, socials) breaks keyboard navigability, prevents screen readers from identifying link targets, and causes poor tab behavior (like opening blank pages before apps launch).
**Action:** Always replace programmatic navigation links with semantic `<a>` tags and appropriate `href` protocols (`mailto:`, `tel:`, etc.), retaining focus states via `focus-visible`.
