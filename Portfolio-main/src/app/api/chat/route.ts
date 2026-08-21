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

export const maxDuration = 60;
export const preferredRegion = 'iad1'; // Deploy close to Pinecone (us-east-1) to reduce latency

function getRandomApiKey() {
  const keys = Object.keys(process.env)
    .filter(key => key.startsWith('GEMINI_API_KEY') || key.startsWith('GOOGLE_API_KEY'))
    .map(key => process.env[key])
    .filter(Boolean) as string[];
  
  if (keys.length === 0) {
    throw new Error("No Gemini/Google API keys found in environment variables");
  }
  
  const randomIndex = Math.floor(Math.random() * keys.length);
  return keys[randomIndex];
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

    const apiKey = getRandomApiKey();
    const google = createGoogleGenerativeAI({ apiKey });

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

            try {
              const { text: rewrittenQuery } = await generateText({
                model: google("gemini-1.5-flash"), // fast flash model
                prompt: rewritePrompt,
              });
              
              if (rewrittenQuery && rewrittenQuery.trim()) {
                console.log(`[RAG] Rewrote query: "${userQuery}" -> "${rewrittenQuery.trim()}"`);
                userQuery = rewrittenQuery.trim();
              }
            } catch (rewriteErr) {
              console.error('[RAG] Query rewrite failed, falling back to original query:', rewriteErr);
            }
          }

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

    const result = streamText({
      model: google("gemini-flash-latest"),
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