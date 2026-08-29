## 2024-03-24 - API Performance Pattern: Array clone and reverse
**Learning:** Found an anti-pattern in the codebase where an array is cloned and reversed just to find the last item matching a condition (`[...arr].reverse().find(condition)`). This allocates a new array in memory and iterates multiple times, which can cause GC pressure and slower execution on backend API routes like `chat/route.ts`.
**Action:** Replace `[...arr].reverse().find()` with a manual backward `for` loop to avoid allocations and reduce iteration time.
