/**
 * Retrieval evaluation against the golden set (tests/rag-eval/golden-set.json).
 * Runs against the live Gemini + Pinecone services; reads only.
 *
 *   npx tsx scripts/eval-retrieval.ts               full pipeline (router + retriever)
 *   npx tsx scripts/eval-retrieval.ts --no-router   retriever only, using each case's intent
 *   npx tsx scripts/eval-retrieval.ts --calibrate   raw vector scores, to choose MIN_VECTOR_SCORE
 *   npx tsx scripts/eval-retrieval.ts --case=floq-what,compare
 *   npx tsx scripts/eval-retrieval.ts --fresh-plans   ignore cached router plans
 *   npx tsx scripts/eval-retrieval.ts --fallback-router  rule-based plans only (router outage)
 *
 * Router plans are cached in tests/rag-eval/.plan-cache.json, keyed by a hash
 * of the exact router prompt and model, so retrieval-only changes can be
 * re-evaluated without spending the (small, shared) Gemini free-tier quota.
 * Any change to the router prompt invalidates the affected entries.
 *
 * Metrics:
 *   routing   did the router retrieve exactly when the case says it should
 *   recall    share of expected documents retrieved (answerable cases)
 *   precision share of retrieved documents that are expected or acceptable
 *   rejection unanswerable cases that correctly returned zero documents
 */
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

interface GoldenCase {
  id: string;
  type: 'lookup' | 'broad' | 'followup' | 'off_topic' | 'chitchat' | 'unanswerable';
  query: string;
  standalone?: string;
  history?: { role: string; content: string }[];
  retrieve: boolean;
  expected?: string[];
  acceptable?: string[];
}

const args = process.argv.slice(2);
const CALIBRATE = args.includes('--calibrate');
const NO_ROUTER = args.includes('--no-router');
const FRESH_PLANS = args.includes('--fresh-plans');
const FALLBACK_ROUTER = args.includes('--fallback-router');
const onlyCases = args.find((a) => a.startsWith('--case='))?.slice('--case='.length).split(',');
const PLAN_CACHE_PATH = path.resolve(process.cwd(), 'tests/rag-eval/.plan-cache.json');

const matches = (id: string, patterns: string[]) =>
  patterns.some((p) => (p.endsWith('*') ? id.startsWith(p.slice(0, -1)) : id === p));

const pct = (n: number, d: number) => (d === 0 ? 'n/a' : `${((100 * n) / d).toFixed(1)}%`);

