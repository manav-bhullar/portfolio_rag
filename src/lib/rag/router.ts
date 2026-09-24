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
 * The router fails open: if every key fails within the deadline (free-tier
 * quota exhausted, model overloaded), a rule-based plan takes over. It
 * recognizes list, comparison and "everything about" questions; anything
 * else becomes a focused lookup, and the retriever's relevance floor still
 * rejects off-topic questions.
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { getKeysHealthyFirst, reportKeyFailure, isRateLimitError } from '@/lib/gemini-keys';
import { retrieve, retrieveMany, retrieveOverviews, type RetrievalResult, type KnowledgeCategory } from './retriever';

// Router model: gemini-3.5-flash-lite, chosen for its separate and larger
// free-tier quota. gemini-3.6-flash is faster with thinking disabled (~3 s)
// but allows only 20 requests/day per key, and it is also the answer model,
// so routing with it spent the answer's quota twice per message.
// It rejects thinkingBudget 0, so it runs with default thinking: measured
// 1.0–1.6 s per call on 24 Sept 2026, but 13–30 s during a Google
// "high demand" spike on 23 Sept, hence the generous deadline below.
export const ROUTER_MODEL = 'gemini-3.5-flash-lite';
const MAX_SUB_QUERIES = 4;
// The router sits in front of every chat message, so it must never stall the
// response: each attempt is capped, the SDK's own retries are disabled (we
// rotate keys instead), and on failure we fall back to a plain lookup.
// Whole routing step, across all key attempts. The chat route runs on the
// Edge runtime, which must start its response within 25 s, and routing plus
// retrieval happen before the response starts, so routing gets at most 20 s.
const ROUTER_DEADLINE_MS = 20_000;
// One attempt. Exhausted keys fail with a 429 in ~0.6 s, so walking past them
// is cheap; only a slow key uses up the attempt budget.
const ATTEMPT_TIMEOUT_MS = 18_000;
// Don't start an attempt with less than this left: it can't finish in time.
const MIN_ATTEMPT_MS = 1000;

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
- If the latest message already makes sense on its own, use it unchanged (you may drop a greeting). Rewrite ONLY when it depends on the conversation (e.g. "how long did it take?" after discussing Floq -> "How long did the Floq project take?"). Never shorten a question into bare keywords.
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

const COMPARE_PATTERN = /\b(compare|comparison|versus|vs\.?|difference between|differences between)\b/i;
const COMPARE_LEAD = /\b(compare|comparison of|comparison|differences? between)\b/gi;
const COMPARE_SEPARATOR = /\b(?:vs\.?|versus|and|with|to)\b|,|\//i;
const SMALL_TALK_PATTERN = /^(hi|hii+|hello|hey|yo|hola|namaste|thanks|thank you|thx|ok|okay|cool|great|nice|awesome|bye|good (morning|afternoon|evening|night))\b/i;
const EVERYTHING_PATTERN = /\b(everything|all|more) about\b|\bdeep dive\b|\bin (depth|detail)\b/i;
const LIST_TRIGGER = /\b(what|which|list|show|name)\b/i;
const LIST_CATEGORIES: [RegExp, KnowledgeCategory][] = [
  [/\bprojects?\b/i, 'project'],
  [/\b(certifications?|certificates?)\b/i, 'background'],
  [/\b(roles?|jobs?|internships?|work experience)\b/i, 'experience'],
];
// Words that don't narrow a list question ("what projects have you BUILT?").
const LIST_FILLER = new Set([
  'what', 'which', 'list', 'show', 'name', 'are', 'were', 'is', 'have', 'has', 'had', 'you', 'your',
  'he', 'his', 'did', 'do', 'does', 'all', 'the', 'of', 'me', 'built', 'build', 'made', 'done',
  'worked', 'earned', 'got', 'completed', 'held', 'so', 'far', 'ever', 'manav', 'manavs', 'bhullar',
]);

function words(text: string): string[] {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
}

/**
 * Rule-based plan used when the LLM router is unavailable. Deliberately
 * conservative: it only claims list/compare/deep-dive when the wording is
 * unambiguous, and without conversation history it can't resolve follow-ups.
 */
