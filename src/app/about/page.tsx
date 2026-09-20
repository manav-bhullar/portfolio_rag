import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { KNOWLEDGE_BASE } from '@/lib/rag/knowledge-base';

export const metadata: Metadata = {
  title: 'About | Manav Bhullar',
  description:
    'Manav Bhullar is a Computer Engineering student at Thapar Institute of Engineering and Technology, building full-stack, AI/ML, and data analytics systems.',
};

export default function AboutPage() {
  const aboutDoc = KNOWLEDGE_BASE.find((doc) => doc.id === 'about-me');

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="font-display mb-6 text-3xl font-extrabold text-foreground sm:text-4xl">
        About Manav
      </h1>

      {aboutDoc?.content.split('\n\n').map((paragraph, i) => (
        <p key={i} className="mb-4 text-base leading-relaxed text-foreground sm:text-lg">
          {paragraph}
        </p>
      ))}

      <Link
        href="/chat?query=Tell me more about yourself"
        className="group mt-6 inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
      >
        Ask the AI anything else
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  );
}
