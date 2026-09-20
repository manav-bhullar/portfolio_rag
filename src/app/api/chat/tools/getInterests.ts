import { tool } from 'ai';
import { z } from 'zod';

export const getInterests = tool({
  description:
    'This tool shows my personal interests outside of engineering - reading and fitness.',
  parameters: z.object({}),
  execute: async () => {
    return "Here's what I do outside of shipping code - reading and staying fit keep my head clear for the deep technical work.";
  },
});
