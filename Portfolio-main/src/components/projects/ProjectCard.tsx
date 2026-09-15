'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { ShapeIcon } from '@/components/ui/shape-icon';
import type { ShapeName } from 'shape-morph';

export interface ProjectCardData {
  id: string;
  title: string;
  blurb: string;
  metric?: string;
  tags: string[];
  icon: LucideIcon;
  accent: 'floq' | 'scales' | 'piprag' | 'olist' | 'nyctaxi';
}

const accentVar: Record<ProjectCardData['accent'], string> = {
  floq: 'var(--accent-floq)',
  scales: 'var(--accent-scales)',
  piprag: 'var(--accent-piprag)',
  olist: 'var(--accent-olist)',
  nyctaxi: 'var(--accent-nyctaxi)',
};

const accentSoftVar: Record<ProjectCardData['accent'], string> = {
  floq: 'var(--accent-floq-soft)',
  scales: 'var(--accent-scales-soft)',
  piprag: 'var(--accent-piprag-soft)',
  olist: 'var(--accent-olist-soft)',
  nyctaxi: 'var(--accent-nyctaxi-soft)',
};

// One shape per project — M3's own "use a variety of shapes" tactic
// (expressive-tactics.md: "mix round and square shapes for tension").
const accentShape: Record<ProjectCardData['accent'], ShapeName> = {
  floq: 'Cookie9Sided',
  scales: 'Clover4Leaf',
  piprag: 'Burst',
  olist: 'Pentagon',
  nyctaxi: 'Sunny',
};

interface ProjectCardProps {
  project: ProjectCardData;
  onOpen: () => void;
}

export function ProjectCard({ project, onOpen }: ProjectCardProps) {
  const { title, blurb, metric, tags, icon: Icon, accent } = project;

  return (
    <motion.button
      onClick={onOpen}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      style={{ ['--card-accent-color' as string]: accentVar[accent] }}
      className="shape-card-accent pressable flex h-full w-[min(78vw,20rem)] shrink-0 flex-col items-start rounded-2xl border border-border bg-card p-5 text-left shadow-[0_10px_25px_-12px_rgba(25,25,25,0.15)] md:w-64"
      aria-label={`Open ${title} details`}
    >
      <ShapeIcon
        restShape={accentShape[accent]}
        className="mb-4"
        background={accentSoftVar[accent]}
        color={accentVar[accent]}
      >
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </ShapeIcon>

      <h3 className="font-display text-lg font-bold text-foreground">
        {title}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground"
          >
            {tag}
          </span>
        ))}
      </div>

      {metric && (
        <div
          className="mt-3 rounded-full px-2.5 py-1 text-xs font-bold"
          style={{ backgroundColor: accentSoftVar[accent], color: accentVar[accent] }}
        >
          {metric}
        </div>
      )}
    </motion.button>
  );
}

export default ProjectCard;
