// Edge-runtime-safe Pinecone client: the official @pinecone-database/pinecone
// SDK pulls in its "assistant" submodule (file upload / chat), which imports
// Node-only builtins (fs, path, stream) that the Edge runtime can't bundle —
// this broke the build the moment route.ts declared `runtime = 'edge'`. Plain
// fetch() has no such dependency and works in both runtimes.
//
// The index host is cached in module scope so a warm Edge isolate reuses it
// across requests instead of re-resolving it (a GET to api.pinecone.io) on
// every single chat message.
let cachedHost: string | null = null;

async function resolveIndexHost(apiKey: string, indexName: string): Promise<string> {
  if (cachedHost) return cachedHost;

  const metaRes = await fetch(`https://api.pinecone.io/indexes/${indexName}`, {
    headers: { 'Api-Key': apiKey },
  });

  if (!metaRes.ok) {
    throw new Error(`Failed to fetch Pinecone index info: ${await metaRes.text()}`);
  }

  const metaData = await metaRes.json();
  cachedHost = metaData.host;
  return cachedHost as string;
}

export async function queryPinecone(vector: number[], topK: number) {
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX;
  // Must match the namespace scripts/ingest.ts writes to (default namespace when unset)
  const namespace = process.env.PINECONE_NAMESPACE || '';

  if (!apiKey) {
    throw new Error("PINECONE_API_KEY is not defined in environment variables");
  }
  if (!indexName) {
    throw new Error("PINECONE_INDEX is not defined in environment variables");
  }

  const host = await resolveIndexHost(apiKey, indexName);

  const queryRes = await fetch(`https://${host}/query`, {
    method: 'POST',
    headers: {
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      vector,
      topK,
      includeMetadata: true,
      ...(namespace ? { namespace } : {}),
    }),
  });

  if (!queryRes.ok) {
    // A cached host can go stale if the index is ever recreated — clear it
    // so the next request re-resolves instead of failing forever.
    cachedHost = null;
    throw new Error(`Failed to query Pinecone: ${await queryRes.text()}`);
  }

  return await queryRes.json();
}
