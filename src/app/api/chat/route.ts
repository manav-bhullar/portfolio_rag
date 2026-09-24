import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, StreamData } from "ai";
import { checkRateLimit } from '@/lib/ratelimit';
import { getHealthyKey, getKeysHealthyFirst, reportKeyFailure, isRateLimitError } from '@/lib/gemini-keys';
import { SYSTEM_PROMPT } from './prompt';
import { getProjects } from './tools/getProjects';
import { exploreProject } from './tools/exploreProject';
import { compareWithRole } from './tools/compareWithRole';
import { getPresentation } from './tools/getPresentation';
import { getResume } from './tools/getResume';
import { getContact } from './tools/getContact';
import { getSkills } from './tools/getSkills';
import { getInterests } from './tools/getInterests';
import { getCrazy } from './tools/getCrazy';
import { executeUiAction } from './tools/executeUiAction';
import { analyzeJobFit } from './tools/analyzeJobFit';
import { generateCoverLetter } from './tools/generateCoverLetter';
import { submitContactRequest } from './tools/submitContactRequest';
import { formatContext } from '@/lib/rag/retriever';
import { planRetrieval, executePlan, type QueryIntent } from '@/lib/rag/router';
import { Redis } from '@upstash/redis';

export const runtime = 'edge';
export const maxDuration = 60;
export const preferredRegion = 'iad1'; // Deploy close to Pinecone (us-east-1) to reduce latency

// IMPORTANT: always pin an explicit, currently-supported model version here,
// never a rolling "-latest" alias. Google moves "-latest" forward to whatever
// its newest GA model is without warning, and the newest generation can ship
// with a far stricter free-tier quota than older ones (gemini-3.8-flash's
// free tier is 20 requests/DAY total — https://discuss.ai.google.dev/t/180609
// — which silently broke this app when "gemini-flash-latest" rolled onto it).
// Also: Google can cut off a stable model to *new* API keys well before its
// announced shutdown date (gemini-2.5-flash did this), so if key rotation
// starts throwing "no longer available to new users" errors, that's the
// signal to re-check ai.google.dev/gemini-api/docs/deprecations and move to
// whatever model that error message itself names as the replacement.

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

const getRedis = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
};