async function main() {
  // Imported after dotenv so modules see the environment
  const { fetchCandidates, retrieve, MIN_VECTOR_SCORE, estimateTokens } = await import('../src/lib/rag/retriever');
  const { planRetrieval, executePlan, buildRouterPrompt, heuristicPlan, ROUTER_MODEL } = await import('../src/lib/rag/router');
  type Plan = Awaited<ReturnType<typeof planRetrieval>>;
  let planCache: Record<string, Plan> = {};
  try {
    planCache = JSON.parse(fs.readFileSync(PLAN_CACHE_PATH, 'utf8'));
  } catch {
    planCache = {};
  }
  const cachedPlan = async (query: string, history: { role: string; content: string }[]): Promise<Plan> => {
    if (FALLBACK_ROUTER) return heuristicPlan(query);
    const key = crypto.createHash('sha256').update(ROUTER_MODEL + '\n' + buildRouterPrompt(query, history)).digest('hex');
    if (!FRESH_PLANS && planCache[key]) return planCache[key];
    const plan = await planRetrieval(query, history);
    if (plan.source === 'llm') {
      planCache[key] = plan; // never cache fallbacks (timeouts, quota errors)
      fs.writeFileSync(PLAN_CACHE_PATH, JSON.stringify(planCache, null, 2) + '\n', 'utf8');
    }
    return plan;
  };

  const golden = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'tests/rag-eval/golden-set.json'), 'utf8'));
  const cases: GoldenCase[] = golden.cases.filter((c: GoldenCase) => !onlyCases || onlyCases.includes(c.id));

  if (CALIBRATE) {
    // For each case, the raw cosine score of (a) the weakest expected document
    // and (b) the best document at all. Positives need (a) above the floor;
    // negatives (off-topic, unanswerable) need (b) below it.
    const positives: { id: string; score: number }[] = [];
    const negatives: { id: string; score: number; top: string }[] = [];
    for (const c of cases) {
      if (c.type === 'chitchat') continue;
      const chunks = await fetchCandidates(c.standalone ?? c.query);
      const bestByDoc = new Map<string, number>();
      for (const ch of chunks) bestByDoc.set(ch.parentId, Math.max(bestByDoc.get(ch.parentId) ?? 0, ch.vectorScore));
      const top = [...bestByDoc.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['-', 0];
      if (c.expected && c.expected.length > 0) {
        const weakest = Math.min(...c.expected.map((id) => bestByDoc.get(id) ?? 0));
        positives.push({ id: c.id, score: weakest });
        console.log(`  +  ${c.id.padEnd(22)} weakest expected ${weakest.toFixed(3)}   (top: ${top[0]} ${top[1].toFixed(3)})`);
      } else {
        negatives.push({ id: c.id, score: top[1], top: top[0] });
        console.log(`  -  ${c.id.padEnd(22)} best overall    ${top[1].toFixed(3)}   (${top[0]})`);
      }
    }
    positives.sort((a, b) => a.score - b.score);
    negatives.sort((a, b) => b.score - a.score);
    const lowestPositive = positives[0];
    const highestNegative = negatives[0];
    console.log(`\nLowest relevant score:   ${lowestPositive?.score.toFixed(3)} (${lowestPositive?.id})`);
    console.log(`Highest irrelevant score: ${highestNegative?.score.toFixed(3)} (${highestNegative?.id} → ${highestNegative?.top})`);
    if (lowestPositive && highestNegative) {
      if (lowestPositive.score > highestNegative.score) {
        console.log(`Separable. Suggested MIN_VECTOR_SCORE ≈ ${((lowestPositive.score + highestNegative.score) / 2).toFixed(3)} (current ${MIN_VECTOR_SCORE}).`);
      } else {
        console.log('NOT separable by a single floor. Overlapping cases:');
        for (const p of positives.filter((p) => p.score <= highestNegative.score)) console.log(`  relevant ${p.id} ${p.score.toFixed(3)}`);
        for (const n of negatives.filter((n) => n.score >= lowestPositive.score)) console.log(`  irrelevant ${n.id} ${n.score.toFixed(3)}`);
        console.log('The router must catch these (off-topic), or a reranker is needed.');
      }
    }
    return;
  }

  let routingCorrect = 0;
  let recallSum = 0, recallN = 0, fullHits = 0;
  let precisionSum = 0, precisionN = 0;
  let rejectOk = 0, rejectN = 0;
  let docsSum = 0, tokensSum = 0, retrievedCases = 0;
  const failures: string[] = [];

  for (const c of cases) {
    const started = Date.now();
    let intent: string;
    let results;
    if (NO_ROUTER) {
      intent = c.type === 'off_topic' || c.type === 'chitchat' ? c.type : c.type === 'broad' ? 'broad' : 'lookup';
      results = c.retrieve
        ? await retrieve(c.standalone ?? c.query, { mode: c.type === 'broad' ? 'broad' : 'focused' })
        : [];
    } else {
      const plan = await cachedPlan(c.query, c.history ?? []);
      intent = `${plan.intent}${plan.source === 'fallback' ? '(fallback)' : ''} ${JSON.stringify(plan.searchQueries)}${plan.category ? ` [${plan.category}]` : ''}`;
      results = await executePlan(plan);
      const retrieved = plan.intent === 'lookup' || plan.intent === 'broad';
      if (retrieved === c.retrieve) routingCorrect++;
      else failures.push(`${c.id}: routing expected retrieve=${c.retrieve}, got ${plan.intent}`);
    }
    const ids = results.map((r) => r.document.id);
    const tokens = results.reduce((sum, r) => sum + estimateTokens(r.document.content), 0);
    if (ids.length > 0) {
      docsSum += ids.length;
      tokensSum += tokens;
      retrievedCases++;
    }

    let verdict = '';
    if (c.type === 'unanswerable') {
      rejectN++;
      if (ids.length === 0) rejectOk++;
      else failures.push(`${c.id}: should retrieve nothing, got ${ids.join(', ')}`);
      verdict = ids.length === 0 ? 'rejected ✓' : `leaked ${ids.length} ✗`;
    } else if (c.retrieve && c.expected) {
      const found = c.expected.filter((id) => ids.includes(id));
      const recall = found.length / c.expected.length;
      recallSum += recall;
      recallN++;
      if (recall === 1) fullHits++;
      else failures.push(`${c.id}: missing ${c.expected.filter((id) => !ids.includes(id)).join(', ')}`);
      if (ids.length > 0) {
        const relevant = [...c.expected, ...(c.acceptable ?? [])];
        const precise = ids.filter((id) => matches(id, relevant)).length / ids.length;
        precisionSum += precise;
        precisionN++;
        const extras = ids.filter((id) => !matches(id, relevant));
        if (extras.length > 0) failures.push(`${c.id}: off-target ${extras.join(', ')}`);
      }
      verdict = `recall ${found.length}/${c.expected.length}`;
    } else {
      verdict = ids.length === 0 ? 'no retrieval ✓' : `retrieved ${ids.length} ✗`;
    }

    console.log(
      `${c.id.padEnd(22)} ${verdict.padEnd(16)} docs=${String(ids.length).padEnd(2)} ~${String(tokens).padStart(4)} tok ${String(Date.now() - started).padStart(5)}ms  ${intent}`
    );
  }

  console.log('\n──────── Summary ────────');
  if (!NO_ROUTER) console.log(`Routing accuracy:      ${pct(routingCorrect, cases.length)} (${routingCorrect}/${cases.length})`);
  console.log(`Mean recall:           ${pct(recallSum, recallN)}   (all expected found: ${fullHits}/${recallN})`);
  console.log(`Mean precision:        ${pct(precisionSum, precisionN)}`);
  console.log(`Unanswerable rejected: ${pct(rejectOk, rejectN)} (${rejectOk}/${rejectN})`);
  console.log(`Avg docs / context:    ${(docsSum / Math.max(1, retrievedCases)).toFixed(1)} docs, ~${Math.round(tokensSum / Math.max(1, retrievedCases))} tokens (cases that retrieved)`);
  console.log(`MIN_VECTOR_SCORE:      ${MIN_VECTOR_SCORE}`);
  if (failures.length > 0) {
    console.log('\nIssues:');
    for (const f of failures) console.log(`  - ${f}`);
  }
}

main().catch((err) => {
  console.error('[Eval] Failed:', err);
  process.exit(1);
});
