/**
 * Read-only audit: finds Pinecone records whose IDs are not in KNOWLEDGE_BASE
 * ("orphans") and writes their full metadata to orphans.json for review.
 *
 * Usage: npx tsx scripts/export-orphans.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';
import { KNOWLEDGE_BASE } from '../src/lib/rag/knowledge-base';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const INDEX_NAME = process.env.PINECONE_INDEX || 'portfolio';
const NAMESPACE = process.env.PINECONE_NAMESPACE || '';
const OUTPUT_PATH = path.resolve(process.cwd(), 'orphans.json');

async function main(): Promise<void> {
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) throw new Error('PINECONE_API_KEY is not set');

  const index = new Pinecone({ apiKey }).index(INDEX_NAME);
  const target = NAMESPACE ? index.namespace(NAMESPACE) : index;

  const stats = await index.describeIndexStats();
  console.log(`[Orphans] Index '${INDEX_NAME}' namespaces:`, JSON.stringify(stats.namespaces));

  const ids: string[] = [];
  let paginationToken: string | undefined;
  do {
    const page = await target.listPaginated({ limit: 100, paginationToken });
    for (const v of page.vectors ?? []) if (v.id) ids.push(v.id);
    paginationToken = page.pagination?.next;
  } while (paginationToken);

  const known = new Set(KNOWLEDGE_BASE.map((d) => d.id));
  const orphanIds = ids.filter((id) => !known.has(id));
  const missingIds = [...known].filter((id) => !ids.includes(id));

  console.log(`[Orphans] ${ids.length} records in index, ${known.size} in KNOWLEDGE_BASE.`);
  console.log(`[Orphans] Orphan IDs (${orphanIds.length}):`, orphanIds);
  console.log(`[Orphans] In KNOWLEDGE_BASE but missing from index (${missingIds.length}):`, missingIds);

  const orphans: Array<{ id: string; metadata: unknown }> = [];
  for (let i = 0; i < orphanIds.length; i += 100) {
    const batch = orphanIds.slice(i, i + 100);
    const { records } = await target.fetch({ ids: batch });
    for (const id of batch) orphans.push({ id, metadata: records[id]?.metadata ?? null });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(orphans, null, 2) + '\n', 'utf8');
  console.log(`[Orphans] Wrote ${orphans.length} orphan records to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error('[Orphans] Failed:', err);
  process.exit(1);
});
