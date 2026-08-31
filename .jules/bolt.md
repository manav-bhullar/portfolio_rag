## 2025-03-08 - [Optimize Object References]
**Learning:** In Next.js/React applications, keeping static object definitions like Framer Motion variants outside the component body is an effective micro-optimization to prevent unnecessary object re-allocations on every render, avoiding garbage collection overhead and potential re-renders in memoized child components.
**Action:** Always check for static arrays, objects, and configurations inside component bodies, and hoist them out if they do not depend on component state or props.
