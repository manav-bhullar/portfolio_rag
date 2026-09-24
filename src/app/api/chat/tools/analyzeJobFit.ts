import { tool, generateObject } from 'ai';
import { z } from 'zod';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { getKeysHealthyFirst, reportKeyFailure, isRateLimitError } from '@/lib/gemini-keys';
import { ANSWER_MODEL } from '@/lib/models';
import { retrieve, formatContext } from '@/lib/rag/retriever';

const FitAnalysisSchema = z.object({
  matchScore: z.number().min(0).max(100).describe('Overall fit percentage between the role and Manav\'s real background'),
  matchedSkills: z.array(z.string()).describe('Concrete skills/experience from Manav\'s real background that match this role, each grounded in the retrieved context'),
  gaps: z.array(z.string()).describe('Honest gaps — things the role wants that are not present in Manav\'s real background. Empty array if none.'),
  recommendedResume: z.enum(['Software Engineering', 'AI/ML', 'Data Analyst']).describe('Which of Manav\'s three resume variants best fits this role'),
  pitch: z.string().describe('A short, confident, first-person (as Manav) pitch for why he fits this specific role, 2-3 sentences'),
});

export const analyzeJobFit = tool({
  description:
    "Analyze how well a job description fits Manav's real skills and experience. Paste in the job description text. Returns a match score, matched skills, honest gaps, and which resume to use.",
  parameters: z.object({
    jobDescription: z.string().describe('The full job description text pasted by the user'),
  }),
  execute: async ({ jobDescription }) => {
    const retrievalResults = await retrieve(jobDescription, { mode: 'broad', applyFloor: false });
    const context = formatContext(retrievalResults);

    const candidateKeys = getKeysHealthyFirst().slice(0, 3);
    let lastError: unknown = null;

    for (const apiKey of candidateKeys) {
      try {
        const google = createGoogleGenerativeAI({ apiKey });
        const { object } = await generateObject({
          model: google(ANSWER_MODEL),
          schema: FitAnalysisSchema,
          prompt: `You are evaluating how well the following job description matches Manav Bhullar's REAL background, using ONLY the context documents below. Never invent skills or experience not present in the context. If something the job wants isn't in the context, list it as a gap.

## Job Description
${jobDescription}

## Manav's Real Background (retrieved context)
${context}`,
        });

        return JSON.stringify(object);
      } catch (err) {
        if (isRateLimitError(err)) reportKeyFailure(apiKey);
        lastError = err;
      }
    }

    console.error('[analyzeJobFit] All candidate keys failed:', lastError);
    throw new Error('Could not analyze job fit right now — please try again in a moment.');
  },
});
