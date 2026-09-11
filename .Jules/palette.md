## 2024-09-11 - Semantic Interactive Elements in Custom Triggers
**Learning:** When passing custom trigger components into modal or popover wrappers (like `WelcomeModal`), wrapping them in unsemantic `<div>` elements with `onClick` handlers creates broken nested interactive elements (e.g., a `div` capturing clicks outside a real `<button>`), breaking screen reader semantics.
**Action:** Use `React.isValidElement` and `React.cloneElement` to safely merge the `onClick` handler directly onto the custom semantic trigger provided via props, ensuring valid HTML nesting and semantic accessibility.
