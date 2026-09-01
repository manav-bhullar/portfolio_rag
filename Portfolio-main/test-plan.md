1. **Change `WelcomeModal` to use `React.cloneElement`**
   - In `src/components/welcome-modal.tsx`, update the trigger rendering to use `React.cloneElement` instead of wrapping it in a `div`. This ensures that if a `button` is passed as a trigger, it remains accessible and doesn't nest interactive elements.
2. **Convert icon `div`s to accessible `button`s in `chat.tsx`**
   - In `src/components/chat/chat.tsx`, convert the "Home" icon and the "Info" icon (which is the trigger for `WelcomeModal`) from `div`s to `button`s. Add appropriate `aria-label`s and `title`s to these icon-only buttons for screen readers and tooltips. Also, add focus states for keyboard accessibility.
3. **Run Pre-commit Checks**
   - Run linter and tests to ensure the changes are safe.
4. **Submit the PR**
