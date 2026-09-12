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
          <span className="mt-2 sm:mt-0">{contactInfo.handle}</span>
        </div>

        {/* Email Section */}
        <div className="mt-8 flex flex-col md:mt-10">
          <a
            href={`mailto:${contactInfo.email}`}
            className="group focus-visible:ring-ring mb-2 w-fit cursor-pointer rounded-md focus-visible:ring-2 focus-visible:outline-none"
          >
            <span className="flex items-center gap-1">
              <span className="text-base font-medium text-[var(--accent-olist)] hover:underline sm:text-lg">
                {contactInfo.email}
              </span>
              <ChevronRight className="h-5 w-5 text-[var(--accent-olist)] transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </a>

          {/* Phone */}
          <a
            href={`tel:${contactInfo.phone.replace(/\s/g, '')}`}
            className="group focus-visible:ring-ring mb-5 w-fit cursor-pointer rounded-md focus-visible:ring-2 focus-visible:outline-none"
          >
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground text-base font-medium hover:underline sm:text-lg">
                {contactInfo.phone}
              </span>
              <ChevronRight className="text-muted-foreground h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </a>

          {/* Social Links */}
          <div className="flex flex-wrap gap-x-6 gap-y-5 sm:gap-x-8">
            {contactInfo.socials.map((social) => (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-accent cursor-pointer rounded-sm text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
                title={social.name}
                aria-label={`Visit my ${social.name}`}
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
