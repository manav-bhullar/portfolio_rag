import { tool } from 'ai';
import { z } from 'zod';

export const getCrazy = tool({
  description:
    "This tool tells the craziest engineering hacks I've pulled off (I've got two). Use it when the user asks something like 'What's the craziest thing you've ever done?' or 'How do you deal with API rate limits?'",
  parameters: z.object({}),
  execute: async () => {
    return "I've got two favorites here. One: while building this portfolio on Antigravity 2.0 (no native remote SSH support), I mounted my Ubuntu server over SMB via Tailscale, then replaced a laggy exponential-backoff polling reconnect with a zero-polling, interrupt-driven bridge - macOS launchd WatchPaths and a systemd daemon on the Ubuntu side firing a TCP ping the instant either side comes back online. Two: I hit Gemini's free-tier rate limits fast once real usage kicked in, so I built a custom API key rotation layer - this portfolio's own chatbot rotates across 9 Gemini keys server-side, scaling free-tier throughput way past the per-key limit (it first proved out on my RAG project PIP-RAG at ~7,500 requests/day).";
  },
});
