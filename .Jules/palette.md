## 2026-09-20 - Add aria-labels to Drawer.Close and icon-only buttons
**Learning:** When using headless UI libraries like Vaul or Radix (e.g., `<Drawer.Close>`), remember that components wrapping icon-only elements still require an explicit `aria-label` attribute to ensure screen reader accessibility, as the underlying rendered button will otherwise lack an accessible name.
**Action:** Always inspect the rendered output of headless UI components and ensure proper aria-labels are passed down, especially for icon-only triggers.
