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

    messages.unshift(SYSTEM_PROMPT);

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
      messages,
      toolCallStreaming: true,
      tools,
      // maxSteps: 1 avoids a second internal round-trip that requires
      // replaying the model's own function-call message back to Gemini —
      // our installed @ai-sdk/google version doesn't preserve the
      // thought_signature Gemini's newer models require for that replay.
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