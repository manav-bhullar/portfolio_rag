import { tool } from 'ai';
import { z } from 'zod';

export const getPresentation = tool({
  description:
    'This tool returns a concise personal introduction of Manav Bhullar. It is used to answer the question "Who are you?" or "Tell me about yourself"',
  parameters: z.object({}),
  execute: async () => {
    return {
      presentation:
        "I'm Manav Bhullar, a Computer Engineering student at Thapar Institute of Engineering and Technology (TIET), Patiala. I build across three domains - full-stack web development (MERN), data analytics, and AI/ML - and I ship production-grade systems, not toy projects. Think distributed locks, RAG pipelines, and BigQuery pipelines over millions of rows.",
    };
  },
});