export function heuristicPlan(query: string): RetrievalPlan {
  const fallback = (plan: Omit<RetrievalPlan, 'source'>): RetrievalPlan => ({ ...plan, source: 'fallback' });

  // Short greetings/thanks with no question in them
  if (SMALL_TALK_PATTERN.test(query.trim()) && !query.includes('?') && words(query).length <= 6) {
    return fallback({ intent: 'chitchat', searchQueries: [], category: null });
  }

  if (COMPARE_PATTERN.test(query)) {
    const items = query
      .replace(COMPARE_LEAD, ' ')
      .split(COMPARE_SEPARATOR)
      .map((part) => part.replace(/[?.!]/g, '').trim())
      .filter((part) => words(part).length > 0);
    return fallback({
      intent: 'broad',
      searchQueries: items.length >= 2 && items.length <= MAX_SUB_QUERIES ? items : [query],
      category: null,
    });
  }

  if (EVERYTHING_PATTERN.test(query)) {
    return fallback({ intent: 'broad', searchQueries: [query], category: null });
  }

  if (LIST_TRIGGER.test(query)) {
    for (const [pattern, category] of LIST_CATEGORIES) {
      if (!pattern.test(query)) continue;
      const narrowing = words(query.replace(pattern, ' ')).filter((w) => !LIST_FILLER.has(w));
      if (narrowing.length === 0) {
        return fallback({ intent: 'broad', searchQueries: [query], category });
      }
    }
  }

  return fallback({ intent: 'lookup', searchQueries: [query], category: null });
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
  const deadline = Date.now() + ROUTER_DEADLINE_MS;

  for (const key of getKeysHealthyFirst()) {
    const remaining = deadline - Date.now();
    if (remaining < MIN_ATTEMPT_MS) break;
    try {
      const google = createGoogleGenerativeAI({ apiKey: key });
      const { object } = await generateObject({
        model: google(ROUTER_MODEL),
        schema: PlanSchema,
        prompt,
        temperature: 0,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(Math.min(ATTEMPT_TIMEOUT_MS, remaining)),
      });
      return normalizePlan(object, query);
    } catch (err) {
      if (isRateLimitError(err)) reportKeyFailure(key);
      console.warn(`[RAG] Router attempt failed (${err instanceof Error ? err.message.split('\n')[0].slice(0, 120) : String(err)}), trying next key.`);
    }
  }

  console.warn('[RAG] Router unavailable within its deadline, using the rule-based plan.');
  return heuristicPlan(query);
}

export interface ExecuteOptions {
  /** The user's own wording, searched alongside the router's rewrite. */
  originalQuery?: string;
  /** With history, the original may depend on context ("test it?"), so it isn't searched. */
  hasHistory?: boolean;
}

/**
 * Runs the retrieval a plan calls for. A category is a hint, not a
 * constraint: if listing it yields nothing, fall back to a broad search
 * rather than lose recall to a wrong classification.
 */
export async function executePlan(plan: RetrievalPlan, options: ExecuteOptions = {}): Promise<RetrievalResult[]> {
  if (plan.intent === 'chitchat' || plan.intent === 'off_topic') return [];

  // For a standalone message, search the user's wording too: a lossy rewrite
  // ("What does CERA do in SCALES?" -> "CERA in SCALES") then can't cost recall.
  const phrasings = (rewritten: string) =>
    options.originalQuery && !options.hasHistory ? [rewritten, options.originalQuery] : [rewritten];

  if (plan.intent === 'lookup') {
    return retrieve(phrasings(plan.searchQueries[0]), { mode: 'focused' });
  }

  if (plan.searchQueries.length > 1) {
    return retrieveMany(plan.searchQueries, { mode: 'focused' });
  }

  if (plan.category) {
    const overviews = await retrieveOverviews(plan.searchQueries[0], plan.category);
    if (overviews.length > 0) return overviews;
  }
  return retrieve(phrasings(plan.searchQueries[0]), { mode: 'broad' });
}
