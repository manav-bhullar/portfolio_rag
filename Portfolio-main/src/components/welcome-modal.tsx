'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { Info, X } from 'lucide-react';
import React, { useState } from 'react';

// Added a trigger prop to accept custom triggers
interface WelcomeModalProps {
  trigger?: React.ReactNode;
}

export default function WelcomeModal({ trigger }: WelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Default trigger is the logo
  const defaultTrigger = (
    <Button
      variant="ghost"
      className="hover:bg-accent h-auto w-auto cursor-pointer rounded-xl p-2 focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 sm:rounded-2xl sm:p-3 md:p-4"
      onClick={() => setIsOpen(true)}
    >
      <Info className="w-6 md:w-8" />
      <span className="sr-only">About Manav</span>
    </Button>
  );

  // Fonction qui utilise window.location pour forcer un rechargement complet
  const handleContactMe = () => {
    setIsOpen(false);
    // Forcer un rechargement complet de la page avec la requête
    window.location.href = '/chat?query=How%20can%20I%20contact%20you%3F';
  };

  return (
    <>
      {/* Use custom trigger if provided, otherwise use default */}
      {trigger ? (
        React.isValidElement(trigger) ? (
          React.cloneElement(
            trigger as React.ReactElement<{
              onClick?: (e: React.MouseEvent) => void;
            }>,
            {
              onClick: (e: React.MouseEvent) => {
                const triggerElement = trigger as React.ReactElement<{
                  onClick?: (e: React.MouseEvent) => void;
                }>;
                if (triggerElement.props.onClick) {
                  triggerElement.props.onClick(e);
                }
                setIsOpen(true);
              },
            }
          )
        ) : (
          <button type="button" onClick={() => setIsOpen(true)}>
            {trigger}
          </button>
        )
      ) : (
        defaultTrigger
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-background z-52 max-h-[85dvh] overflow-auto rounded-2xl border-none p-4 shadow-xl sm:max-w-[85vw] sm:p-6 md:max-w-[80vw] md:p-8 lg:max-w-[1000px]">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex h-full flex-col"
          >
            {/* Header */}
            <DialogHeader className="relative flex flex-row items-start justify-between px-4 pt-4 pb-3 sm:px-6 sm:pt-6 md:px-8 md:pt-8 md:pb-6">
              <div>
                <DialogTitle className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
                  Welcome to AI Portfolio
                </DialogTitle>
                <DialogDescription className="mt-2 text-base">
                  {/*My interactive AI portfolio experience*/}
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="sticky top-0 right-0 cursor-pointer rounded-full bg-black p-2 text-white hover:bg-black/90 hover:text-white"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-6 w-6" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogHeader>

            {/* Content area */}
            <div className="space-y-4 overflow-y-auto px-1 py-2 sm:space-y-6 sm:px-4 sm:py-4 md:px-8">
              <section className="bg-accent w-full space-y-6 rounded-xl p-4 sm:rounded-2xl sm:p-6 md:space-y-8 md:p-8">
                {/* What section */}
                <div className="space-y-3">
                  <h3 className="text-primary flex items-center gap-2 text-xl font-semibold">
                    What&apos;s ????
                  </h3>
                  <p className="text-accent-foreground text-base leading-relaxed">
                    I&apos;m so excited to present my{' '}
                    <strong>brand new AI Portfolio.</strong>
                    <br /> Whether you&apos;re a recruiter, a friend, family
                    member, or just curious, feel free to ask anything you want!
                    <br /> You can inquire about my projects, skills, education,
                    or even my personal interests.
                  </p>
                </div>

                {/* Why section */}
                <div className="space-y-3">
                  <h3 className="text-primary flex items-center gap-2 text-xl font-semibold">
                    Why ???
                  </h3>
                  <p className="text-accent-foreground text-base leading-relaxed">
                    Traditional portfolios can be limiting. <br /> They
                    can&apos;t adapt to every visitor&apos;s specific needs.{' '}
                    <br /> With this AI approach, my portfolio becomes{' '}
                    <strong>
                      exactly what you&apos;re interested in knowing about me
                      and my work.
                    </strong>
                  </p>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="flex flex-col items-center px-4 pt-3 pb-2 sm:px-6 sm:pt-4 md:px-8 md:pt-4 md:pb-8">
              <Button
                onClick={() => setIsOpen(false)}
                className="h-auto rounded-full px-4 py-3"
                size="sm"
              >
                Start Chatting
              </Button>
              <button
                type="button"
                className="focus-visible:ring-ring mt-6 flex cursor-pointer flex-wrap items-center justify-center gap-1 rounded-md p-1 text-center text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                onClick={handleContactMe}
                aria-label="Contact me"
              >
                <span className="text-muted-foreground">
                  If you love it, please share it! Feedback is always welcome.
                </span>
                <span className="flex cursor-pointer items-center text-blue-500 hover:underline">
                  Contact me.
                </span>
              </button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  );
}
