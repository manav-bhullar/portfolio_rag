import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, generateText, StreamData } from "ai";
import { checkRateLimit } from '@/lib/ratelimit';
import { getHealthyKey, getKeysHealthyFirst, reportKeyFailure, isRateLimitError } from '@/lib/gemini-keys';
import { SYSTEM_PROMPT } from './prompt';
import { getProjects } from './tools/getProjects';
import { getPresentation } from './tools/getPresentation';
import { getResume } from './tools/getResume';
import { getContact } from './tools/getContact';
import { getSkills } from './tools/getSkills';
import { getInterests } from './tools/getInterests';
import { getCrazy } from './tools/getCrazy';
import { executeUiAction } from './tools/executeUiAction';
import { analyzeJobFit } from './tools/analyzeJobFit';
import { submitContactRequest } from './tools/submitContactRequest';
import { retrieve, formatContext } from '@/lib/rag/retriever';

export const runtime = 'edge';
export const maxDuration = 60;
export const preferredRegion = 'iad1'; // Deploy close to Pinecone (us-east-1) to reduce latency

// IMPORTANT: always pin an explicit model version here (e.g. "gemini-2.5-flash"),
// never a rolling "-latest" alias. Google moves "-latest" forward to whatever
// its newest GA model is without warning, and the newest generation can ship
// with a far stricter free-tier quota than older ones (gemini-3.8-flash's
// free tier is 20 requests/DAY total — https://discuss.ai.google.dev/t/180609
// — which silently broke this app when "gemini-flash-latest" rolled onto it).

/**
 * Rewrite a follow-up query into a standalone one for retrieval, retrying
 * across a couple of healthy keys since this is a small non-streaming call
 * (unlike the main chat stream, we can safely retry it before anything has
 * been sent to the client).
 */
async function rewriteQueryForRetrieval(rewritePrompt: string): Promise<string | null> {
  const candidateKeys = getKeysHealthyFirst().slice(0, 2);

  for (const key of candidateKeys) {
    try {
      const google = createGoogleGenerativeAI({ apiKey: key });
      const { text } = await generateText({
        model: google("gemini-2.5-flash-lite"),
        prompt: rewritePrompt,
      });
      return text?.trim() || null;
    } catch (err) {
      if (isRateLimitError(err)) reportKeyFailure(key);
      console.error('[RAG] Query rewrite attempt failed, trying next key if available:', err);
    }
  }

  return null;
}

/** Builds the error-message extractor passed to toDataStreamResponse, closing
 *  over the key used for this request so a rate-limit failure feeds back
 *  into the shared cooldown pool for future requests. */
function makeErrorHandler(apiKey: string) {
  return (error: unknown) => {
    if (isRateLimitError(error)) reportKeyFailure(apiKey);

    if (error == null) return 'Unknown error';
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    return JSON.stringify(error);
  };
}

