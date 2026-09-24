/**
 * Citation handling shared by the chat UI and the conversation eval, so the
 * eval measures exactly what a visitor sees.
 *
 * The model cites retrieved documents inline as [citation: source_id]. In
 * practice it sometimes writes "[citation: a, citation: b]", and sometimes
 * cites an id it was never given. Parsing is tolerant of the first; the
 * second is dropped, because a citation pill must point at a real source.
 */

export const CITATION_PATTERN = /\[citation:\s*([^\]]+)\]/g;

/** The ids inside one citation marker, tolerating a repeated "citation:" prefix. */
export function parseCitationIds(inner: string): string[] {
  return inner
    .split(',')
    .map((part) => part.trim().replace(/^citation:\s*/i, '').trim())
    .filter(Boolean);
}

/** Every cited id in a reply, in order. */
export function extractCitations(text: string): string[] {
  return [...text.matchAll(CITATION_PATTERN)].flatMap((m) => parseCitationIds(m[1]));
}
