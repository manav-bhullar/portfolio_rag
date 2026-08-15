'use client';

import WelcomeModal from '@/components/welcome-modal';
import { motion } from 'framer-motion';
import { ArrowRight, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import GitHubButton from 'react-github-btn';

/* ---------- quick-question data ---------- */
const questions = {
  Me: 'Who are you? I want to know more about you.',
  Projects: 'What are your projects? What are you working on right now?',
  Skills: 'What are your skills? Give me a list of your soft and hard skills.',
  Fun: 'What’s the craziest thing you’ve ever done? What are your hobbies?',
  Contact:
    'How can I reach you? What kind of project would make you say "yes" immediately?',
} as const;

const questionConfig = [
  { key: 'Me', filled: true },
  { key: 'Projects', filled: false },
  { key: 'Skills', filled: false },
  { key: 'Fun', filled: false },
  { key: 'Contact', filled: false },
] as const;

/* ---------- component ---------- */
export default function Home() {
  const [input, setInput] = useState('');
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const goToChat = (query: string) =>
    router.push(`/chat?query=${encodeURIComponent(query)}`);

  const topElementVariants = {
    hidden: { opacity: 0, y: -30, scale: 0.96 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 200, damping: 20 },
    },
  } as const;

  const bottomElementVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { ease: 'easeOut', duration: 0.6, delay: 0.15 },
    },
  } as const;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-16">
      {/* Responsive wavy clip-path (objectBoundingBox = scales with element size) */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <clipPath id="hero-wave-clip" clipPathUnits="objectBoundingBox">
            <path d="M0.03,0.09 C0.08,0.02 0.22,0.04 0.34,0.02 C0.46,0 0.58,0.03 0.68,0.01 C0.8,-0.01 0.93,0.03 0.97,0.11 C0.99,0.18 0.96,0.26 0.98,0.34 C1,0.42 0.99,0.5 0.99,0.58 C0.99,0.68 1,0.78 0.96,0.87 C0.92,0.96 0.8,0.97 0.7,0.99 C0.6,1.01 0.48,0.98 0.37,0.99 C0.26,1 0.14,1.01 0.06,0.94 C-0.01,0.87 0.02,0.76 0.01,0.67 C0,0.58 0.02,0.49 0.01,0.4 C0,0.3 -0.01,0.18 0.03,0.09 Z" />
          </clipPath>
        </defs>
      </svg>

      {/* GitHub button */}
      <div className="absolute top-6 right-8 z-20">
        <GitHubButton
          href="https://github.com/manav-bhullar"
          data-color-scheme="no-preference: light; light: light; dark: light_high_contrast;"
          data-size="large"
          data-show-count="true"
          aria-label="Visit manav-bhullar on GitHub"
        >
          Star
        </GitHubButton>
      </div>

      <div className="absolute top-6 left-8 z-20">
        <WelcomeModal />
      </div>

      {/* Organic hero container */}
      <motion.div
        variants={topElementVariants}
        initial="hidden"
        animate="visible"
        className="shape-blob-hero relative z-10 flex w-full max-w-3xl flex-col items-center gap-6 bg-card px-8 py-16 text-center shadow-[0_20px_60px_-15px_rgba(25,25,25,0.12)] sm:px-16"
      >
        <div>
          <p className="text-sm font-bold tracking-[0.15em] text-muted-foreground uppercase">
            Let&apos;s build something impactful.
          </p>
          <h1 className="font-display mt-2 text-6xl leading-[0.95] font-black tracking-tight text-foreground sm:text-7xl md:text-8xl">
            Ask about my work.
          </h1>
        </div>

        {/* free-form question */}
        <motion.form
          variants={bottomElementVariants}
          initial="hidden"
          animate="visible"
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) goToChat(input.trim());
          }}
          className="w-full max-w-lg"
        >
          <div className="flex items-center gap-2 rounded-full border border-border bg-background py-2.5 pr-2 pl-5 transition-colors focus-within:border-[#3FB37F]">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me about my computer engineering work..."
              className="w-full border-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Submit question"
              className="flex shrink-0 items-center justify-center rounded-full bg-foreground p-2 text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.form>

        {/* quick-question chips */}
        <motion.div
          variants={bottomElementVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-wrap items-center justify-center gap-2"
        >
          {questionConfig.map(({ key, filled }) => (
            <button
              key={key}
              onClick={() => goToChat(questions[key])}
              className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-transform active:scale-95 ${
                filled
                  ? 'bg-foreground text-primary-foreground'
                  : 'border border-border bg-card text-foreground hover:bg-secondary'
              }`}
            >
              {key}
            </button>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
