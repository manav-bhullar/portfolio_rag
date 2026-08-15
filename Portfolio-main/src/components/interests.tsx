'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Dumbbell } from 'lucide-react';

const Interests = () => {
  const interests = [
    {
      icon: <BookOpen className="h-6 w-6" />,
      title: 'Reading',
      description:
        "I read regularly outside of coursework and projects - it's how I keep pulling in ideas from outside whatever tech stack I'm deep in that week.",
    },
    {
      icon: <Dumbbell className="h-6 w-6" />,
      title: 'Fitness',
      description:
        "Training consistently keeps my head clear for the long, deep-focus stretches that projects like Floq or SCALES actually demand.",
    },
  ];

  return (
    <div className="mx-auto w-full">
      <div className="mb-8">
        <h2 className="font-display text-foreground text-3xl font-extrabold md:text-4xl">
          Outside of Code
        </h2>
        <p className="mt-4 text-muted-foreground">
          What keeps me sharp between builds.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {interests.map((interest, index) => (
          <motion.div
            key={interest.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1, ease: 'easeOut' }}
            className="rounded-organic bg-accent p-6"
          >
            <div
              className="shape-card-accent mb-3 flex h-11 w-11 items-center justify-center rounded-full"
              style={{
                ['--card-accent-color' as string]: index === 0 ? 'var(--accent-piprag)' : 'var(--accent-scales)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
              }}
            >
              {interest.icon}
            </div>
            <h3 className="text-foreground text-lg font-semibold">
              {interest.title}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {interest.description}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Interests;
