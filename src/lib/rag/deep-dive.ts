/**
 * Project deep dive, decided by retrieval instead of by the answer model.
 *
 * "Tell me everything about Floq" used to depend on the model calling an
 * `exploreProject` tool with a keyword it chose, which then did its own
 * substring matching. That second lookup path picked the wrong project for
 * shared words ("rag" → PIP-RAG instead of this portfolio's chatbot), and
 * because a tool call ends the model's turn, the reply often had no text.
 *
 * Now the router and retriever — the same, evaluated pipeline as every other
 * answer — decide: when a broad question about one topic retrieves mostly one
 * project family, the server shows that family as a deep-dive card, and the
 * model writes the narrative around it.
 */

import type { RetrievalPlan } from './router';
import type { RetrievalResult } from './retriever';

export interface ProjectDeepDive {
  type: 'project-deep-dive';
  familyId: string;
  title: string;
  /** Markdown: the family's documents, overview first, exactly as retrieved. */
  content: string;
}

// Share of the retrieved documents the top family must hold for the question
// to count as being about that one project. Below it ("what analytics work
// have you done?" → Olist, NYC Taxi, Deloitte) the question spans several
// topics and no single card fits.
const MIN_FAMILY_SHARE = 0.5;

export function buildProjectDeepDive(
  plan: RetrievalPlan,
  results: RetrievalResult[]
): ProjectDeepDive | null {
  // Only "everything about one topic": broad, one search query, not a list.
  if (plan.intent !== 'broad' || plan.searchQueries.length !== 1 || plan.category) return null;

  const top = results[0];
  if (!top || top.document.category !== 'project') return null;

  const members = results.filter((r) => r.family === top.family);
  if (members.length / results.length < MIN_FAMILY_SHARE) return null;

  // Overview (the family root) first, then the rest in retrieval order.
  const ordered = [...members].sort(
    (a, b) => Number(a.document.id !== top.family) - Number(b.document.id !== top.family)
  );

  return {
    type: 'project-deep-dive',
    familyId: top.family,
    title: ordered[0].document.title,
    content: ordered.map((r) => `### ${r.document.title}\n\n${r.document.content}`).join('\n\n'),
  };
}