export async function POST(req: Request) {
  const errorHandler = makeErrorHandler(''); // fallback handler if we fail before picking a key
  try {
    // 1. Rate Limit Check (Early Guard)
    const rateLimit = await checkRateLimit(req);
    if (!rateLimit.success) {
      const retryAfter =
        rateLimit.retryAfter ??
        Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000));

      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded. Please wait before sending another message.",
          message: `Rate limit exceeded. You can send up to ${rateLimit.limit} messages per minute. Please try again in ${retryAfter} seconds.`,
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(rateLimit.limit),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(rateLimit.reset),
          },
        }
      );
    }

    const { messages } = await req.json();

    const apiKey = getHealthyKey();
    const google = createGoogleGenerativeAI({ apiKey });
    const requestErrorHandler = makeErrorHandler(apiKey);

    // ── RAG: Retrieve relevant context ───────────────────────
    // Extract the latest user message for retrieval
    const lastUserMessage = [...messages]
      .reverse()
      .find((m: { role: string }) => m.role === 'user');

    const streamData = new StreamData();
    let ragContext = '';
    let retrievalDiagnostics: {
      rewrittenQuery: string | null;
      sources: { id: string; title: string; score: number }[];
      retrievalLatencyMs: number;
      model: string;
    } | null = null;

    if (lastUserMessage) {
      const originalQuery =
        typeof lastUserMessage.content === 'string'
          ? lastUserMessage.content
          : Array.isArray(lastUserMessage.content)
            ? lastUserMessage.content
                .filter((p: { type: string }) => p.type === 'text')
                .map((p: { text: string }) => p.text)
                .join(' ')
            : '';
      let userQuery = originalQuery;

      if (userQuery.trim()) {
        const retrievalStart = Date.now();
        try {
          // If there's conversation history, rewrite the query for better RAG retrieval
          if (messages.length > 1) {
            const historyText = messages
              .slice(-6) // Only take the last few messages to save tokens
              .map((m: { role: string; content: unknown }) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${
                typeof m.content === 'string' ? m.content : '...'
              }`)
              .join('\n');

            const rewritePrompt = `Given the following conversation history, rewrite the user's latest query into a standalone search query.
If the user says 'How long did it take?', and the history is about Floq, output 'How long did the Floq project take?'.
Output ONLY the rewritten query, without any quotes or preamble.

Conversation History:
${historyText}

Latest Query:
${userQuery}`;

            const rewrittenQuery = await rewriteQueryForRetrieval(rewritePrompt);
            if (rewrittenQuery) {
              console.log(`[RAG] Rewrote query: "${userQuery}" -> "${rewrittenQuery}"`);
              userQuery = rewrittenQuery;
            } else {
              console.warn('[RAG] Query rewrite failed on all candidate keys, falling back to original query.');
            }
          }

          const retrievalResults = await retrieve(userQuery);
          ragContext = formatContext(retrievalResults);

          retrievalDiagnostics = {
            rewrittenQuery: userQuery !== originalQuery ? userQuery : null,
            sources: retrievalResults.map((r) => ({
              id: r.document.id,
              title: r.document.title,
              score: Math.round(r.score * 1000) / 1000,
            })),
            retrievalLatencyMs: Date.now() - retrievalStart,
            model: 'gemini-2.5-flash',
          };
        } catch (err) {
          console.error('[RAG] Retrieval error:', err);
          // Fall through — chatbot will still work, just without RAG context
        }
      }
    }

    if (retrievalDiagnostics) {
      streamData.appendMessageAnnotation({
        type: 'retrieval-diagnostics',
        ...retrievalDiagnostics,
      });
    }

    // ── Build a single merged system message ─────────────────
    // Gemini only supports one system message, so merge persona + RAG context
    const systemContent = ragContext
      ? `${SYSTEM_PROMPT.content}\n\n## Retrieved Context (use ALL of this information to answer the user's question — do NOT truncate or summarize):\n\n${ragContext}`
      : SYSTEM_PROMPT.content;

    const augmentedMessages = [
      { role: 'system', content: systemContent },
      ...messages,
    ];

    const tools = {
      getProjects,
      getPresentation,
      getResume,
      getContact,
      getSkills,
      getInterests,
      getCrazy,
      executeUiAction,
      analyzeJobFit,
      submitContactRequest,
    };

    const result = streamText({
      model: google("gemini-2.5-flash"),
      messages: augmentedMessages,
      toolCallStreaming: true,
      tools,
      // maxSteps: 1 avoids a second internal round-trip that requires
      // replaying the model's own function-call message back to Gemini.
      maxSteps: 1,
      onFinish: () => {
        streamData.close();
      },
    });

    return result.toDataStreamResponse({
      data: streamData,
      getErrorMessage: requestErrorHandler,
      headers: {
        'X-RateLimit-Limit': String(rateLimit.limit),
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(rateLimit.reset),
      },
    });
  } catch (err) {
    console.error("Global error:", err);
    const errorMessage = errorHandler(err);
    return new Response(errorMessage, { status: 500 });
  }
}
