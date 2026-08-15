'use client';

import { motion } from 'framer-motion';
import React from 'react';

export function Presentation() {
  // Personal information
  const profile = {
    name: 'Manav Bhullar',
    age: 'B.E. Computer Engineering, 2023–2027',
    location: 'Patiala, Punjab, India',
    // Add a newline character after the emoji
    description:
      "Hey 👋\nI'm Manav Bhullar. I build across three domains - full-stack web dev (MERN), data analytics, and AI/ML - at Thapar Institute of Engineering and Technology. I ship production-grade systems: distributed locks, RAG pipelines, BigQuery over millions of rows. Outside of code, I'm big on reading and fitness.",
  };

  // Animation variants for text elements
  const textVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' },
    },
  } as const;

  // Animation for the entire paragraph rather than word-by-word
  const paragraphAnimation = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
        delay: 0.2,
      },
    },
  } as const;

  return (
    <div className="mx-auto w-full max-w-2xl py-6 font-sans">
      <div className="flex flex-col">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={textVariants}
          >
            <h1 className="font-display text-3xl font-extrabold text-foreground md:text-4xl">
              {profile.name}
            </h1>
            <div className="mt-1 flex flex-col gap-1 md:flex-row md:items-center md:gap-4">
              <p className="text-muted-foreground">{profile.age}</p>
              <div className="bg-border hidden h-1.5 w-1.5 rounded-full md:block" />
              <p className="text-muted-foreground">{profile.location}</p>
            </div>
          </motion.div>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={paragraphAnimation}
            className="text-foreground mt-6 leading-relaxed whitespace-pre-line"
          >
            {profile.description}
          </motion.p>

          {/* Tags/Keywords */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-4 flex flex-wrap gap-2"
          >
            {['AI/ML', 'Full-Stack', 'Data Analytics', 'Builder'].map(
              (tag) => (
                <span
                  key={tag}
                  className="bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-sm"
                >
                  {tag}
                </span>
              )
            )}
          </motion.div>
      </div>
    </div>
  );
}

export default Presentation;
