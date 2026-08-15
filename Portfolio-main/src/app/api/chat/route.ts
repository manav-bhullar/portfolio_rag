import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from "ai";
import { SYSTEM_PROMPT } from './prompt';
import { getProjects } from './tools/getProjects';
import { getPresentation } from './tools/getPresentation';
import { getResume } from './tools/getResume';
import { getContact } from './tools/getContact';
import { getSkills } from './tools/getSkills';
import { getInterests } from './tools/getInterests';
import { getCrazy } from './tools/getCrazy';
import { retrieve, formatContext } from '@/lib/rag/retriever';

export const maxDuration = 30;

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

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
    const { messages } = await req.json();

    // ── RAG: Retrieve relevant context ───────────────────────
    // Extract the latest user message for retrieval
    const lastUserMessage = [...messages]
      .reverse()
      .find((m: { role: string }) => m.role === 'user');

    let ragContext = '';
    if (lastUserMessage) {
      const userQuery =
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
    });
  } catch (err) {
    console.error("Global error:", err);
    const errorMessage = errorHandler(err);
    return new Response(errorMessage, { status: 500 });
  }
}