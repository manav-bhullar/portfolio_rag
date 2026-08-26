## 2024-05-24 - React-Markdown Referential Stability
**Learning:** `react-markdown`'s `Markdown` component strictly checks reference equality for `remarkPlugins` and `components` props. Defining these inline inside the component or render map (like `message.parts.map(...)`) causes React to allocate new objects on every render, forcing needless parsing and DOM regeneration.
**Action:** Always hoist static `components` configuration and `remarkPlugins` arrays outside of the component body to maintain referential stability.
