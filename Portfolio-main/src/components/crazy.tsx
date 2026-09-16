'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { KeyRound } from 'lucide-react';
import { ShapeIcon } from '@/components/ui/shape-icon';

const Crazy = () => {
  return (
    <div className="mx-auto w-full">
      <div className="mb-5 sm:mb-8">
        <h2 className="text-headline-sm-emphasized text-foreground">
          The Zero-Polling Remote Workspace
        </h2>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="rounded-organic bg-accent p-6 sm:p-8"
      >
        <ShapeIcon
          restShape="Hexagon"
          className="mb-4"
          background="var(--background)"
          color="var(--accent-piprag)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        </ShapeIcon>
        <p className="text-[15px] leading-relaxed text-foreground sm:text-base">
          Building my portfolio with Antigravity 2.0 (which lacked remote SSH support), I mounted an Ubuntu server over SMB via a Tailscale mesh network. When the connection occasionally dropped, I initially built an automated cron script with an Exponential Backoff polling algorithm to remount it safely.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground sm:text-base">
          But polling meant waiting minutes to reconnect. Drawing inspiration from <strong>OS hardware interrupts</strong>, I engineered a bidirectional event-driven architecture. I hooked native macOS `launchd` kernel interrupts (WatchPaths) to remount on Wi-Fi state changes, and built a systemd daemon on Ubuntu that monitors routing tables (`ip monitor route`) to fire a microscopic TCP ping over Tailscale back to a 0-CPU Swift listener on the Mac.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground sm:text-base">
          <strong>Result:</strong> A flawless remote development environment that reconnects instantly the exact millisecond either the laptop opens or the remote server boots up. Zero polling.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
        className="rounded-organic bg-accent mt-6 p-6 sm:p-8"
      >
        <ShapeIcon
          restShape="Burst"
          className="mb-4"
          background="var(--background)"
          color="var(--accent-piprag)"
        >
          <KeyRound className="h-6 w-6" />
        </ShapeIcon>
        <h3 className="text-lg font-bold mb-2">The Key Rotation Hack</h3>
        <p className="text-[15px] leading-relaxed text-foreground sm:text-base">
          Building and scaling my RAG systems and LLM applications, I hit
          Gemini&apos;s free-tier rate limits fast once real usage kicked in - one key
          just couldn&apos;t keep up.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground sm:text-base">
          So instead of paying up, I built a custom API key rotation layer - this
          portfolio&apos;s own chatbot rotates across <strong>9 Gemini keys</strong> server-side,
          load-balancing requests across all of them. It first proved out on my RAG
          project PIP-RAG, scaling free-tier throughput there to <strong>~7,500 requests/day</strong> -
          completely bypassing the per-key limit, zero downtime.
        </p>
      </motion.div>
    </div>
  );
};

export default Crazy;