export async function POST(req: Request) {
  const errorHandler = makeErrorHandler(''); // fallback handler if we fail before picking a key
  try {
    const { messages, visitorType } = await req.json();

    // Enforce rate limiting
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

    // 1.5. Log Query for Trending Ticker
    const lastUserMessage = messages.filter((m: { role: string; content: string }) => m.role === 'user').pop();
    if (lastUserMessage && lastUserMessage.content) {
      // Run async without blocking the response
      const redis = getRedis();
      if (redis) {
        redis.lpush('portfolio_recent_queries', lastUserMessage.content).then(() => {
          redis.ltrim('portfolio_recent_queries', 0, 49); // Keep only last 50
        }).catch(console.error);
      }
    }

    const apiKey = getHealthyKey();
    
    // Custom fetch wrapper that automatically rotates keys on rate limits
    const customFetch = async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const candidateKeys = getKeysHealthyFirst().slice(0, 3);
      let lastResponse: Response | undefined;
      let attempt = 0;
      
      for (const key of candidateKeys) {
        attempt++;
        const headers = new Headers(init?.headers);
        headers.set('x-goog-api-key', key);
        
        try {
          const response = await fetch(url, { ...init, headers });
          if ((response.status === 429 || response.status === 403) && attempt < candidateKeys.length) {
            reportKeyFailure(key);
            lastResponse = response;
            console.warn(`[Key Rotation] Key failed with status ${response.status}. Rotating...`);
            continue;
          }
          return response;
        } catch (err) {
          reportKeyFailure(key);
          if (attempt === candidateKeys.length) throw err;
        }
      }
      
      if (lastResponse) return lastResponse;
      throw new Error('All candidate keys exhausted');
    };

    const google = createGoogleGenerativeAI({ apiKey, fetch: customFetch });
    const requestErrorHandler = makeErrorHandler(apiKey);

    // ── RAG: Retrieve relevant context ───────────────────────
    const streamData = new StreamData();
    let ragContext = '';
    let noContextNote = '';
    let retrievalDiagnostics: {
      intent: QueryIntent;
      routeSource: 'llm' | 'fallback';
      rewrittenQuery: string | null;
      sources: { id: string; title: string; score: number; url?: string }[];
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
      const userQuery = originalQuery;

      if (userQuery.trim()) {
        const retrievalStart = Date.now();
        try {
          // Route first: decide whether to retrieve at all, and rewrite
          // follow-ups / split comparisons into standalone search queries.
          const plan = await planRetrieval(userQuery, messages.slice(0, -1));
          console.log(`[RAG] Plan: ${plan.intent} (${plan.source}) queries=${JSON.stringify(plan.searchQueries)}${plan.category ? ` category=${plan.category}` : ''}`);

          const retrievalResults = await executePlan(plan, {
            originalQuery: userQuery,
            hasHistory: messages.length > 1,
          });
          ragContext = retrievalResults.length > 0 ? formatContext(retrievalResults) : '';

          if (retrievalResults.length === 0 && (plan.intent === 'lookup' || plan.intent === 'broad')) {
            noContextNote = "\n\n## Retrieved Context\nNo document in the knowledge base is relevant enough to this question. Do not guess or invent facts about Manav: say you don't have that information, and suggest a related topic you can help with.";
          }

          const searchQueriesText = plan.searchQueries.join(' | ');
          retrievalDiagnostics = {
            intent: plan.intent,
            routeSource: plan.source,
            rewrittenQuery: searchQueriesText && searchQueriesText !== originalQuery ? searchQueriesText : null,
            sources: retrievalResults.map((r) => ({
              id: r.document.id,
              title: r.document.title,
              score: Math.round(r.score * 1000) / 1000,
              ...(r.document.url ? { url: r.document.url } : {}),
            })),
            retrievalLatencyMs: Date.now() - retrievalStart,
            model: 'gemini-3.6-flash',
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

    let toneInstruction = '';
    if (visitorType === 'recruiter') {
      toneInstruction = '\n\n**TONE CALIBRATION**: The user is a Recruiter or Hiring Manager. Be highly professional, concise, and metrics-first. Emphasize Manav\'s experience, job fit, and provide the downloadable resume when relevant.';
    } else if (visitorType === 'developer') {
      toneInstruction = '\n\n**TONE CALIBRATION**: The user is a Developer. Be technical, direct, and show the code. Emphasize architecture, algorithms, and provide GitHub links.';
    } else if (visitorType === 'curious') {
      toneInstruction = '\n\n**TONE CALIBRATION**: The user is just curious. Be casual, engaging, and use storytelling. Emphasize background, interests, and fun facts.';
    }

    // ── Build a single merged system message ─────────────────
    // Gemini only supports one system message, so merge persona + tone + RAG context
    const systemContent = ragContext
      ? `${SYSTEM_PROMPT.content}${toneInstruction}\n\n## Retrieved Context (use ALL of this information to answer the user's question — do NOT truncate or summarize):\n\n${ragContext}`
      : `${SYSTEM_PROMPT.content}${toneInstruction}${noContextNote}`;

    const augmentedMessages = [
      { role: 'system', content: systemContent },
      ...messages,
    ];

    const tools = {
      getProjects,
      exploreProject,
      compareWithRole,
      getPresentation,
      getResume,
      getContact,
      getSkills,
      getInterests,
      getCrazy,
      executeUiAction,
      analyzeJobFit,
      generateCoverLetter,
      submitContactRequest,
    };

    const result = streamText({
      model: google("gemini-3.6-flash"),
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
