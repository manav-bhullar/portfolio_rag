## 2023-10-25 - Secure Event Handling for Custom Triggers
**Learning:** Passing a custom element as a `trigger` prop and wrapping it in an interactive element (like a `<div>` with `onClick`) can cause invalid nesting (e.g., `<button>` inside `<div>`) leading to accessibility and semantic issues.
**Action:** Use `React.cloneElement` on the provided trigger to safely merge `onClick` handlers directly onto the provided custom trigger, avoiding extra wrapper elements and retaining its inherent semantic meaning and accessibility features.
