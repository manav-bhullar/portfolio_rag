'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, Filter, Clock, TrendingUp, CreditCard } from 'lucide-react';

const STAGES = [
  {
    icon: Database,
    label: 'Ingest',
    text: '9.38M raw NYC taxi trips (Jan–Mar 2023), streamed in via PyArrow iter_batches() chunked reads.',
    metric: '9.38M rows',
  },
  {
    icon: Filter,
    label: 'Clean',
    text: 'IQR-based outlier capping on fare and distance strips out bad meter readings and GPS glitches.',
    metric: '540K clean rows',
  },
  {
    icon: Clock,
    label: 'Demand',
    text: 'Citywide peak lands Thursday 6PM. Nightlife-zone surges hit Saturday 1AM — well above the weekday baseline.',
    metric: '260–490 trips/hr',
  },
  {
    icon: TrendingUp,
    label: 'Surge Proxy',
    text: '3 BigQuery CTEs compute PERCENTILE_CONT(0.9) per zone as a surge-pricing proxy, flagging the top 20 high-frequency windows.',
    metric: '90th percentile / zone',
  },
  {
    icon: CreditCard,
    label: 'Payments',
    text: 'Card trips average a 25.2% tip. Cash trips record $0.00 — invisible tipping, not zero tipping.',
    metric: '25.2% vs $0.00',
  },
];

export default function NYCTaxiSandbox() {
  const [step, setStep] = useState(0);
  const stage = STAGES[step];
  const Icon = stage.icon;

  const handleNext = () => setStep((s) => (s === STAGES.length - 1 ? 0 : s + 1));

  return (
    <div className="w-full rounded-xl border bg-card p-4 shadow-sm mt-6">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="font-semibold tracking-tight">Trip Pipeline Walkthrough</h4>
        <button
          onClick={handleNext}
          className="rounded-full bg-[#8B5FE0]/10 px-3 py-1 text-sm font-medium text-[#8B5FE0] hover:bg-[#8B5FE0]/20 cursor-pointer"
        >
          {step === STAGES.length - 1 ? 'Restart' : 'Next Stage'}
        </button>
      </div>

      <div className="mb-3 flex items-center gap-2">
        {STAGES.map((s, i) => (
          <div
            key={s.label}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= step ? 'bg-[#8B5FE0]' : 'bg-secondary'
            }`}
          />
        ))}
      </div>

      <motion.div
        key={step}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-lg bg-secondary/50 p-4"
      >
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8B5FE0]/15 text-[#8B5FE0]">
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold text-foreground">{stage.label}</span>
          <span className="ml-auto rounded-full bg-[#8B5FE0]/10 px-2.5 py-0.5 text-xs font-semibold text-[#8B5FE0]">
            {stage.metric}
          </span>
        </div>
        <p className="text-sm text-foreground">{stage.text}</p>
      </motion.div>
    </div>
  );
}
