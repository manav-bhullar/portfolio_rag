'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { KeyRound, ServerCrash } from 'lucide-react';
import { ShapeIcon } from '@/components/ui/shape-icon';

const Crazy = () => {
  return (
    <div className="mx-auto w-full space-y-8">
      <div>
        <h2 className="text-headline-sm-emphasized text-foreground">
          Engineering War Stories
        </h2>
        <p className="mt-2 text-body-lg text-foreground/80">
          The hacks and system-level deep dives I&apos;ve built when standard solutions weren&apos;t enough.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="rounded-organic bg-accent p-6 sm:p-8 space-y-6"
      >
        <div className="flex items-center gap-4 border-b border-foreground/10 pb-4">
          <ShapeIcon
            restShape="Pentagon"
            background="var(--background)"
            color="var(--accent-piprag)"
          >
            <ServerCrash className="h-6 w-6" />
          </ShapeIcon>
          <h3 className="text-xl font-bold">The Hybrid Interrupt Remote Workspace</h3>
        </div>

        <div className="space-y-4 text-[15px] leading-relaxed text-foreground sm:text-base">
          <p>
            <strong className="text-foreground">The Hook:</strong> I craved the raw horsepower of my Ubuntu server, but the framework I was using lacked native SSH remote support. My initial workaround was to mount the server&apos;s filesystem locally to my Mac using SMB over a Tailscale mesh network. It sounded brilliant in theory.
          </p>
          <p>
            <strong className="text-foreground">The Villain (The Bottleneck):</strong> But I immediately triggered a massive trap. While file editing was instantaneous, executing heavy builds locally on the mounted drive forced my Mac&apos;s CPU to pull thousands of files across the network, compile them, and push them back. My Mac overheated, and the Tailscale network choked under the massive I/O overhead.
          </p>
          <p>
            <strong className="text-foreground">The Investigation &amp; Failed Attempts:</strong> I architected a strict hybrid workflow: file reads on the Mac, but all compute routed through SSH terminal commands directly to the server. But there was a new problem: the SMB connection was incredibly brittle and dropped whenever my laptop slept. I built a software polling script using an <em>Exponential Backoff</em> algorithm to safely remount the drive. It worked, but every time I opened my laptop, I was left staring at a frozen terminal for minutes waiting for the backoff loop to finally reconnect. Software polling was sluggish and frustrating.
          </p>
          <p>
            <strong className="text-foreground">The Climax (The &apos;Aha&apos; Moment):</strong> Frustrated by the lag, I drew inspiration from low-level OS hardware interrupts. If a keyboard doesn&apos;t poll the CPU to ask if a key was pressed, <em>why was my script polling the network?</em> I ripped out the polling loops entirely and engineered a bidirectional, event-driven bridge. On the Mac side, I wired native macOS kernel interrupts (<code>launchd WatchPaths</code>) to instantly trigger a remount the millisecond my Wi-Fi state changed. On the Ubuntu side, I wrote a <code>systemd</code> daemon that monitors kernel routing tables. The exact second the server regains internet, it shoots a microscopic TCP ping over Tailscale back to a custom, 0-CPU Swift socket listener I built on my Mac.
          </p>
          <div className="mt-6 rounded-md bg-background/50 p-4 border border-foreground/10">
            <p className="font-semibold text-foreground">The Transformation (The Payoff):</p>
            <p className="mt-1">
              The result is a flawless, zero-latency remote workspace. It protects my Mac&apos;s CPU from heavy compilation, yet reconnects instantly the exact millisecond my laptop opens or the server boots up. Zero polling, zero wasted CPU—just pure, event-driven engineering.
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
        className="rounded-organic bg-accent p-6 sm:p-8 space-y-6"
      >
        <div className="flex items-center gap-4 border-b border-foreground/10 pb-4">
          <ShapeIcon
            restShape="Burst"
            background="var(--background)"
            color="var(--accent-piprag)"
          >
            <KeyRound className="h-6 w-6" />
          </ShapeIcon>
          <h3 className="text-xl font-bold">The API Key Rotation Hack</h3>
        </div>
        
        <div className="space-y-4 text-[15px] leading-relaxed text-foreground sm:text-base">
          <p>
            Building and scaling my RAG systems and LLM applications, I hit Gemini&apos;s free-tier rate limits fast once real usage kicked in — one key just couldn&apos;t keep up.
          </p>
          <p>
            So instead of paying up, I built a custom API key rotation layer. This portfolio&apos;s own chatbot rotates across <strong>9 Gemini keys</strong> server-side, load-balancing requests across all of them. It first proved out on my RAG project PIP-RAG, scaling free-tier throughput there to <strong>~7,500 requests/day</strong> — completely bypassing the per-key limit with zero downtime.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Crazy;
