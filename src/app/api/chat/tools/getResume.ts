import { tool } from 'ai';
import { z } from 'zod';

export const getResume = tool({
  description:
    'This tool shows my resumes (I have separate ones tailored for SDE, AI/ML, and Data Analyst roles).',
  parameters: z.object({}),
  execute: async () => {
    return "You can download whichever resume fits what you're looking for - SDE, AI/ML, or Data Analyst - by clicking one above.";
  },
});
