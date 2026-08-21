## 2026-08-21 - Add ARIA Labels and focus to icon-only buttons
**Learning:** Found some icon-only buttons like previous/next in `AnimatedTestimonials` component that were lacking `aria-label` attributes and focus outlines, making them hard to use for screen readers or keyboard navigation.
**Action:** Added `aria-label` to these elements, and utilized Tailwind classes like `focus-visible:outline-none focus-visible:ring-2` to add clear focus indicators without adding custom CSS.
