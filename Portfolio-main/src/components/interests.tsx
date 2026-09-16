'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Dumbbell } from 'lucide-react';
import { ShapeIcon } from '@/components/ui/shape-icon';

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
      <div className="mb-5 sm:mb-8">
        <h2 className="text-headline-sm-emphasized text-foreground">
          Outside of Code
        </h2>
        <p className="mt-2 text-muted-foreground sm:mt-4">
          What keeps me sharp between builds.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {interests.map((interest, index) => (
          <motion.div
            key={interest.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1, ease: 'easeOut' }}
            className="rounded-organic bg-accent p-5 sm:p-6"
          >
            <ShapeIcon
              restShape={index === 0 ? 'Clover4Leaf' : 'Cookie6Sided'}
              className="mb-3"
              background="var(--background)"
              color={index === 0 ? 'var(--accent-piprag)' : 'var(--accent-scales)'}
            >
              {interest.icon}
            </ShapeIcon>
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
