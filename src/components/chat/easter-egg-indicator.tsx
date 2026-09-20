'use client';

import { useEffect, useState } from 'react';
import { useEasterEggs } from '@/hooks/use-easter-eggs';
import { motion, AnimatePresence } from 'framer-motion';

export default function EasterEggIndicator() {
  const { foundEggs, total } = useEasterEggs();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // We only want to show the indicator temporarily when a NEW egg is discovered.
    let timeout: NodeJS.Timeout;
    
    const handleEggFound = () => {
      setIsVisible(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setIsVisible(false);
      }, 5000); // Hide after 5 seconds
    };

    window.addEventListener('easter-egg-found', handleEggFound);
    return () => {
      window.removeEventListener('easter-egg-found', handleEggFound);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.8, x: 20 }}
          className="hidden sm:flex pointer-events-auto h-11 items-center justify-center rounded-full bg-accent/50 px-3 text-sm font-medium text-muted-foreground mr-1"
          title={`${foundEggs.length} out of ${total} Easter eggs found`}
        >
          <span className="mr-1.5">🥚</span>
          {foundEggs.length}/{total}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
