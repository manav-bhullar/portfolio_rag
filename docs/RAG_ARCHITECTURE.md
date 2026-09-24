# RAG Architecture & Quality Process

How a visitor's question reaches knowledge, the rules that keep that path single, and how changes are verified before release.

## 1. The one knowledge path

```
message ─▶ router (src/lib/rag/router.ts) ─▶ retriever (src/lib/rag/retriever.ts) ─▶ context + cards ─▶ answer model
             search or not? how?              hybrid search, relevance floor,
                                              families, token budget
```

**Rule: anything that needs facts about Manav goes through the retriever.** One path means one place to tune and one place to test.

| Consumer | How it gets knowledge |
|---|---|
| Chat answers (`src/app/api/chat/route.ts`) | router → retriever |
| Project deep-dive card | `src/lib/rag/deep-dive.ts`: chosen from the retrieval result (broad question, one query, ≥ 50% of retrieved documents in one project family) |
| `analyzeJobFit`, `compareWithRole`, `generateCoverLetter` | `retrieve(…, { mode: 'broad', applyFloor: false })` |
| Display tools (`getProjects`, `getResume`, `getContact`, `getSkills`, `getInterests`, `getPresentation`, `getCrazy`) | Fixed UI components — see "Known duplication" |

Models are configured once in `src/lib/models.ts` (answer model, router model; overridable with `CHAT_MODEL` / `ROUTER_MODEL`).

Citations are parsed and validated in one place (`src/lib/citations.ts`): the UI only renders a citation pill for a document that was actually retrieved for that answer.

## 2. Audit findings (September 2026)

| Finding | Status |
|---|---|
| `exploreProject` tool looked projects up with its own substring match, bypassing retrieval; "rag" picked PIP-RAG instead of this chatbot, and a tool call ends the model's turn, so replies often had no text | **Removed.** The deep-dive card is decided by retrieval (`deep-dive.ts`); the renderer case stays for saved conversations |
| Model name hard-coded in 5 places (route, diagnostics label, 3 tools) | **Fixed:** `src/lib/models.ts` |
| A failed answer (Google overloaded) sent its error but never closed the response stream, so it stayed open until the 60 s platform limit | **Fixed:** `onError` closes the stream |
| Comparisons could miss a compared project's overview | **Fixed:** parent-document retrieval per compared item (`withFamilyOverview`) |
| Malformed (`[citation: a, citation: b]`) or invented citation ids rendered as broken pills | **Fixed:** tolerant parsing + only retrieved ids are shown |
| **Known duplication:** display cards (`src/components/projects/Data.tsx` and the card components) hold their own copy of project facts, separate from `knowledge-base.ts` | Open — merging them would change the UI cards; a product decision |

## 3. Verifying a change: `npm run eval`

Run before merging anything that touches retrieval, the router, prompts, tools or models.

| Suite | Checks | Cost |
|---|---|---|
| `npm run eval:retrieval` (`tests/rag-eval/golden-set.json`, 48 questions) | routing, recall, precision, deep-dive decisions; `--calibrate` for the relevance floor | Router quota only; plans are cached |
| `npm run eval:conversations` (`tests/rag-eval/conversations.json`, 15 conversations) | end-to-end through the real chat route: route, tools called or not, deep-dive card, retrieved documents, exact facts, AI-graded meaning, valid citations | Answer-model quota (free tier: 20 requests/day/key) — use `--repeat=2` for decisions |

Gate (exit code 1 on failure): retrieval routing 100%, recall ≥ 94%, precision ≥ 85%, all deep-dive decisions correct; every conversation check passes. Google overload/quota errors and streams cut off upstream are retried and reported as infrastructure errors, not failures. Missing follow-up suggestions are warnings.

The conversation suite never touches production side effects: it disables the Upstash connection, so test questions don't reach the public trending list.

## 4. When you find a bug

1. Add a conversation (or golden-set case) that reproduces it, with an `about` line naming the bug.
2. Watch it fail.
3. Fix the cause in the shared path (router, retriever, models, citations), not in a one-off branch.
4. `npm run eval` must pass.

## 5. Choosing models

Measured 24 Sept 2026 on the conversation suite, same prompt, tools and context:

| | `gemini-3.6-flash` (answer model) | `gemini-3.5-flash-lite` |
|---|---|---|
| Tool behavior | correct in all runs of the first full suite | ~11 wrong tool choices in 45 runs |
| Citations | all valid | invented ids (5 in 45 runs) |
| Speed | slower (first word 4–9 s) | faster (~2 s) |
| Free-tier quota | 20 requests/day per key | separate, larger |

Decision: `gemini-3.6-flash` answers, `gemini-3.5-flash-lite` routes. Re-measure with `npm run eval:conversations -- --model=<model> --repeat=2` before switching.
