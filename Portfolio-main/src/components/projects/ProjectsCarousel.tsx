'use client';

import { useEffect, useRef, useState } from 'react';
import { ProjectCard } from './ProjectCard';
import { ProjectContent, projectCards } from './Data';
import { ResponsiveSheet } from '@/components/ui/responsive-sheet';

export function ProjectsCarousel() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const openProject = projectCards.find((p) => p.id === openId);

  // Track which card is snapped so the dot indicator (mobile) stays honest.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const first = el.firstElementChild as HTMLElement | null;
        if (!first) return;
        const step = first.offsetWidth + parseFloat(getComputedStyle(el).columnGap || '16');
        setActiveIndex(Math.round(el.scrollLeft / step));
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const scrollTo = (i: number) => {
    const el = scrollerRef.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return;
    const step = first.offsetWidth + parseFloat(getComputedStyle(el).columnGap || '16');
    el.scrollTo({ left: i * step, behavior: 'smooth' });
  };

  return (
    <div className="relative w-full">
      {/*
        On phones the scroller bleeds past the thread's side padding to the
        viewport edge (-mx-4 + px-4 scroll-padding) so the cards aren't clipped
        by an arbitrary inner box, and the next card peeks in from the right —
        the visual cue that there's more to swipe. Snap keeps one card centred.
        The extra top padding leaves room for the accent blob that overhangs
        each card's corner (it would otherwise be clipped by overflow).
      */}
      <div
        ref={scrollerRef}
        className="scroll-x snap-x-mandatory -mx-4 flex gap-4 px-4 pt-5 pb-4 [scroll-padding-inline:1rem] md:mx-0 md:px-0"
        role="list"
        aria-label="Projects"
      >
        {projectCards.map((project) => (
          <div key={project.id} role="listitem" className="shrink-0">
            <ProjectCard project={project} onOpen={() => setOpenId(project.id)} />
          </div>
        ))}
        {/* trailing spacer so the last card can snap fully into view */}
        <div aria-hidden className="w-px shrink-0" />
      </div>

      {/* Dot indicator — mobile only; desktop has enough width to see the row */}
      <div className="mt-1 flex items-center justify-center gap-1.5 md:hidden" aria-hidden>
        {projectCards.map((p, i) => (
          <button
            key={p.id}
            type="button"
            tabIndex={-1}
            onClick={() => scrollTo(i)}
            className="tap-target h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === activeIndex ? 20 : 6,
              backgroundColor:
                i === activeIndex ? `var(--accent-${p.accent})` : 'var(--border)',
            }}
          />
        ))}
      </div>

      <ResponsiveSheet
        open={!!openProject}
        onOpenChange={(o) => !o && setOpenId(null)}
        title={openProject?.title ?? ''}
        description={openProject?.blurb}
        header={
          openProject && (
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl md:h-11 md:w-11"
                style={{
                  backgroundColor: `var(--accent-${openProject.accent}-soft)`,
                  color: `var(--accent-${openProject.accent})`,
                }}
              >
                <openProject.icon className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <h2 className="font-display truncate text-xl font-bold text-foreground md:text-2xl">
                {openProject.title}
              </h2>
            </div>
          )
        }
      >
        {openProject && <ProjectContent project={{ title: openProject.title }} />}
      </ResponsiveSheet>
    </div>
  );
}

export default ProjectsCarousel;
