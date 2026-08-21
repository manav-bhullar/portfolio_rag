'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { ProjectCard } from './ProjectCard';
import { ProjectContent, projectCards } from './Data';

export function ProjectsCarousel() {
  const [openId, setOpenId] = useState<string | null>(null);
  const openProject = projectCards.find((p) => p.id === openId);

  return (
    <div className="relative w-full">
      <div className="flex w-full gap-4 overflow-x-auto py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {projectCards.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onOpen={() => setOpenId(project.id)}
          />
        ))}
      </div>

      <AnimatePresence>
        {openProject && (
          <div className="fixed inset-0 z-52 h-[100dvh] overflow-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 h-full w-full bg-black/50 backdrop-blur-sm"
              onClick={() => setOpenId(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="relative z-[60] mx-4 my-4 sm:mx-auto sm:my-8 md:my-10 h-fit max-w-2xl rounded-2xl sm:rounded-3xl bg-card p-5 sm:p-7 md:p-10 shadow-2xl"
            >
              <button
                className="absolute top-4 right-4 sm:top-6 sm:right-6 flex h-8 w-8 items-center justify-center rounded-full bg-secondary hover:bg-secondary/70"
                onClick={() => setOpenId(null)}
                aria-label="Close"
              >
                <X className="h-4 w-4 text-foreground" />
              </button>

              <div className="mb-6 flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: `var(--accent-${openProject.accent}-soft)`,
                    color: `var(--accent-${openProject.accent})`,
                  }}
                >
                  <openProject.icon className="h-5 w-5" strokeWidth={2.2} />
                </div>
                <h2 className="font-display text-2xl font-bold text-foreground">
                  {openProject.title}
                </h2>
              </div>

              <ProjectContent project={{ title: openProject.title }} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ProjectsCarousel;
