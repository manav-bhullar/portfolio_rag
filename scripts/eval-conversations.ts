/**
 * End-to-end conversation suite (tests/rag-eval/conversations.json).
 *
 * Calls the real chat route (POST /api/chat) in-process with each
 * conversation and checks what a visitor would see: the route the router
 * chose, the tools the answer model called, the server's deep-dive card, the
 * retrieved documents, and the answer text. It uses the live Gemini and
 * Pinecone services, so it spends answer-model quota: run it before merging,
 * not on every edit.
 *
 *   npx tsx scripts/eval-conversations.ts                   every conversation once
 *   npx tsx scripts/eval-conversations.ts --repeat=3        each 3 times (answers vary run to run)
 *   npx tsx scripts/eval-conversations.ts --model=gemini-3.5-flash-lite   try another answer model
 *   npx tsx scripts/eval-conversations.ts --case=compare,rag-portfolio
 *
 * Three kinds of checks per conversation:
 *   - deterministic: route, tools called or not, deep-dive card, retrieved
 *     documents, exact facts in the answer ("108"), citations valid;
 *   - judged: an AI grader (the router model, so no answer-model quota)
 *     checks meaning against a written criterion, e.g. "says it has no
 *     information about pets and invents none". Wording varies from run to
 *     run, so meaning is never checked with word lists;
 *   - warnings: reported but not failing (a missing FOLLOW_UP_QUESTIONS block).
 *
 * Exits with code 1 if any check fails. Google overload / quota errors are
 * retried, then reported separately as infrastructure errors.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';
import { generateObject } from 'ai';
import { z } from 'zod';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { extractCitations } from '../src/lib/citations';

const args = process.argv.slice(2);
const arg = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const REPEAT = Math.max(1, Number(arg('repeat') ?? 1));
const ONLY = arg('case')?.split(',');
if (arg('model')) process.env.CHAT_MODEL = arg('model');

// Never let test questions reach production side effects: without Upstash
// credentials the route skips the public trending list and uses its
// in-memory rate limiter. Set before dotenv so .env.local can't restore them.
process.env.UPSTASH_REDIS_REST_URL = '';
process.env.UPSTASH_REDIS_REST_TOKEN = '';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

type Msg = { role: 'user' | 'assistant'; content: string };
interface Expect {
  route?: string[];
  tools?: { mustCall?: string; mustNotCall?: string[] };
  deepDive?: string | false;
  retrieved?: { mustInclude?: string[] };
  answer?: { mentionsAll?: string[][]; mentionsNone?: string[]; judge?: string };
}
interface Conversation { id: string; about: string; messages: Msg[]; expect: Expect }
interface Observed {
  text: string;
  tools: string[];
  route?: string;
  /** 'llm', or 'fallback' when the router was unavailable and rules decided. */
  routeSource?: string;
  /** The answer's finish reason; 'unknown' = the stream ended without one (cut off upstream). */
  finishReason?: string;
  retrieved: string[];
  deepDive?: string;
  error?: string;
}

// A response that never finishes must be reported, not end the process: Node
// exits silently (code 0) when the only pending work is an unfinished stream.
const RESPONSE_TIMEOUT_MS = 120_000;

