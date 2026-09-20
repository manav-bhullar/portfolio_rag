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

  // Log to server logs as a backup so nothing is silently dropped
  console.log('[Lead]', JSON.stringify({ name, email, message, at: new Date().toISOString() }));

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'onboarding@resend.dev'; // Fallback to Resend default

  if (RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Portfolio Contact Form <onboarding@resend.dev>', // You can change this to a verified domain
          to: CONTACT_EMAIL, 
          subject: `New Portfolio Lead from ${name}`,
          text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[Lead] Resend error:', errorText);
      }
    } catch (error) {
      console.error('[Lead] Failed to send email via Resend:', error);
    }
  } else {
    console.warn('[Lead] RESEND_API_KEY is not configured. Email was not sent (only logged).');
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
