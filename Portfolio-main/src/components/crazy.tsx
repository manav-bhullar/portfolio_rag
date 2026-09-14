'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { KeyRound } from 'lucide-react';

const Crazy = () => {
  return (
    <div className="mx-auto w-full">
      <div className="mb-5 sm:mb-8">
        <h2 className="font-display text-foreground text-2xl font-extrabold sm:text-3xl md:text-4xl">
          The Key Rotation Hack
        </h2>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="rounded-organic bg-accent p-6 sm:p-8"
      >
        <div
          className="shape-card-accent mb-4 flex h-11 w-11 items-center justify-center rounded-full"
          style={{
            ['--card-accent-color' as string]: 'var(--accent-piprag)',
            backgroundColor: 'var(--background)',
            color: 'var(--foreground)',
          }}
        >
          <KeyRound className="h-6 w-6" />
        </div>
        <p className="text-[15px] leading-relaxed text-foreground sm:text-base">
          Building and scaling my RAG systems and LLM applications, I hit
          Gemini&apos;s free-tier rate limits fast once real usage kicked in - one key
          just couldn&apos;t keep up.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground sm:text-base">
          So instead of paying up, I built a custom API key rotation layer across
          5-6 Gemini keys, load-balancing requests across all of them. That scaled
          free-tier throughput to <strong>~7,500 requests/day</strong> - completely
          bypassing the per-key limit, zero downtime.
        </p>
      </motion.div>
    </div>
  );
};

export default Crazy;
