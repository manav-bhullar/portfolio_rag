/**
 * The Gemini models this app calls, in one place. Every call site imports
 * from here, so switching a model is a one-line change (or an environment
 * variable) and the "Under the hood" panel always names the model in use.
 *
 * IMPORTANT: pin explicit model versions, never a rolling "-latest" alias.
 * Google moves "-latest" forward without warning, and newer generations can
 * ship with much stricter free-tier quotas (a "-latest" alias once rolled
 * onto a model with 20 requests/day and silently broke this app).
 *
 * Free-tier quota is per model, so the answer and router models are kept
 * separate on purpose: a helper call must not spend the answer's quota.
 * Measure any change with `npm run eval` (retrieval + conversation suites).
 */

/** Writes the chat reply and decides which tool to call. Also used by the job-fit, heatmap and cover-letter tools. */
export const ANSWER_MODEL = process.env.CHAT_MODEL || 'gemini-3.6-flash';

/** Classifies each message and rewrites follow-ups before retrieval (src/lib/rag/router.ts). */
export const ROUTER_MODEL = process.env.ROUTER_MODEL || 'gemini-3.5-flash-lite';
