import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { projectCards } from '@/components/projects/Data';

const TITLE_TO_SLUG: Record<string, string> = {
  Floq: 'floq',
  'SCALES v3.0': 'scales',
  'AI Portfolio RAG': 'ai-portfolio-rag',
  'Olist Analytics': 'olist-analytics',
  'NYC Taxi Analytics': 'nyc-taxi-analytics',
};

export const metadata: Metadata = {
  title: 'Projects | Manav Bhullar',
  description: "Real-time systems, RAG pipelines, and data analytics projects built by Manav Bhullar.",
};

export default function ProjectsIndexPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="font-display mb-8 text-3xl font-extrabold text-foreground sm:text-4xl">
        Projects
      </h1>

      <div className="space-y-4">
        {projectCards.map((card) => {
          const slug = TITLE_TO_SLUG[card.title];
          if (!slug) return null;
          return (
            <Link
              key={card.id}
              href={`/projects/${slug}`}
              className="group flex items-center justify-between rounded-2xl bg-secondary p-5 transition-colors hover:bg-secondary/70"
            >
              <div>
                <h2 className="mb-1 text-lg font-bold text-foreground">{card.title}</h2>
                <p className="text-sm text-muted-foreground">{card.blurb}</p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
