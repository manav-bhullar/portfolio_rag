import { tool } from 'ai';
import { z } from 'zod';

export const submitContactRequest = tool({
  description:
    "Show an inline lead-capture form so the user can leave their name, email, and a message for Manav directly in the chat, instead of only using mailto. Use this when the user wants to get in touch, hire Manav, or leave contact details.",
  parameters: z.object({}),
  execute: async () => {
    return "Here's a quick form — drop your details and I'll get back to you.";
  },
});
