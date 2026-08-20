'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Download } from 'lucide-react';

export function Resume() {
  const resumes = [
    {
      title: 'Software Engineering Resume',
      description: 'Full-stack focus - Floq, Campus Marketplace, systems work',
      downloadUrl: '/Manav_Bhullar_SDE_Resume.pdf',
    },
    {
      title: 'AI/ML Resume',
      description: 'SCALES v3.0, Portfolio RAG, and applied ML work',
      downloadUrl: '/Manav_Bhullar_AIML_Resume.pdf',
    },
    {
      title: 'Data Analyst Resume',
      description: 'Olist Analytics, NYC Taxi Analytics, Deloitte simulation',
      downloadUrl: '/Manav_Bhullar_DataAnalyst_Resume.pdf',
    },
  ];

  const handleDownload = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = url.split('/').pop() || 'resume.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mx-auto w-full space-y-3 py-8 font-sans">
      {resumes.map((resume, index) => (
        <motion.button
          key={resume.downloadUrl}
          onClick={() => handleDownload(resume.downloadUrl)}
          aria-label={`Download ${resume.title} PDF`}
          className="group bg-accent focus-visible:ring-foreground focus-visible:ring-offset-background relative block w-full cursor-pointer overflow-hidden rounded-xl p-0 text-left transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' }}
          whileHover={{ scale: 1.01 }}
        >
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-foreground text-lg font-medium">
                  {resume.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {resume.description}
                </p>
                <div className="text-muted-foreground mt-1 flex text-xs">
                  <span>PDF</span>
                </div>
              </div>

              <motion.div
                className="text-primary-foreground flex h-10 w-10 items-center justify-center rounded-full bg-black group-hover:bg-black/80"
                initial={{ scale: 1 }}
              >
                <Download className="h-5 w-5" />
              </motion.div>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
}

export default Resume;
