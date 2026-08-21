import { embed } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

async function main() {
  const geminiApiKey = Object.keys(process.env).filter(k => k.startsWith("GEMINI_API_KEY") || k.startsWith("GOOGLE_API_KEY")).map(k => process.env[k])[0];
  const google = createGoogleGenerativeAI({ apiKey: geminiApiKey });
  
  for (const model of ["text-embedding-004", "embedding-001"]) {
    try {
      await embed({ model: google.textEmbeddingModel(model), value: "hello" });
      console.log(model + " SUCCESS");
    } catch (e) {
      console.log(model + " FAILED: " + e.message);
    }
  }
}
main();
