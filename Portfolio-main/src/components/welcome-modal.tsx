'use client';

import { Button } from '@/components/ui/button';
import { ResponsiveSheet } from '@/components/ui/responsive-sheet';
import { Info } from 'lucide-react';
import React, { useState } from 'react';

// Added a trigger prop to accept custom triggers
interface WelcomeModalProps {
  trigger?: React.ReactNode;
}

export default function WelcomeModal({ trigger }: WelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Default trigger is the info glyph — 44px hit area for thumbs
  const defaultTrigger = (
    <Button
      variant="ghost"
      aria-label="About this portfolio"
      className="pressable hover:bg-accent h-11 w-11 cursor-pointer rounded-full p-0 focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:h-12 md:w-12"
      onClick={() => setIsOpen(true)}
    >
      <Info className="!h-6 !w-6 md:!h-7 md:!w-7" />
      <span className="sr-only">About this portfolio</span>
    </Button>
  );

  const handleContactMe = () => {
    setIsOpen(false);
    window.location.href = '/chat?query=How%20can%20I%20contact%20you%3F';
  };

  return (
    <>
      {trigger ? (
        React.isValidElement(trigger) ? (
          React.cloneElement(
            trigger as React.ReactElement<{
              onClick?: (e: React.MouseEvent) => void;
            }>,
            {
              onClick: (e: React.MouseEvent) => {
                setIsOpen(true);
                const triggerProps = (
                  trigger as React.ReactElement<{
                    onClick?: (e: React.MouseEvent) => void;
                  }>
                ).props;
                if (triggerProps.onClick) {
                  triggerProps.onClick(e);
                }
              },
            }
          )
        ) : (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="contents"
          >
            {trigger}
          </button>
        )
      ) : (
        defaultTrigger
      )}

      <ResponsiveSheet
        open={isOpen}
        onOpenChange={setIsOpen}
        title="Welcome to AI Portfolio"
        description="What this interactive portfolio is and why it exists"
        desktopClassName="max-w-3xl"
        mobileHeight="auto"
      >
        <div className="space-y-4 pb-2">
          <section className="bg-accent space-y-6 rounded-2xl p-5 sm:p-7">
            <div className="space-y-2">
              <h3 className="text-primary text-lg font-semibold sm:text-xl">
                What&apos;s this?
              </h3>
              <p className="text-accent-foreground text-[15px] leading-relaxed sm:text-base">
                I&apos;m so excited to present my{' '}
                <strong>brand new AI Portfolio.</strong> Whether you&apos;re a
                recruiter, a friend, family member, or just curious, feel free
                to ask anything you want — projects, skills, education, or even
                my personal interests.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-primary text-lg font-semibold sm:text-xl">
                Why?
              </h3>
              <p className="text-accent-foreground text-[15px] leading-relaxed sm:text-base">
                Traditional portfolios can&apos;t adapt to every visitor&apos;s
                specific needs. With this AI approach, my portfolio becomes{' '}
                <strong>
                  exactly what you&apos;re interested in knowing about me and my
                  work.
                </strong>
              </p>
            </div>
          </section>

          <div className="flex flex-col items-center gap-4 pt-2">
            <Button
              onClick={() => setIsOpen(false)}
              className="pressable h-12 w-full rounded-full px-6 text-base font-semibold sm:w-auto"
            >
              Start chatting
            </Button>
            <p className="text-muted-foreground text-center text-sm">
              If you love it, please share it — feedback is always welcome.{' '}
              <button
                type="button"
                onClick={handleContactMe}
                className="text-[var(--accent-olist)] underline-offset-2 hover:underline"
              >
                Contact me.
              </button>
            </p>
          </div>
        </div>
      </ResponsiveSheet>
    </>
  );
}
