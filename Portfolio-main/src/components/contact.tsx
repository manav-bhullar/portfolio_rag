'use client';

import React from 'react';
import { ChevronRight, Github, Linkedin, Mail, Phone, Code2, BarChart3 } from 'lucide-react';

export function Contact() {
  // Contact information
  const contactInfo = {
    name: 'Manav Bhullar',
    email: 'manavbhullar341@gmail.com',
    phone: '+91 78146 67188',
    handle: '@manav-bhullar',
    socials: [
      { name: 'GitHub', url: 'https://github.com/manav-bhullar', icon: Github },
      { name: 'LinkedIn', url: 'https://www.linkedin.com/in/manav-bhullar-a27a0b282/', icon: Linkedin },
      { name: 'LeetCode', url: 'https://leetcode.com/u/jeonaMorh/', icon: Code2 },
      { name: 'Tableau Public', url: 'https://public.tableau.com/app/profile/manav.bhullar', icon: BarChart3 },
    ],
  };

  return (
    <div className="mx-auto mt-6 w-full sm:mt-8">
      <div className="rounded-organic bg-accent w-full overflow-hidden px-5 py-7 font-sans sm:px-10 sm:py-8 md:px-16 md:py-12">
        {/* Header Section */}
        <div className="mb-6 flex flex-col sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-foreground text-2xl font-extrabold sm:text-3xl md:text-4xl">
            Contacts
          </h2>
          <span className="mt-1 text-sm text-muted-foreground sm:mt-0 sm:text-base">
            {contactInfo.handle}
          </span>
        </div>

        {/* Primary channels — native mailto:/tel: so the phone opens the right
            app on tap; full-width rows so the whole line is the target */}
        <div className="flex flex-col gap-1">
          <a
            href={`mailto:${contactInfo.email}`}
            className="group pressable -mx-2 flex min-h-12 items-center justify-between gap-3 rounded-xl px-2 py-2"
          >
            <span className="flex min-w-0 items-center gap-3">
              <Mail className="h-5 w-5 shrink-0 text-[var(--accent-olist)]" />
              <span className="truncate text-base font-medium text-[var(--accent-olist)] sm:text-lg">
                {contactInfo.email}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-[var(--accent-olist)] transition-transform duration-300 group-hover:translate-x-1" />
          </a>

          <a
            href={`tel:${contactInfo.phone.replace(/\s/g, '')}`}
            className="group pressable -mx-2 flex min-h-12 items-center justify-between gap-3 rounded-xl px-2 py-2"
          >
            <span className="flex min-w-0 items-center gap-3">
              <Phone className="h-5 w-5 shrink-0 text-muted-foreground" />
              <span className="text-base font-medium text-muted-foreground sm:text-lg">
                {contactInfo.phone}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1" />
          </a>
        </div>

        {/* Social Links — pills, 44px tall, wrap on narrow screens */}
        <div className="mt-5 flex flex-wrap gap-2 sm:mt-6">
          {contactInfo.socials.map(({ name, url, icon: Icon }) => (
            <a
              key={name}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="pressable flex min-h-11 items-center gap-2 rounded-full bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-card/70"
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              {name}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Contact;
