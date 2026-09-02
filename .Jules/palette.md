## 2024-03-01 - Add ARIA Labels & Focus States to Testimonial Navigation
**Learning:** Found a common pattern in custom UI components (like `animated-testimonials.tsx`) where icon-only buttons for navigation (previous/next) are missing `aria-label` attributes and keyboard focus indicators. This makes them invisible to screen readers and difficult to use via keyboard navigation.
**Action:** Always ensure that icon-only interactive elements in custom UI components have descriptive `aria-label`s and proper `focus-visible` classes (like `focus-visible:ring-2`) to support accessibility standards.
