import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, generateText } from "ai";
import { checkRateLimit } from '@/lib/ratelimit';
import { SYSTEM_PROMPT } from './prompt';
import { getProjects } from './tools/getProjects';
import { getPresentation } from './tools/getPresentation';
import { getResume } from './tools/getResume';
import { getContact } from './tools/getContact';
import { getSkills } from './tools/getSkills';
import { getInterests } from './tools/getInterests';
import { getCrazy } from './tools/getCrazy';
import { executeUiAction } from './tools/executeUiAction';
import { retrieve, formatContext } from '@/lib/rag/retriever';

export const runtime = 'edge';
export const maxDuration = 60;
export const preferredRegion = 'iad1'; // Deploy close to Pinecone (us-east-1) to reduce latency

import { fallback } from "ai";

function getAllApiKeys() {
  const keys = Object.keys(process.env)
    .filter(key => key.startsWith('GEMINI_API_KEY') || key.startsWith('GOOGLE_API_KEY'))
    .map(key => process.env[key])
    .filter(Boolean) as string[];
  
  if (keys.length === 0) {
    throw new Error("No Gemini/Google API keys found in environment variables");
  }
  
  // Shuffle keys to distribute load initially
  return keys.sort(() => Math.random() - 0.5);
}
function errorHandler(error: unknown) {
  if (error == null) {
    return 'Unknown error';
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return JSON.stringify(error);
}

export async function POST(req: Request) {
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

    // ── RAG: Retrieve relevant context ───────────────────────
    // Extract the latest user message for retrieval
    const lastUserMessage = [...messages]
      .reverse()
      .find((m: { role: string }) => m.role === 'user');

    let ragContext = '';
    if (lastUserMessage) {
      let userQuery =
        typeof lastUserMessage.content === 'string'
          ? lastUserMessage.content
          : Array.isArray(lastUserMessage.content)
            ? lastUserMessage.content
                .filter((p: { type: string }) => p.type === 'text')
                .map((p: { text: string }) => p.text)
                .join(' ')
            : '';

      if (userQuery.trim()) {
        try {
          // To save 50% of Gemini API calls and reduce latency by ~2-3s,
          // we are skipping the LLM-based query rewrite step.
          // The raw userQuery will be passed directly to the embedding model.

          const retrievalResults = await retrieve(userQuery);
          ragContext = formatContext(retrievalResults);
        } catch (err) {
          console.error('[RAG] Retrieval error:', err);
          // Fall through — chatbot will still work, just without RAG context
        }
      }
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
    };

    const allKeys = getAllApiKeys();
    
    // Create an array of models, one for each API key
    const modelArray = allKeys.map(apiKey => 
      createGoogleGenerativeAI({ apiKey })("gemini-flash-latest")
    );
    
    // Wrap the models in a fallback provider. If the first key hits a rate limit (429),
    // it will instantly and invisibly fallback to the next key.
    const robustModel = fallback(modelArray);

    const result = streamText({
      model: robustModel,
      messages: augmentedMessages,
      toolCallStreaming: true,
      tools,
      // maxSteps: 1 avoids a second internal round-trip that requires
      // replaying the model's own function-call message back to Gemini.
      maxSteps: 1,
    });

    return result.toDataStreamResponse({
      getErrorMessage: errorHandler,
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