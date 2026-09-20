'use client';

import { useState, useEffect, useCallback } from 'react';

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

  const loadEggs = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('portfolio_easter_eggs');
        if (stored) {
          const parsed = JSON.parse(stored);
          setFoundEggs(parsed);
          setIsFullyUnlocked(parsed.length >= EGGS.length);
          return parsed;
        }
      } catch {}
    }
    return [];
  }, []);

  useEffect(() => {
    loadEggs();
    
    // Listen for cross-tab or same-tab updates
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'portfolio_easter_eggs') loadEggs();
    };
    const handleCustom = () => loadEggs();
    
    window.addEventListener('storage', handleStorage);
    window.addEventListener('easter-egg-found', handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('easter-egg-found', handleCustom);
    };
  }, [loadEggs]);

  const addEgg = (action: string) => {
    if (!EGGS.includes(action)) {
      return { isNew: false, total: foundEggs.length, max: EGGS.length };
    }

    // Always read fresh from storage to prevent stale closure overwrites
    // which happens when multiple components mount concurrently
    let current = foundEggs;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('portfolio_easter_eggs');
        if (stored) current = JSON.parse(stored);
      } catch {}
    }

    if (!current.includes(action)) {
      const newEggs = [...current, action];
      setFoundEggs(newEggs);
      setIsFullyUnlocked(newEggs.length >= EGGS.length);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('portfolio_easter_eggs', JSON.stringify(newEggs));
        // Dispatch custom event to sync other components (like the header indicator)
        window.dispatchEvent(new Event('easter-egg-found'));
      }
      return { isNew: true, total: newEggs.length, max: EGGS.length };
    }
    
    return { isNew: false, total: current.length, max: EGGS.length };
  };

  return { foundEggs, addEgg, total: EGGS.length, isFullyUnlocked };
}
