## 2024-03-24 - Semantic Links in Contact Component
**Learning:** Found elements acting as links (email, phone, socials) using `div` and `button` with `onClick` handlers. This breaks native browser behaviors (right-click to copy, open in new tab) and screen reader identification.
**Action:** Replaced them with native semantic `<a>` tags and added `focus-visible` styles to improve keyboard accessibility.
