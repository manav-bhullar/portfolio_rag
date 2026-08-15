'use client';

import { motion } from 'framer-motion';
import React from 'react';

interface ChatLandingProps {
  submitQuery: (query: string) => void;
}

const ChatLanding: React.FC<ChatLandingProps> = ({ submitQuery }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.96 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 220, damping: 20 },
    },
  } as const;

  return (
    <motion.div
      className="flex w-full flex-col items-center px-4 py-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div
        variants={itemVariants}
        className="rounded-organic max-w-md bg-card px-8 py-7 text-center shadow-[0_12px_30px_-10px_rgba(25,25,25,0.1)]"
      >
        <div className="mb-2 text-2xl">👋</div>
        <p className="text-foreground">
          Hi! I&apos;m Manav, specialized in full-stack, data analytics, and
          AI/ML. Ask me anything — let me show you my creations!
        </p>
        <button
          onClick={() =>
            submitQuery(
              'What are your projects? What are you working on right now?'
            )
          }
          className="mt-4 cursor-pointer rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Tell me about your projects!
        </button>
      </motion.div>
    </motion.div>
  );
};

export default ChatLanding;
