'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame } from 'lucide-react';

export default function TrendingTicker() {
  const [queries, setQueries] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetch('/api/trending')
      .then((res) => res.json())
      .then((data) => {
        if (data.trending && data.trending.length > 0) {
          setQueries(data.trending);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (queries.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % queries.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [queries]);

  if (queries.length === 0) return null;

  return (
    <div className="flex h-8 items-center justify-center overflow-hidden text-sm text-muted-foreground mt-4">
      <Flame className="mr-2 h-4 w-4 text-orange-500 shrink-0" />
      <span className="mr-2 font-medium">Trending:</span>
      <div className="relative h-full w-full max-w-[200px] sm:max-w-xs flex-1">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={currentIndex}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute inset-0 flex items-center truncate italic"
          >
            &quot;{queries[currentIndex]}&quot;
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
