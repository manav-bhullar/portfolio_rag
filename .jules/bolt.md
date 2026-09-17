## 2024-05-24 - Memoize Array Scanning in Frequent Re-renders
**Learning:** In a highly interactive React component like a chat interface, derived state that involves scanning an unbounded array (`messages.some()`) can become a performance bottleneck if it runs on every keystroke render.
**Action:** Wrap expensive derived state calculations over frequently changing but unbounded data structures in `useMemo`, ensuring the dependency array correctly targets only the relevant data (`messages`).
