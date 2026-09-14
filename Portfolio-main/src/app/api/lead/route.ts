import { z } from 'zod';
import { checkRateLimit } from '@/lib/ratelimit';

export const runtime = 'edge';

const LeadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(160),
  message: z.string().trim().min(1).max(2000),
});

export async function POST(req: Request) {
  const rateLimit = await checkRateLimit(req);
  if (!rateLimit.success) {
    const retryAfter = rateLimit.retryAfter ?? Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000));
    return new Response(
      JSON.stringify({ error: `Too many requests. Try again in ${retryAfter}s.` }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 });
  }

  const parsed = LeadSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'Please fill in a valid name, email, and message.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { name, email, message } = parsed.data;

  // No email/CRM service is configured yet (no RESEND/SENDGRID key, no lead
  // storage backend) — this logs to server logs as a first pass so nothing
  // is silently dropped. Wire in real delivery once a service is chosen.
  console.log('[Lead]', JSON.stringify({ name, email, message, at: new Date().toISOString() }));

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
