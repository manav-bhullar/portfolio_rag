'use client';

import { useState, useEffect } from 'react';

const EGGS = [
  'sudo_rm_rf',
  'tabs_vs_spaces',
  'console_log',
  'deploy_on_friday',
  'prompt_injection'
];

export function useEasterEggs() {
  const [foundEggs, setFoundEggs] = useState<string[]>([]);
  const [isFullyUnlocked, setIsFullyUnlocked] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('portfolio_easter_eggs');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setFoundEggs(parsed);
          if (parsed.length >= EGGS.length) {
            setIsFullyUnlocked(true);
          }
        } catch (e) {}
      }
    }
  }, []);

  const addEgg = (action: string) => {
    if (EGGS.includes(action) && !foundEggs.includes(action)) {
      const newEggs = [...foundEggs, action];
      setFoundEggs(newEggs);
      if (typeof window !== 'undefined') {
        localStorage.setItem('portfolio_easter_eggs', JSON.stringify(newEggs));
      }
      return { isNew: true, total: newEggs.length, max: EGGS.length };
    }
    return { isNew: false, total: foundEggs.length, max: EGGS.length };
  };

  return { foundEggs, addEgg, total: EGGS.length, isFullyUnlocked };
}
