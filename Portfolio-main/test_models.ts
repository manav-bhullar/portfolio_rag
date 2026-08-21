async function main() {
  const apiKey = Object.keys(process.env).filter(k => k.startsWith("GEMINI") || k.startsWith("GOOGLE")).map(k => process.env[k])[0];
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=" + apiKey);
  const data = await res.json();
  console.log(data.models.map(m => m.name).filter(n => n.includes("embed")));
}
main();
