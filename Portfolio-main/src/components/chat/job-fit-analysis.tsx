'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, CircleAlert, FileText, PenLine } from 'lucide-react';

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

export function JobFitAnalysis({
  result,
  jobDescription,
}: {
  result: JobFitResult;
  jobDescription?: string;
}) {
  const color = scoreColor(result.matchScore);

  const handleDraftCoverLetter = () => {
    if (!jobDescription) return;
    window.dispatchEvent(
      new CustomEvent('chat:submit', {
        detail: `Draft a cover letter for this role:\n\n${jobDescription}`,
      })
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      className="mx-auto w-full max-w-2xl"
    >
      <div className="rounded-organic bg-accent overflow-hidden px-5 py-7 sm:px-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
            Job Fit Analysis
          </h2>
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-base font-extrabold text-white sm:h-16 sm:w-16 sm:text-lg"
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
          className="group pressable flex min-h-12 items-center justify-between gap-3 rounded-xl bg-card p-4 transition-colors hover:bg-card/70"
        >
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              Recommended: {result.recommendedResume} resume
            </span>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">Download</span>
        </a>

        {jobDescription && (
          <button
            onClick={handleDraftCoverLetter}
            className="group pressable mt-3 flex min-h-12 w-full items-center justify-between gap-3 rounded-xl bg-card p-4 transition-colors hover:bg-card/70"
          >
            <div className="flex min-w-0 items-center gap-2">
              <PenLine className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                Draft a cover letter for this role
              </span>
            </div>
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default JobFitAnalysis;
