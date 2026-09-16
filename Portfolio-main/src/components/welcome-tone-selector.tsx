'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Code2, Coffee, X } from 'lucide-react';

export default function WelcomeToneSelector() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hasSelected = localStorage.getItem('portfolio_visitor_type');
    if (!hasSelected) {
      // Small delay to not overwhelm the initial load animation
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSelect = (type: string) => {
    localStorage.setItem('portfolio_visitor_type', type);
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg rounded-2xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur-md sm:bottom-8 sm:p-5"
        >
          <button
            onClick={() => handleSelect('curious')}
            className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-muted"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="mb-4 pr-6">
            <h3 className="font-display text-base font-bold text-foreground">
              Customize your experience
            </h3>
            <p className="text-sm text-muted-foreground">
              Who are you? I'll adjust my tone and the information I highlight.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              onClick={() => handleSelect('recruiter')}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-background p-3 text-center transition-colors hover:border-[#3FB37F] hover:bg-[#3FB37F]/5"
            >
              <Briefcase className="h-5 w-5 text-[#3FB37F]" />
              <span className="text-xs font-semibold">Recruiter / Hiring</span>
            </button>
            <button
              onClick={() => handleSelect('developer')}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-background p-3 text-center transition-colors hover:border-[#3E8EDE] hover:bg-[#3E8EDE]/5"
            >
              <Code2 className="h-5 w-5 text-[#3E8EDE]" />
              <span className="text-xs font-semibold">Developer</span>
            </button>
            <button
              onClick={() => handleSelect('curious')}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-background p-3 text-center transition-colors hover:border-[#F0954A] hover:bg-[#F0954A]/5"
            >
              <Coffee className="h-5 w-5 text-[#F0954A]" />
              <span className="text-xs font-semibold">Just Curious</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
