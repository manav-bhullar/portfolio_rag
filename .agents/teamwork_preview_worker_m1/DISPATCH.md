## 2026-08-18T17:34:44Z

Assignment:
Implement Milestone M1 (Mobile Responsiveness & Viewport Fixes) based on the Explorer handoff reports.

File Ownership & Changes Required:
1. `src/app/page.tsx`:
   - R1: Replace `min-h-screen` with `min-h-[100dvh]` on the root container.
   - R2: Update top-left and top-right header button containers to use responsive positioning and spacing:
     - Top-left (e.g. Welcome Modal button): update `top-6 left-8` to `top-4 left-4 sm:top-6 sm:left-8` (or `md:top-6 md:left-8`).
     - Top-right (Analytics & GitHub Star buttons): update `top-6 right-8` to `top-4 right-4 sm:top-6 sm:right-8` (or `md:top-6 md:right-8`), update `gap-4` to `gap-2 sm:gap-4`, adjust Analytics button padding `px-2.5 py-1 text-xs sm:px-4 sm:py-1.5 sm:text-sm` so buttons fit neatly without overlapping.

2. `src/components/chat/chat.tsx` (and `src/app/chat/chat.tsx` if present):
   - R1: Replace `h-screen` with `h-[100dvh]` on the root container.
   - R2: In the header button area, update positioning and flex layout from vertical stacking on mobile (`flex-col-reverse`) to a responsive horizontal layout `flex flex-row items-center justify-end gap-1.5 sm:gap-2 md:gap-4` with responsive positioning `top-3 right-3 sm:top-4 sm:right-6 md:top-6 md:right-8` to prevent overlapping or occluding chat bubbles.

3. `src/components/analytics/Dashboard.tsx`:
   - R1: Replace `min-h-screen` with `min-h-[100dvh]`.

4. `src/components/welcome-modal.tsx`:
   - R3: Replace fixed modal padding classes with responsive padding classes:
     - DialogContent: `p-4 sm:p-6 md:p-8` (or `p-3 sm:p-4 md:p-6` as appropriate)
     - DialogHeader: `px-4 pt-4 pb-3 sm:px-6 sm:pt-6 md:px-8 md:pt-8 md:pb-6`
     - Section / Content: `p-4 sm:p-6 md:p-8`
     - Footer / Buttons: `px-4 pt-3 pb-2 sm:px-6 sm:pt-4 md:px-8 md:pt-4 md:pb-8`

5. `src/components/projects/ProjectsCarousel.tsx` (and `src/components/projects/apple-cards-carousel.tsx` if relevant):
   - R1: Replace `h-screen` with `h-[100dvh]`.
   - R3: Update modal container margins/paddings from fixed large paddings to responsive classes (e.g. `mx-4 sm:mx-auto my-4 sm:my-8 md:my-10 p-5 sm:p-7 md:p-10`) and close button positioning `top-4 right-4 sm:top-6 sm:right-6`.

Verification:
- Run lint (`npm run lint` or `npx next lint`) and any build/test commands to verify clean execution.
- Verify that every acceptance criteria is met.
