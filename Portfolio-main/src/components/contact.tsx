'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';

export function Contact() {
  // Contact information
  const contactInfo = {
    name: 'Manav Bhullar',
    email: 'manavbhullar341@gmail.com',
    phone: '+91 78146 67188',
    handle: '@manav-bhullar',
    socials: [
      {
        name: 'GitHub',
        url: 'https://github.com/manav-bhullar',
      },
      {
        name: 'LinkedIn',
        url: 'https://www.linkedin.com/in/manav-bhullar-a27a0b282/',
      },
      {
        name: 'LeetCode',
        url: 'https://leetcode.com/u/jeonaMorh/',
      },
      {
        name: 'Tableau Public',
        url: 'https://public.tableau.com/app/profile/manav.bhullar',
      },
    ],
  };

  return (
    <div className="mx-auto mt-8 w-full">
      <div className="rounded-organic bg-accent w-full overflow-hidden px-6 py-8 font-sans sm:px-10 md:px-16 md:py-12">
        {/* Header Section */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-foreground text-3xl font-extrabold md:text-4xl">
            Contacts
          </h2>
          <span className="mt-2 sm:mt-0">
            {contactInfo.handle}
          </span>
        </div>

        {/* Email Section */}
        <div className="mt-8 flex flex-col md:mt-10">
          <a
            href={`mailto:${contactInfo.email}`}
            className="group mb-2 cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-olist)] focus-visible:ring-offset-2 focus-visible:ring-offset-accent"
          >
            <div className="flex items-center gap-1">
              <span className="text-[var(--accent-olist)] text-base font-medium group-hover:underline sm:text-lg">
                {contactInfo.email}
              </span>
              <ChevronRight className="h-5 w-5 text-[var(--accent-olist)] transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </a>

          {/* Phone */}
          <a
            href={`tel:${contactInfo.phone.replace(/\s/g, '')}`}
            className="group mb-5 cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-muted-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-accent"
          >
            <div className="flex items-center gap-1">
              <span className="text-base font-medium text-muted-foreground group-hover:underline sm:text-lg">
                {contactInfo.phone}
              </span>
              <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </a>

          {/* Social Links */}
          <div className="flex flex-wrap gap-x-6 gap-y-5 sm:gap-x-8">
            {contactInfo.socials.map((social) => (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground cursor-pointer rounded-sm text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-muted-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-accent"
                title={social.name}
              >
                {social.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Contact;
