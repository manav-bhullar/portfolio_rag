'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Car, MapPin, RefreshCw } from 'lucide-react';

export default function FloqSandbox() {
  const [step, setStep] = useState(0);

  const points = [
    { id: 'p1', label: 'Rider 1 Pickup', x: 20, y: 30, type: 'pickup' },
    { id: 'd1', label: 'Rider 1 Drop', x: 80, y: 70, type: 'drop' },
    { id: 'p2', label: 'Rider 2 Pickup', x: 30, y: 20, type: 'pickup' },
    { id: 'd2', label: 'Rider 2 Drop', x: 70, y: 80, type: 'drop' },
  ];

  // The naive permutations (some invalid like Drop before Pickup)
  // vs The constrained permutations
  const sequences = [
    { text: 'Generating all 24 permutations (4!)...', valid: false, paths: [] },
    { text: 'Checking: P1 -> D1 -> P2 -> D2 (Valid - but slow)', valid: true, paths: ['p1', 'd1', 'p2', 'd2'] },
    { text: 'Checking: D1 -> P1... (INVALID: Drop before Pickup. Pruning subtree!)', valid: false, paths: ['d1', 'p1'] },
    { text: 'Checking: P1 -> P2 -> D1 -> D2 (Valid - Optimal Route found)', valid: true, paths: ['p1', 'p2', 'd1', 'd2'], optimal: true },
  ];

  const handleNextStep = () => {
    if (step < sequences.length - 1) {
      setStep(prev => prev + 1);
    } else {
      setStep(0);
    }
  };

  return (
    <div className="w-full rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="font-semibold tracking-tight">Constrained Backtracking Visualization</h4>
        <button
          onClick={handleNextStep}
          className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary hover:bg-primary/20 cursor-pointer"
        >
          {step === sequences.length - 1 ? <RefreshCw className="h-4 w-4" /> : 'Next Step'}
        </button>
      </div>

      <div className="relative h-48 w-full rounded-lg bg-secondary/50 p-2 overflow-hidden border border-border/50">
        {/* Draw lines for the current path */}
        <svg className="absolute inset-0 h-full w-full pointer-events-none">
          {sequences[step].paths.map((pointId, idx) => {
            if (idx === 0) return null;
            const prevPoint = points.find(p => p.id === sequences[step].paths[idx - 1]);
            const currPoint = points.find(p => p.id === pointId);
            if (!prevPoint || !currPoint) return null;

            return (
              <motion.line
                key={`${prevPoint.id}-${currPoint.id}`}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5 }}
                x1={`${prevPoint.x}%`}
                y1={`${prevPoint.y}%`}
                x2={`${currPoint.x}%`}
                y2={`${currPoint.y}%`}
                stroke="currentColor"
                strokeWidth="2"
                className="text-primary/50"
                strokeDasharray="4 4"
              />
            );
          })}
        </svg>

        {/* Draw points */}
        {points.map((point) => (
          <div
            key={point.id}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full p-1.5 ${
              point.type === 'pickup' ? 'bg-blue-500/20 text-blue-500' : 'bg-green-500/20 text-green-500'
            }`}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            title={point.label}
          >
            <MapPin className="h-4 w-4" />
          </div>
        ))}
        
        {/* Draw Car */}
        {sequences[step].paths.length > 0 && (
          <motion.div
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary p-2 text-primary-foreground shadow-lg"
            animate={{
              left: `${points.find(p => p.id === sequences[step].paths[sequences[step].paths.length - 1])?.x}%`,
              top: `${points.find(p => p.id === sequences[step].paths[sequences[step].paths.length - 1])?.y}%`,
            }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          >
            <Car className="h-4 w-4" />
          </motion.div>
        )}
      </div>

      <div className="mt-4 rounded-lg bg-secondary p-3">
        <p className={`text-sm font-medium ${sequences[step].optimal ? 'text-green-500' : !sequences[step].valid && sequences[step].paths.length > 0 ? 'text-destructive' : 'text-foreground'}`}>
          {sequences[step].text}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {step === 0 ? "Permutations: (2n)! -> 40,320 states." : "Pruning invalid paths (Drop before Pickup) reduces search space to 2,520."}
        </p>
      </div>
    </div>
  );
}
