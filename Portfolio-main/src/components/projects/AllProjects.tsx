'use client';

import { ProjectsCarousel } from '@/components/projects/ProjectsCarousel';
import { GitHubStatsBar } from '@/components/projects/GitHubStatsBar';

export default function AllProjects() {
  return (
    <div className="h-full w-full pt-2 sm:pt-4">
      <h2 className="text-title-lg-emphasized mx-auto max-w-7xl text-foreground">
        My Projects
      </h2>
      <div className="mx-auto mt-3 max-w-7xl">
        <GitHubStatsBar />
      </div>
      <ProjectsCarousel />
    </div>
  );
}
