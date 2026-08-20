## 2024-08-20 - Memoizing Streaming AI Chat Components
**Learning:** In the Vercel AI SDK, streaming updates cause frequent re-renders of the entire message list. A simple `React.memo` is insufficient because the SDK can update parts of the message object (like `toolInvocation.state`) without changing array lengths.
**Action:** When memoizing AI SDK message components, always implement a custom deep comparator that checks `message.id`, `message.content`, and iterates through `message.parts` to check for state changes in `tool-invocation` parts.
