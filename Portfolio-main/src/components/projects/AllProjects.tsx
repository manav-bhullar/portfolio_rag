'use client';

import { ProjectsCarousel } from '@/components/projects/ProjectsCarousel';

export default function AllProjects() {
  return (
    <div className="h-full w-full pt-4">
      <h2 className="font-display mx-auto max-w-7xl text-xl font-bold text-foreground md:text-2xl">
        My Projects
      </h2>
      <ProjectsCarousel />
    </div>
  );
}
