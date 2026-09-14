'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ShieldCheck } from 'lucide-react';


export default function ScalesSandbox() {
  const [step, setStep] = useState(0);

  const steps = [
    { name: "CERA", desc: "Concept Extraction (LLM)", status: 'pending' },
    { name: "CGR", desc: "Concept Grading", status: 'pending' },
    { name: "CBTE", desc: "Trust Estimation (NLI)", status: 'pending' }
  ];

  const handleRun = () => {
    setStep(1);
    setTimeout(() => setStep(2), 1000);
    setTimeout(() => setStep(3), 2000);
    setTimeout(() => setStep(4), 3000);
  };

  const handleReset = () => setStep(0);

  return (
    <div className="w-full rounded-xl border bg-card p-4 shadow-sm mt-6">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="font-semibold tracking-tight">CBTE Grading Pipeline (Simplified)</h4>
        <button
          onClick={step === 4 ? handleReset : handleRun}
          disabled={step > 0 && step < 4}
          className="flex items-center gap-2 rounded-full bg-[#F0954A]/10 px-3 py-1 text-sm font-medium text-[#F0954A] hover:bg-[#F0954A]/20 cursor-pointer disabled:opacity-50"
        >
          {step === 4 ? 'Reset' : step > 0 ? 'Processing...' : 'Run Pipeline'}
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${step > i ? 'border-[#3FB37F] bg-[#3FB37F]/10 text-[#3FB37F]' : 'border-muted bg-secondary text-muted-foreground'}`}>
              {step > i ? <CheckCircle2 className="h-5 w-5" /> : <span>{i + 1}</span>}
            </div>
            
            <div className={`flex-1 rounded-lg border p-3 transition-colors ${step === i + 1 ? 'border-primary bg-primary/5' : 'bg-card'}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{s.name}</span>
                {step === i + 1 && (
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="h-2 w-2 rounded-full bg-primary"
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
              
              {/* Step specifics */}
              {i === 0 && step > 0 && (
                <div className="mt-2 text-xs bg-secondary p-2 rounded text-foreground">
                  Extracted: <span className="font-mono text-[#F0954A]">&quot;mitochondria produces energy&quot;</span>
                </div>
              )}
              {i === 1 && step > 1 && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="text-green-500 font-semibold">Score: 1.0</span> (Matches rubric)
                </div>
              )}
              {i === 2 && step > 2 && (
                <div className="mt-2 text-xs flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-[#3FB37F]" />
                  <span className="text-[#3FB37F] font-semibold">Trust: 0.92</span> (NLI Entailment Confirmed)
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
