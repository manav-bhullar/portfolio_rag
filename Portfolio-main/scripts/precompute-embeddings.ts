import fs from 'fs';
import path from 'path';
import { pipeline, env } from '@xenova/transformers';
import { KNOWLEDGE_BASE } from '../src/lib/rag/knowledge-base';

// Disable local models warning/check
env.allowLocalModels = false;

async function batchEmbed(texts: string[]) {
  console.log('Loading Xenova/all-MiniLM-L6-v2 model...');
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  
  console.log(`Computing embeddings for ${texts.length} documents...`);
  const output = await extractor(texts, { pooling: 'mean', normalize: true });
  
  const embeddings: number[][] = [];
  const dim = output.dims[1];
  for (let i = 0; i < texts.length; i++) {
    const start = i * dim;
    const end = start + dim;
    embeddings.push(Array.from(output.data.slice(start, end)));
  }
  return embeddings;
}

async function main() {
  try {
    const textsToEmbed = KNOWLEDGE_BASE.map(
      (doc) =>
        `${doc.title}\n\n${doc.content}\n\nKeywords: ${doc.keywords.join(', ')}`
    );

    const embeddings = await batchEmbed(textsToEmbed);

    const result = KNOWLEDGE_BASE.map((doc, i) => ({
      document: doc,
      embedding: embeddings[i],
    }));

    const outputPath = path.join(__dirname, '../src/lib/rag/precomputed-vectors.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    
    console.log(`✅ Successfully precomputed embeddings and saved to ${outputPath}`);
  } catch (err) {
    console.error('Error precomputing embeddings:', err);
    process.exit(1);
  }
}

main();
