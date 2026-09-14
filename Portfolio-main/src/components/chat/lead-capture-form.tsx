'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, CheckCircle2 } from 'lucide-react';
import BookCallButton from './book-call-button';

export function LeadCaptureForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setError('');

    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Try emailing me directly instead.');
        setStatus('error');
        return;
      }

      setStatus('sent');
    } catch {
      setError('Network error — try emailing me directly instead.');
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-organic bg-accent mx-auto flex w-full max-w-lg items-center gap-3 px-5 py-7 sm:px-6"
      >
        <CheckCircle2 className="h-6 w-6 shrink-0" style={{ color: 'var(--accent-floq)' }} />
        <p className="text-sm font-medium text-foreground sm:text-base">
          Got it, {name.split(' ')[0] || 'thanks'} — I&apos;ll get back to you soon.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-organic bg-accent mx-auto w-full max-w-lg px-5 py-7 sm:px-8"
    >
      <h3 className="font-display mb-4 text-xl font-bold text-foreground">
        Let&apos;s talk
      </h3>
      <BookCallButton />
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          name="name"
          autoComplete="name"
          autoCapitalize="words"
          required
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl bg-card px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-[#3FB37F]/40 md:text-sm"
        />
        <input
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          required
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl bg-card px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-[#3FB37F]/40 md:text-sm"
        />
        <textarea
          required
          placeholder="What's this about?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-xl bg-card px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-[#3FB37F]/40 md:text-sm"
        />
        {status === 'error' && (
          <p className="text-sm" style={{ color: 'var(--accent-piprag)' }}>{error}</p>
        )}
        <button
          type="submit"
          disabled={status === 'sending'}
          className="pressable flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background transition-opacity disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
          {status === 'sending' ? 'Sending...' : 'Send'}
        </button>
      </form>
    </motion.div>
  );
}

export default LeadCaptureForm;
