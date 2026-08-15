import { tool } from 'ai';
import { z } from 'zod';

export const getCrazy = tool({
  description:
    "This tool tells the craziest engineering hack I've pulled off. Use it when the user asks something like 'What's the craziest thing you've ever done?' or 'How do you deal with API rate limits?'",
  parameters: z.object({}),
  execute: async () => {
    return "On PIP-RAG, my placement-intelligence RAG system, I hit Gemini's free-tier rate limits fast once real usage kicked in. So I built a custom API key rotation layer across 5-6 Gemini keys - load-balancing requests across all of them to scale free-tier throughput to ~7,500 requests/day, completely bypassing the per-key limit. No paid tier, no downtime, just distributing the load. Probably the hackiest-but-most-effective thing I've shipped.";
  },
});
