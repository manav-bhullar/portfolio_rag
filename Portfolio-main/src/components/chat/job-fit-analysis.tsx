'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, CircleAlert, FileText } from 'lucide-react';

export interface JobFitResult {
  matchScore: number;
  matchedSkills: string[];
  gaps: string[];
  recommendedResume: 'Software Engineering' | 'AI/ML' | 'Data Analyst';
  pitch: string;
}

const RESUME_URLS: Record<JobFitResult['recommendedResume'], string> = {
  'Software Engineering': '/Manav_Bhullar_SDE_Resume.pdf',
  'AI/ML': '/Manav_Bhullar_AIML_Resume.pdf',
  'Data Analyst': '/Manav_Bhullar_DataAnalyst_Resume.pdf',
};

function scoreColor(score: number): string {
  if (score >= 75) return 'var(--accent-floq)';
  if (score >= 45) return 'var(--accent-scales)';
  return 'var(--accent-nyctaxi)';
}

export function JobFitAnalysis({ result }: { result: JobFitResult }) {
  const color = scoreColor(result.matchScore);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      className="mx-auto w-full max-w-2xl"
    >
      <div className="rounded-organic bg-accent overflow-hidden px-6 py-7 sm:px-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl font-bold text-foreground">
            Job Fit Analysis
          </h2>
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-lg font-extrabold text-white"
            style={{ backgroundColor: color }}
          >
            {result.matchScore}%
          </div>
        </div>

        <p className="mb-6 text-sm leading-relaxed text-foreground sm:text-base">
          {result.pitch}
        </p>

        {result.matchedSkills.length > 0 && (
          <div className="mb-5">
            <h3 className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
              Where I match
            </h3>
            <ul className="space-y-1.5">
              {result.matchedSkills.map((skill) => (
                <li key={skill} className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--accent-floq)' }} />
                  <span>{skill}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.gaps.length > 0 && (
          <div className="mb-5">
            <h3 className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
              Honest gaps
            </h3>
            <ul className="space-y-1.5">
              {result.gaps.map((gap) => (
                <li key={gap} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--accent-piprag)' }} />
                  <span>{gap}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <a
          href={RESUME_URLS[result.recommendedResume]}
          download
          className="group flex items-center justify-between rounded-xl bg-card p-4 transition-colors hover:bg-card/70"
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              Recommended: {result.recommendedResume} resume
            </span>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">Download</span>
        </a>
      </div>
    </motion.div>
  );
}

export default JobFitAnalysis;
