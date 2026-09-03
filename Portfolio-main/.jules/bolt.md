## 2024-10-27 - [Pushing State Down]
 **Learning:** When you have a `useState` tied to an input on a page with heavy components (like `framer-motion` blobs, modals, interactive cards), the entire page re-renders on every keystroke. This causes severe lag on the main thread and janky animations.
 **Action:** Extract the input and its associated `useState` into a separate, isolated client component (`SearchForm.tsx`). This restricts the re-render boundary to just the input element, leaving the rest of the heavy page unaffected.
