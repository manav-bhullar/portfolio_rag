'use client';

import { useEffect, useState } from 'react';
import { GitFork, Star, Users } from 'lucide-react';

const GITHUB_USERNAME = 'manav-bhullar';

interface GitHubStats {
  publicRepos: number;
  followers: number;
  totalStars: number;
}

export function GitHubStatsBar() {
  const [stats, setStats] = useState<GitHubStats | null>(null);
  const [chartFailed, setChartFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        const [userRes, reposRes] = await Promise.all([
          fetch(`https://api.github.com/users/${GITHUB_USERNAME}`),
          fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100`),
        ]);
        if (!userRes.ok || !reposRes.ok) return;

        const user = await userRes.json();
        const repos = await reposRes.json();
        const totalStars = Array.isArray(repos)
          ? repos.reduce((sum: number, r: { stargazers_count?: number }) => sum + (r.stargazers_count ?? 0), 0)
          : 0;

        if (!cancelled) {
          setStats({
            publicRepos: user.public_repos ?? 0,
            followers: user.followers ?? 0,
            totalStars,
          });
        }
      } catch {
        // GitHub's unauthenticated rate limit is tight — fail silently,
        // this is a supplementary widget, not core functionality.
      }
    }

    loadStats();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!stats) return null;

  return (
    <div className="mb-4 w-full">
      <div className="mb-3 flex flex-wrap items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <GitFork className="h-4 w-4" />
          <span className="font-semibold text-foreground">{stats.publicRepos}</span> public repos
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Star className="h-4 w-4" />
          <span className="font-semibold text-foreground">{stats.totalStars}</span> stars
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span className="font-semibold text-foreground">{stats.followers}</span> followers
        </div>
      </div>

      {!chartFailed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://ghchart.rshah.org/3FB37F/${GITHUB_USERNAME}`}
          alt={`${GITHUB_USERNAME}'s GitHub contribution graph`}
          className="w-full rounded-lg"
          onError={() => setChartFailed(true)}
        />
      )}
    </div>
  );
}

export default GitHubStatsBar;
