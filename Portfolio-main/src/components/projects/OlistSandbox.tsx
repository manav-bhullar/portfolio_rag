'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, AlertTriangle, Star, Code2 } from 'lucide-react';

const QUERIES = [
  'MoM revenue growth (LAG window function)',
  'Average order value (AOV) by state',
  'Top-10 GMV categories',
  'Seller rankings (RANK window function)',
];

export default function OlistSandbox() {
  const [step, setStep] = useState(0);

  const handleNext = () => setStep((s) => (s === 2 ? 0 : s + 1));

  return (
    <div className="w-full rounded-xl border bg-card p-4 shadow-sm mt-6">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="font-semibold tracking-tight">RFM Segmentation &amp; SLA Impact</h4>
        <button
          onClick={handleNext}
          className="rounded-full bg-[#3E8EDE]/10 px-3 py-1 text-sm font-medium text-[#3E8EDE] hover:bg-[#3E8EDE]/20 cursor-pointer"
        >
          {step === 2 ? 'Restart' : 'Next'}
        </button>
      </div>

      {step === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-secondary/50 p-4"
        >
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-[#3E8EDE]" />
            <span className="text-sm font-bold text-foreground">
              RFM segmentation across 96,095 customers
            </span>
          </div>
          <div className="mb-2 h-4 w-full overflow-hidden rounded-full bg-secondary flex">
            <div className="h-full bg-[#3E8EDE]" style={{ width: '48%' }} title="Lost — 48%" />
            <div className="h-full bg-muted-foreground/30" style={{ width: '50%' }} title="Other segments — 50%" />
            <div className="h-full bg-[#3FB37F]" style={{ width: '2%' }} title="Loyal/Champions — 2%" />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span><span className="font-semibold text-[#3E8EDE]">48%</span> Lost</span>
            <span>50% other segments</span>
            <span><span className="font-semibold text-[#3FB37F]">2%</span> Loyal / Champions</span>
          </div>
          <p className="mt-3 text-sm text-foreground">
            Nearly half the customer base has churned — directly informing a re-engagement push targeting 46,000+ lapsed buyers.
          </p>
        </motion.div>
      )}

      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-secondary/50 p-4"
        >
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#F0954A]" />
            <span className="text-sm font-bold text-foreground">Delivery delay vs. satisfaction</span>
          </div>
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Star className="h-3 w-3" /> On-time delivery</span>
                <span className="font-semibold text-foreground">4.1 / 5</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-secondary">
                <div className="h-full rounded-full bg-[#3FB37F]" style={{ width: '82%' }} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Star className="h-3 w-3" /> Late delivery</span>
                <span className="font-semibold text-foreground">2.5 / 5</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-secondary">
                <div className="h-full rounded-full bg-[#F0954A]" style={{ width: '50%' }} />
              </div>
            </div>
          </div>
          <p className="mt-3 text-sm text-foreground">
            A 39% satisfaction drop on late orders — surfacing SLA enforcement as the highest-ROI operational fix.
          </p>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-secondary/50 p-4"
        >
          <div className="mb-3 flex items-center gap-2">
            <Code2 className="h-4 w-4 text-[#3E8EDE]" />
            <span className="text-sm font-bold text-foreground">4 DuckDB SQL queries</span>
          </div>
          <ul className="space-y-1.5 text-sm text-foreground">
            {QUERIES.map((q) => (
              <li key={q} className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#3E8EDE]" />
                {q}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            Feeding a 4-view interactive Tableau Public dashboard (linked below).
          </p>
        </motion.div>
      )}
    </div>
  );
}