async function readBody(res: Response): Promise<string> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`response never finished within ${RESPONSE_TIMEOUT_MS / 1000} s`)), RESPONSE_TIMEOUT_MS);
  });
  try {
    return await Promise.race([res.text(), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

const TRANSIENT = /high demand|UNAVAILABLE|\b503\b|\b429\b|quota|rate limit|RESOURCE_EXHAUSTED|fetch failed|timeout|cut off upstream/i;

/** Parses the Vercel AI SDK data stream the route returns. */
function parseStream(body: string): Observed {
  const obs: Observed = { text: '', tools: [], retrieved: [] };
  for (const line of body.split('\n')) {
    const i = line.indexOf(':');
    if (i <= 0) continue;
    const code = line.slice(0, i);
    let value: unknown;
    try {
      value = JSON.parse(line.slice(i + 1));
    } catch {
      continue;
    }
    if (code === '0') obs.text += value as string;
    else if (code === '9' || code === 'b') {
      const name = (value as { toolName?: string }).toolName;
      if (name && !obs.tools.includes(name)) obs.tools.push(name);
    } else if (code === '3') obs.error = String(value);
    else if (code === 'd') obs.finishReason = (value as { finishReason?: string }).finishReason;
    else if (code === '8') {
      for (const a of value as Array<Record<string, unknown>>) {
        if (a?.type === 'retrieval-diagnostics') {
          obs.route = a.intent as string;
          obs.routeSource = a.routeSource as string | undefined;
          obs.retrieved = ((a.sources as Array<{ id: string }>) ?? []).map((s) => s.id);
        } else if (a?.type === 'project-deep-dive') {
          obs.deepDive = a.familyId as string;
        }
      }
    }
  }
  return obs;
}

const replyText = (o: Observed) => o.text.replace(/FOLLOW_UP_QUESTIONS:[\s\S]*/, '').trim();

/** Grades meaning against a written criterion. null = grader unavailable. */
async function judge(
  criterion: string,
  c: Conversation,
  reply: string,
  deps: { keys: string[]; model: string }
): Promise<{ pass: boolean; reason: string } | null> {
  const transcript = c.messages.map((m) => `${m.role === 'user' ? 'Visitor' : 'Chatbot'}: ${m.content}`).join('\n');
  for (const apiKey of deps.keys.slice(0, 4)) {
    try {
      const { object } = await generateObject({
        model: createGoogleGenerativeAI({ apiKey })(deps.model),
        schema: z.object({ pass: z.boolean(), reason: z.string() }),
        temperature: 0,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(30_000),
        prompt: `You grade replies of a portfolio chatbot that speaks as Manav, a software engineer, and answers from a knowledge base about him.

Criterion the reply must meet:
${criterion}

Conversation:
${transcript}

Chatbot reply (a UI card may also be shown next to it; judge only the text):
${reply || '(no text)'}

Pass only if the reply clearly meets the criterion. Be strict about invented facts, lenient about tone and wording. Give a one-sentence reason.`,
      });
      return object;
    } catch {
      // try the next key
    }
  }
  return null;
}

function check(c: Conversation, o: Observed): { failures: string[]; warnings: string[] } {
  const failures: string[] = [];
  const warnings: string[] = [];
  const e = c.expect;
  const reply = replyText(o);

  // Rules every reply must follow (system prompt)
  if (!reply) failures.push('rule: reply has no text');
  if (!/FOLLOW_UP_QUESTIONS:/.test(o.text)) warnings.push('no FOLLOW_UP_QUESTIONS block (suggestion chips not shown)');
  const invalid = extractCitations(o.text).filter((id) => !o.retrieved.includes(id));
  if (invalid.length) failures.push(`rule: cites documents it wasn't given: ${invalid.join(', ')}`);

  // This conversation's expectations
  if (e.route && !e.route.includes(o.route ?? 'none')) {
    // A router outage is an infrastructure condition: the rules took over by
    // design. The outcome (tools, retrieval, answer) is still checked.
    if (o.routeSource === 'fallback') warnings.push(`router unavailable; rules chose ${o.route} (expected ${e.route.join('/')})`);
    else failures.push(`route: expected ${e.route.join('/')}, got ${o.route ?? 'none'}`);
  }
  if (e.tools?.mustCall && !o.tools.includes(e.tools.mustCall)) failures.push(`tools: expected ${e.tools.mustCall}, got ${o.tools.join(', ') || 'none'}`);
  for (const t of e.tools?.mustNotCall ?? []) {
    const hit = t === '*' ? o.tools : o.tools.filter((x) => x === t);
    if (hit.length) failures.push(`tools: must not call ${t === '*' ? 'any tool' : t}, called ${hit.join(', ')}`);
  }
  if (e.deepDive !== undefined) {
    const want = e.deepDive === false ? undefined : e.deepDive;
    if (o.deepDive !== want) failures.push(`deep dive: expected ${want ?? 'none'}, got ${o.deepDive ?? 'none'}`);
  }
  for (const id of e.retrieved?.mustInclude ?? []) {
    if (!o.retrieved.includes(id)) failures.push(`retrieval: missing ${id}`);
  }
  for (const group of e.answer?.mentionsAll ?? []) {
    if (!group.some((term) => new RegExp(term, 'i').test(reply))) failures.push(`answer: mentions none of [${group.join(' | ')}]`);
  }
  for (const term of e.answer?.mentionsNone ?? []) {
    if (new RegExp(term, 'i').test(reply)) failures.push(`answer: must not mention /${term}/`);
  }
  return { failures, warnings };
}

async function main() {
  const { POST } = await import('../src/app/api/chat/route');
  const { ANSWER_MODEL, ROUTER_MODEL } = await import('../src/lib/models');
  const { getKeysHealthyFirst } = await import('../src/lib/gemini-keys');
  const judgeModel = process.env.JUDGE_MODEL || ROUTER_MODEL;
  const suite: Conversation[] = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'tests/rag-eval/conversations.json'), 'utf8')
  ).conversations.filter((c: Conversation) => !ONLY || ONLY.includes(c.id));

  console.log(`Answer model: ${ANSWER_MODEL} · router: ${ROUTER_MODEL} · grader: ${judgeModel} · ${suite.length} conversations × ${REPEAT}\n`);

  const results: Array<{ id: string; run: number; ok: boolean; infra: boolean; failures: string[]; warnings: string[]; judged?: string; observed: Observed; ms: number }> = [];
  let ip = 0;
  for (const c of suite) {
    for (let run = 1; run <= REPEAT; run++) {
      let observed: Observed = { text: '', tools: [], retrieved: [] };
      let infra = false;
      let ms = 0;
      for (let attempt = 1; attempt <= 3; attempt++) {
        const started = Date.now();
        try {
          const res = await POST(
            new Request('http://localhost/api/chat', {
              method: 'POST',
              // A distinct client IP per request keeps the in-memory rate limiter out of the way
              headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.99.${Math.floor(++ip / 250)}.${ip % 250}` },
              body: JSON.stringify({ messages: c.messages }),
            })
          );
          observed = parseStream(await readBody(res));
          if (res.status !== 200) observed.error = `HTTP ${res.status}`;
          // No finish reason = the model's stream was cut off upstream.
          if (!observed.error && observed.finishReason === 'unknown') observed.error = 'answer stream cut off upstream (no finish reason)';
        } catch (err) {
          observed = { text: '', tools: [], retrieved: [], error: String((err as Error)?.message ?? err) };
        }
        ms = Date.now() - started;
        infra = !!observed.error && TRANSIENT.test(observed.error);
        if (!infra) break;
        await new Promise((r) => setTimeout(r, 5000 * attempt));
      }
      const { failures, warnings } =
        observed.error && !infra
          ? { failures: [`error: ${observed.error.slice(0, 160)}`], warnings: [] }
          : infra
            ? { failures: [], warnings: [] }
            : check(c, observed);
      let judged: string | undefined;
      if (!infra && !observed.error && c.expect.answer?.judge) {
        const verdict = await judge(c.expect.answer.judge, c, replyText(observed), { keys: getKeysHealthyFirst(), model: judgeModel });
        if (!verdict) warnings.push('grader unavailable; meaning not checked');
        else if (!verdict.pass) failures.push(`grader: ${verdict.reason}`);
        else judged = verdict.reason;
      }
      const ok = !infra && failures.length === 0;
      results.push({ id: c.id, run, ok, infra, failures, warnings, judged, observed, ms });
      const status = infra ? 'INFRA' : ok ? 'PASS ' : 'FAIL ';
      console.log(`${status} ${c.id.padEnd(17)} #${run} ${String(ms).padStart(6)}ms  route=${observed.route ?? '-'} tools=${observed.tools.join(',') || '-'} card=${observed.deepDive ?? '-'}`);
      for (const f of failures) console.log(`        ✗ ${f}`);
      for (const w of warnings) console.log(`        ⚠ ${w}`);
      if (infra) console.log(`        ! ${observed.error?.slice(0, 160)}`);
    }
  }

  const scored = results.filter((r) => !r.infra);
  const passed = scored.filter((r) => r.ok).length;
  console.log(`\n──────── Summary (${ANSWER_MODEL}) ────────`);
  console.log(`Passed: ${passed}/${scored.length} runs${results.length - scored.length ? ` (+${results.length - scored.length} infrastructure errors, not scored)` : ''}`);
  const byCase = new Map<string, { pass: number; total: number }>();
  for (const r of scored) {
    const s = byCase.get(r.id) ?? { pass: 0, total: 0 };
    s.total++;
    if (r.ok) s.pass++;
    byCase.set(r.id, s);
  }
  const flaky = [...byCase].filter(([, s]) => s.pass < s.total);
  if (flaky.length) console.log(`Failing: ${flaky.map(([id, s]) => `${id} ${s.pass}/${s.total}`).join(', ')}`);
  const warned = scored.filter((r) => r.warnings.length > 0).length;
  if (warned) console.log(`Warnings: ${warned}/${scored.length} runs (see ⚠ above; not failing)`);
  const median = [...results.map((r) => r.ms)].sort((a, b) => a - b)[Math.floor(results.length / 2)];
  console.log(`Median response: ${median} ms`);

  fs.writeFileSync(
    path.resolve(process.cwd(), 'tests/rag-eval/.last-conversations.json'),
    JSON.stringify({ answerModel: ANSWER_MODEL, routerModel: ROUTER_MODEL, results }, null, 2) + '\n'
  );
  process.exit(passed === scored.length ? 0 : 1);
}

main().catch((err) => {
  console.error('[Conversations] Failed:', err);
  process.exit(1);
});
