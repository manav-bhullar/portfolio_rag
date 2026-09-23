import { tool, generateObject } from 'ai';
import { z } from 'zod';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { getKeysHealthyFirst, reportKeyFailure, isRateLimitError } from '@/lib/gemini-keys';
import { retrieve, formatContext } from '@/lib/rag/retriever';

const HeatmapSchema = z.object({
  role: z.string(),
  skills: z.array(z.object({
    name: z.string(),
    matchLevel: z.enum(['strong', 'partial', 'gap']).describe('How well Manav matches this skill'),
    evidence: z.string().describe('Brief 1-sentence proof from Manav\'s background, or reason for gap')
  })).max(8).describe('Top 6-8 canonical skills required for this role')
});

export const compareWithRole = tool({
  description:
    "Generate a visual side-by-side skill heatmap comparing Manav's background to a specific job title or tech stack (e.g., 'Senior React Engineer', 'Data Scientist'). Use this when a user asks how Manav fits a general role rather than pasting a full job description.",
  parameters: z.object({
    roleTitle: z.string().describe('The job title or tech stack to compare against'),
  }),
  execute: async ({ roleTitle }) => {
    // Retrieve context about Manav's skills and projects
    const retrievalResults = await retrieve(`skills experience projects technologies for ${roleTitle}`, { mode: 'broad', applyFloor: false });
    const context = formatContext(retrievalResults);

    const candidateKeys = getKeysHealthyFirst().slice(0, 3);
    let lastError: unknown = null;

    for (const apiKey of candidateKeys) {
      try {
        const google = createGoogleGenerativeAI({ apiKey });
        const { object } = await generateObject({
          model: google('gemini-3.6-flash'),
          schema: HeatmapSchema,
          prompt: `You are generating a skill heatmap comparing Manav Bhullar's real background to the typical requirements of a "${roleTitle}". 
          
          First, determine the 6-8 most important canonical skills/technologies needed for a "${roleTitle}".
          Then, strictly using ONLY the retrieved context below, evaluate Manav's match for each skill.
          - 'strong' if he has direct, proven experience.
          - 'partial' if he has related experience or basic exposure.
          - 'gap' if there is no evidence in the context.

          Context:
          ${context}`,
        });

        return JSON.stringify(object);
      } catch (err) {
        if (isRateLimitError(err)) reportKeyFailure(apiKey);
        lastError = err;
      }
    }

    console.error('[compareWithRole] All candidate keys failed:', lastError);
    throw new Error('Could not generate heatmap right now — please try again in a moment.');
  },
});
