'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Download, FileText } from 'lucide-react';

export function CoverLetterResult({ letter }: { letter: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard access denied — button just won't confirm, no crash
    }
  };

  const handleDownload = () => {
    const blob = new Blob([letter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Manav_Bhullar_Cover_Letter.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      className="mx-auto w-full max-w-2xl"
    >
      <div className="rounded-organic bg-accent overflow-hidden px-5 py-7 sm:px-8">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
            Cover Letter Draft
          </h2>
        </div>

        <div className="mb-5 whitespace-pre-wrap rounded-xl bg-card p-4 text-sm leading-relaxed text-foreground sm:text-base">
          {letter}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCopy}
            className="pressable flex min-h-11 items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="pressable flex min-h-11 items-center gap-2 rounded-xl bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-card/70"
          >
            <Download className="h-4 w-4" />
            Download .txt
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default CoverLetterResult;
