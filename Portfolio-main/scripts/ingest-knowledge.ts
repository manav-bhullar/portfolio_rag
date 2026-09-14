import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { KNOWLEDGE_BASE } from '../src/lib/rag/knowledge-base';
import { getPineconeIndex } from '../src/lib/rag/pinecone';
import { getEmbedding } from '../src/lib/rag/embeddings';

async function ingest() {
  console.log(`[Ingest] Starting ingestion of ${KNOWLEDGE_BASE.length} documents...`);
  
  if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
    console.error('[Ingest] Error: PINECONE_API_KEY and PINECONE_INDEX must be set in .env.local');
    process.exit(1);
  }

  const index = getPineconeIndex();
  const vectors = [];

  for (const doc of KNOWLEDGE_BASE) {
    console.log(`[Ingest] Embedding: ${doc.title}...`);
    
    // Build the text to embed
    const textToEmbed = `${doc.title}\n\n${doc.content}\n\nKeywords: ${doc.keywords.join(', ')}`;
    
    // Get vector from Google
    const embedding = await getEmbedding(textToEmbed);
    
    // Prepare Pinecone record
    vectors.push({
      id: doc.id,
      values: embedding,
      metadata: {
        title: doc.title,
        content: doc.content,
        category: doc.category,
        // Pinecone accepts arrays of strings directly
        keywords: doc.keywords,
      }
    });
  }

  console.log(`[Ingest] Upserting ${vectors.length} vectors to Pinecone index "${process.env.PINECONE_INDEX}"...`);
  
  // Pinecone recommends batching if there are hundreds of vectors, but for < 100 we can just upsert all at once
  await index.upsert({ records: vectors });
  
  console.log('[Ingest] ✅ Successfully pushed all knowledge to Pinecone!');
}

ingest().catch(console.error);
