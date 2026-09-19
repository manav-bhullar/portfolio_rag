## 2024-03-24 - [Avoid O(N) recalculations on keystrokes in Chat]
 **Learning:** Frequent updates in the root component (like typing in a text input which causes state changes in Next.js) trigger re-renders that can cause expensive calculations on unbounded arrays (like iterating through `messages` using `.some()` to check for `isToolInProgress`) to run unnecessarily on every keystroke.
 **Action:** Memoize derived state iterating over growing structures with `useMemo` when they exist in components triggered by high-frequency events (like typing).
