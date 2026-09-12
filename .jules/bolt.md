## 2025-05-18 - Memoize O(N) calculation in chat.tsx
**Learning:** In Next.js components that manage text inputs for chat interfaces (like `useChat` from `@ai-sdk/react`), every keystroke triggers a re-render because the input state changes. Any O(N) operations, such as traversing the full `messages` array to find tool invocation statuses, should be memoized using `useMemo` to prevent performance degradation.
**Action:** Wrap static or conditionally updated array iterations in `useMemo` when the enclosing component also handles rapid user input.
