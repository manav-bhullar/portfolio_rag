'use client';

import { useEffect, useState } from 'react';

export type VisitorSource = 'linkedin' | 'github' | 'jobboard' | 'direct';

export interface VisitorContext {
  source: VisitorSource;
  chipOrder: string[];
  subtitleOverride: string | null;
}

/**
 * Detects visitor context from document.referrer and UTM params.
 * Used to reorder landing chips and adapt the hero subtitle on arrival.
 */
export function useVisitorContext(): VisitorContext {
  const [context, setContext] = useState<VisitorContext>({
    source: 'direct',
    chipOrder: ['Me', 'Projects', 'Skills', 'Fun', 'Contact'],
    subtitleOverride: null,
  });

  useEffect(() => {
    const referrer = document.referrer?.toLowerCase() ?? '';
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source')?.toLowerCase() ?? '';
    const utmMedium = params.get('utm_medium')?.toLowerCase() ?? '';

    const isLinkedIn =
      referrer.includes('linkedin.com') ||
      utmSource === 'linkedin' ||
      utmMedium === 'linkedin';

    const isGitHub =
      referrer.includes('github.com') ||
      utmSource === 'github';

    const isJobBoard =
      referrer.includes('indeed.com') ||
      referrer.includes('glassdoor.com') ||
      referrer.includes('naukri.com') ||
      referrer.includes('internshala.com') ||
      referrer.includes('wellfound.com') ||
      referrer.includes('lever.co') ||
      referrer.includes('greenhouse.io') ||
      utmSource === 'recruiter' ||
      utmSource === 'jobboard' ||
      utmMedium === 'resume';

    if (isLinkedIn) {
      setContext({
        source: 'linkedin',
        chipOrder: ['Projects', 'Skills', 'Me', 'Contact', 'Fun'],
        subtitleOverride: 'Full-Stack Engineer · AI/ML · Data Analyst',
      });
    } else if (isJobBoard) {
      setContext({
        source: 'jobboard',
        chipOrder: ['Skills', 'Projects', 'Contact', 'Me', 'Fun'],
        subtitleOverride: "Looking for a strong hire? Let's talk.",
      });
    } else if (isGitHub) {
      setContext({
        source: 'github',
        chipOrder: ['Projects', 'Fun', 'Skills', 'Me', 'Contact'],
        subtitleOverride: 'Builder · Ships full-stack, AI, and data systems.',
      });
    }
  }, []);

  return context;
}
