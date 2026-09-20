import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { PROJECT_CONTENT, projectCards } from '@/components/projects/Data';

const SLUG_TO_TITLE: Record<string, string> = {
  floq: 'Floq',
  scales: 'SCALES v3.0',
  'ai-portfolio-rag': 'AI Portfolio RAG',
  'olist-analytics': 'Olist Analytics',
  'nyc-taxi-analytics': 'NYC Taxi Analytics',
};

function getProject(slug: string) {
  const title = SLUG_TO_TITLE[slug];
  if (!title) return null;
  const content = PROJECT_CONTENT.find((p) => p.title === title);
  const card = projectCards.find((c) => c.title === title);
  if (!content || !card) return null;
  return { content, card };
}

export function generateStaticParams() {
  return Object.keys(SLUG_TO_TITLE).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};

  const { content, card } = project;
  const title = `${content.title} | Manav Bhullar`;
  const description = card.blurb;

  return {
    title,
    description,
    openGraph: {
      type: 'article',
      title,
      description,
      siteName: 'Manav Bhullar Portfolio',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const { content, card } = project;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to portfolio
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <span
          className="rounded-full px-3 py-1 text-xs font-bold text-white"
          style={{ backgroundColor: `var(--accent-${card.accent})` }}
        >
          {content.date}
        </span>
      </div>

      <h1 className="font-display mb-4 text-3xl font-extrabold text-foreground sm:text-4xl">
        {content.title}
      </h1>

      <p className="mb-8 text-base leading-relaxed text-foreground sm:text-lg">
        {content.description}
      </p>

      <div className="mb-8">
        <h2 className="mb-3 text-xs font-bold tracking-wide text-muted-foreground uppercase">
          Technologies
        </h2>
        <div className="flex flex-wrap gap-2">
          {content.techStack.map((tech) => (
            <span
              key={tech}
              className="rounded-full bg-secondary px-3 py-1 text-sm font-medium text-foreground"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      {content.links.length > 0 && (
        <div className="mb-10">
          <h2 className="mb-3 text-xs font-bold tracking-wide text-muted-foreground uppercase">
            Links
          </h2>
          <div className="space-y-3">
            {content.links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between rounded-xl bg-secondary p-4 transition-colors hover:bg-secondary/70"
              >
                <span className="font-medium text-foreground">{link.name}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </a>
            ))}
          </div>
        </div>
      )}

      <Link
        href={`/chat?query=${encodeURIComponent(`Tell me more about ${content.title}`)}`}
        className="group inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
      >
        Ask the AI about this project
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  );
}
