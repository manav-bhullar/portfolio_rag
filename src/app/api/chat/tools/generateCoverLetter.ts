import { tool, generateText } from 'ai';
import { z } from 'zod';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { getKeysHealthyFirst, reportKeyFailure, isRateLimitError } from '@/lib/gemini-keys';
import { ANSWER_MODEL } from '@/lib/models';
import { retrieve, formatContext } from '@/lib/rag/retriever';

export const generateCoverLetter = tool({
  description:
    "Draft a ready-to-send cover letter for a specific job description, written in Manav's voice and grounded only in his real background. Use this when the user asks for a cover letter, or to draft one after a job-fit analysis.",
  parameters: z.object({
    jobDescription: z.string().describe('The full job description text the cover letter should be tailored to'),
  }),
  execute: async ({ jobDescription }) => {
    const retrievalResults = await retrieve(jobDescription, { mode: 'broad', applyFloor: false });
    const context = formatContext(retrievalResults);

    const candidateKeys = getKeysHealthyFirst().slice(0, 3);
    let lastError: unknown = null;

    for (const apiKey of candidateKeys) {
      try {
        const google = createGoogleGenerativeAI({ apiKey });
        const { text } = await generateText({
          model: google(ANSWER_MODEL),
          prompt: `Write a cover letter as Manav Bhullar, addressed to the hiring team for the role described below. Use ONLY real facts from the context documents — never invent projects, metrics, or experience not present there. Keep it confident and specific (cite real numbers/projects where relevant), 250-350 words, no placeholder brackets like "[Company Name]" — write it so it can be sent as-is with only a company name swapped in if needed. Plain text only, no markdown formatting, sign off as "Manav Bhullar".

## Job Description
${jobDescription}

## Manav's Real Background (retrieved context)
${context}`,
        });

        return text.trim();
      } catch (err) {
        if (isRateLimitError(err)) reportKeyFailure(apiKey);
        lastError = err;
      }
    }

    console.error('[generateCoverLetter] All candidate keys failed:', lastError);
    throw new Error('Could not draft the cover letter right now — please try again in a moment.');
  },
});
