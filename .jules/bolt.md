## 2024-05-18 - Prevent Next.js Whole-Page Re-renders
**Learning:** In Next.js App Router, keeping frequent state updates (like keystrokes on an input) in a heavy parent component (like `page.tsx` home page) causes the entire DOM tree to re-render, impacting perceived performance significantly.
**Action:** Always extract such frequently updating state into dedicated, smaller client components (e.g., `SearchForm`) to colocate state and isolate re-renders.
