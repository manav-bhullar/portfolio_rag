'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Search } from 'lucide-react';
import { useRef, useState } from 'react';
import type { Variants } from 'framer-motion';

interface SearchFormProps {
  goToChat: (query: string) => void;
  bottomElementVariants: Variants;
}

export default function SearchForm({ goToChat, bottomElementVariants }: SearchFormProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <motion.form
      variants={bottomElementVariants}
      initial="hidden"
      animate="visible"
      onSubmit={(e) => {
        e.preventDefault();
        if (input.trim()) goToChat(input.trim());
      }}
      className="w-full max-w-lg"
    >
      <div className="flex items-center gap-2 rounded-full border border-border bg-background py-2 pr-2 pl-4 sm:pl-5 transition-all focus-within:scale-[1.02] focus-within:border-[#3FB37F] focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.12)] focus-within:ring-4 focus-within:ring-[#3FB37F]/10">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Ask about my computer engineering work"
          placeholder="Ask me anything..."
          className="w-full border-none bg-transparent py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <motion.button
          type="submit"
          disabled={!input.trim()}
          aria-label="Submit question"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          className="flex shrink-0 cursor-pointer items-center justify-center rounded-full bg-foreground p-2 text-primary-foreground transition-colors hover:bg-[#3FB37F] disabled:opacity-40 disabled:hover:bg-foreground"
        >
          <ArrowRight className="h-4 w-4" />
        </motion.button>
      </div>
    </motion.form>
  );
}
