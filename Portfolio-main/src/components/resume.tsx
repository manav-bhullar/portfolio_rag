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
      description: 'SCALES v3.0, PIP-RAG, and applied ML work',
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
        <motion.div
          key={resume.downloadUrl}
          onClick={() => handleDownload(resume.downloadUrl)}
          className="group relative cursor-pointer overflow-hidden rounded-xl bg-accent p-0 transition-all duration-300"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' }}
          whileHover={{ scale: 1.01 }}
        >
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-foreground">
                  {resume.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {resume.description}
                </p>
                <div className="mt-1 flex text-xs text-muted-foreground">
                  <span>PDF</span>
                </div>
              </div>

              <motion.div
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-primary-foreground group-hover:bg-black/80"
                initial={{ scale: 1 }}
              >
                <Download className="h-5 w-5" />
              </motion.div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default Resume;
