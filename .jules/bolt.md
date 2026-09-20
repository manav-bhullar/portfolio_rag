## 2024-05-24 - [Avoid `O(N)` scans on every render]
**Learning:** Checking elements iteratively from an unbounded array like `messages` in a component that controls an input via `useState` causes the scan to run on every single keystroke.
**Action:** Wrap derived array operations (like `.some()` or `.filter()`) in `useMemo` when they depend on state that updates less frequently than other state variables in the same component.
