/**
 * Query router: decides *whether* and *how* to retrieve before any search runs.
 *
 * One small structured LLM call (replacing the old follow-up rewrite call)
 * classifies the latest message and produces standalone search queries:
 *   - chitchat  → greetings/thanks with no question: no retrieval
 *   - off_topic → unrelated to Manav (weather, general coding help): no retrieval
 *   - lookup    → a specific question: one standalone query, focused retrieval
 *   - broad     → needs many documents:
 *                   list a whole category ("what projects?")      → that category's overview docs
 *                   compare several things ("Floq vs SCALES")     → one focused retrieval per item
 *                   everything about a topic ("all about Floq")  → wider window + the topic's family
 *
 * The router fails open: if the call fails, it falls back to a focused lookup
 * on the original message, and the retriever's relevance floor still guards
 * against irrelevant context.
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { getKeysHealthyFirst, reportKeyFailure, isRateLimitError } from '@/lib/gemini-keys';
import { retrieve, retrieveMany, retrieveOverviews, type RetrievalResult, type KnowledgeCategory } from './retriever';

// Measured from the server (Sept 2026): gemini-3.5-flash-lite rejects a zero
// thinking budget and took 13–30 s per call with default thinking;
// gemini-3.6-flash with thinking disabled answers in ~2.5–3.5 s.
export const ROUTER_MODEL = 'gemini-3.6-flash';
const MAX_SUB_QUERIES = 4;
// The router sits in front of every chat message, so it must never stall the
// response: each attempt is capped, the SDK's own retries are disabled (we
// rotate keys instead), and on failure we fall back to a plain lookup.
const ROUTER_TIMEOUT_MS = 5000;

export type QueryIntent = 'chitchat' | 'off_topic' | 'lookup' | 'broad';

export interface RetrievalPlan {
  intent: QueryIntent;
  searchQueries: string[];
  category: KnowledgeCategory | null;
  source: 'llm' | 'fallback';
}

export interface HistoryMessage {
  role: string;
  content: unknown;
}

const CATEGORIES = ['background', 'project', 'experience', 'skills', 'personal'] as const;

const PlanSchema = z.object({
  intent: z.enum(['chitchat', 'off_topic', 'lookup', 'broad']),
  searchQueries: z
    .array(z.string())
    .describe('Standalone search queries. lookup: exactly 1. broad: 1-4. chitchat/off_topic: empty.'),
  category: z
    .enum([...CATEGORIES, 'any'])
    .describe("Only for broad questions scoped to one category (e.g. 'all your projects' -> project). Otherwise 'any'."),
});

export function buildRouterPrompt(query: string, history: HistoryMessage[]): string {
  const historyText = history
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${typeof m.content === 'string' ? m.content.slice(0, 500) : '...'}`)
    .join('\n');

  return `You route messages for a chatbot on Manav Bhullar's portfolio site. The chatbot answers questions about Manav from a knowledge base with these categories:
- background: bio, education (Thapar Institute / TIET), achievements, certifications
- project: his software, AI/ML and data-analytics projects and their technical details
- experience: roles and internships
- skills: languages, frameworks, tools, soft skills
- personal: interests, hobbies, origin story, work style, how he handles pressure/pushback, AI/UX views, why hire him, contact details

Classify the LATEST user message:
- "chitchat": ONLY a greeting, thanks or pleasantry with no question in it.
- "off_topic": clearly unrelated to Manav, his work, skills, background, this portfolio/chatbot, or hiring him (e.g. weather, news, general coding help, math).
- "lookup": a specific question about Manav or this portfolio.
- "broad": a question needing many documents: listing or summarizing a whole area ("what projects have you built?", "overview of your experience"), or comparing several things ("compare Floq and SCALES").
When in doubt between off_topic and anything else, choose lookup. Questions addressed to "you" are about Manav.

searchQueries:
- Rewrite into standalone queries using the conversation (e.g. "how long did it take?" after discussing Floq -> "How long did the Floq project take?").
- Never add Manav's name: every document is about him, so the name only adds noise. Keep the user's own key terms.
- lookup: exactly 1 query.
- broad comparison: one query per item being compared (max ${MAX_SUB_QUERIES}).
- broad list/overview: 1 query describing the area.
- chitchat/off_topic: [].

category: ONLY when the user asks to list or enumerate everything in one category (e.g. "what projects have you built?" -> project, "list your certifications" -> background, "what roles have you had?" -> experience). Otherwise "any" — including topical questions like "which projects use Redis?", "what analytics work have you done?" or "tell me everything about Floq".
${historyText ? `\nConversation so far:\n${historyText}\n` : ''}
Latest user message:
${query}`;
}

function fallbackPlan(query: string): RetrievalPlan {
  return { intent: 'lookup', searchQueries: [query], category: null, source: 'fallback' };
}

/** Normalizes the model's output so downstream code can trust its shape. */
function normalizePlan(raw: z.infer<typeof PlanSchema>, query: string): RetrievalPlan {
  const queries = raw.searchQueries.map((q) => q.trim()).filter(Boolean).slice(0, MAX_SUB_QUERIES);
  const category = raw.category === 'any' ? null : raw.category;

  if (raw.intent === 'chitchat' || raw.intent === 'off_topic') {
    return { intent: raw.intent, searchQueries: [], category: null, source: 'llm' };
  }
  if (raw.intent === 'lookup') {
    return { intent: 'lookup', searchQueries: [queries[0] ?? query], category: null, source: 'llm' };
  }
  return { intent: 'broad', searchQueries: queries.length > 0 ? queries : [query], category, source: 'llm' };
}

export async function planRetrieval(query: string, history: HistoryMessage[] = []): Promise<RetrievalPlan> {
  const prompt = buildRouterPrompt(query, history);

  for (const key of getKeysHealthyFirst().slice(0, 2)) {
    try {
      const google = createGoogleGenerativeAI({ apiKey: key });
      const { object } = await generateObject({
        model: google(ROUTER_MODEL),
        schema: PlanSchema,
        prompt,
        temperature: 0,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(ROUTER_TIMEOUT_MS),
        // Classification doesn't need reasoning tokens; thinking multiplies latency.
        providerOptions: { google: { thinkingConfig: { thinkingBudget: 0 } } },
      });
      return normalizePlan(object, query);
    } catch (err) {
      if (isRateLimitError(err)) reportKeyFailure(key);
      console.error('[RAG] Router attempt failed, trying next key if available:', err);
    }
  }

  console.warn('[RAG] Router failed on all candidate keys, falling back to a focused lookup.');
  return fallbackPlan(query);
}

/**
 * Runs the retrieval a plan calls for. A category is a hint, not a
 * constraint: if listing it yields nothing, fall back to a broad search
 * rather than lose recall to a wrong classification.
 */
export async function executePlan(plan: RetrievalPlan): Promise<RetrievalResult[]> {
  if (plan.intent === 'chitchat' || plan.intent === 'off_topic') return [];

  if (plan.intent === 'lookup') {
    return retrieve(plan.searchQueries[0], { mode: 'focused' });
  }

  if (plan.searchQueries.length > 1) {
    return retrieveMany(plan.searchQueries, { mode: 'focused' });
  }

  if (plan.category) {
    const overviews = await retrieveOverviews(plan.searchQueries[0], plan.category);
    if (overviews.length > 0) return overviews;
  }
  return retrieve(plan.searchQueries[0], { mode: 'broad' });
}
