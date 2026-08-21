export async function queryPinecone(vector: number[], topK: number) {
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX || 'portfolio-rag'; // fallback to user's known index

  if (!apiKey) {
    throw new Error("PINECONE_API_KEY is not defined in environment variables");
  }

  // 1. Get host for the index
  const metaRes = await fetch(`https://api.pinecone.io/indexes/${indexName}`, {
    headers: { 'Api-Key': apiKey },
  });
  
  if (!metaRes.ok) {
    throw new Error(`Failed to fetch Pinecone index info: ${await metaRes.text()}`);
  }
  
  const metaData = await metaRes.json();
  const host = metaData.host;

  // 2. Query the index
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
    }),
  });

  if (!queryRes.ok) {
    throw new Error(`Failed to query Pinecone: ${await queryRes.text()}`);
  }

  return await queryRes.json();
}
