require('dotenv').config({ path: '.env.local' });
async function listModels() {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
  const data = await res.json();
  if (data.models) {
    console.log("AVAILABLE MODELS:");
    data.models.filter(m => m.supportedGenerationMethods.includes("generateContent") || m.supportedGenerationMethods.includes("embedContent")).forEach(m => {
      console.log(`- ${m.name} (Methods: ${m.supportedGenerationMethods.join(', ')})`);
    });
  } else {
    console.log("Error:", data);
  }
}
listModels();
