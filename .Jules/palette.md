## 2023-10-27 - Fixing nested `<button>` inside custom interactive Radix/Vaul elements
**Learning:** When using custom trigger components for Radix Dialog/Tooltip or Vaul Drawer (like `Drawer.Trigger`), adding `asChild` is necessary if you're passing your own semantic button (like `<motion.button>`). Otherwise, the library renders a `<button>` wrapping your `<button>`, causing invalid HTML DOM nesting and accessibility issues.
**Action:** Always use `asChild` on Radix/Vaul trigger components when providing a custom interactive element like `<button>` or `<motion.button>`.
