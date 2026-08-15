'use client';

import { motion } from 'framer-motion';
import { BrainCircuit, Code, Database, Users } from 'lucide-react';

const Skills = () => {
  const skillsData = [
    {
      category: 'Web & Backend',
      icon: <Code className="h-5 w-5" />,
      skills: ['Node.js', 'PostgreSQL', 'Redis', 'Socket.io', 'FastAPI'],
      bg: 'var(--accent-olist)',
    },
    {
      category: 'AI/ML',
      icon: <BrainCircuit className="h-5 w-5" />,
      skills: ['LLMs', 'Gemini API', 'RAG', 'HuggingFace Transformers'],
      bg: 'var(--accent-floq)',
    },
    {
      category: 'Data & Databases',
      icon: <Database className="h-5 w-5" />,
      skills: ['Python', 'DuckDB', 'BigQuery', 'Pandas', 'Tableau'],
      bg: 'var(--accent-scales)',
    },
    {
      category: 'Soft Skills',
      icon: <Users className="h-5 w-5" />,
      skills: ['Communication', 'Problem-Solving', 'Ownership', 'Teamwork'],
      bg: 'var(--accent-nyctaxi)',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.96 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 220, damping: 20 },
    },
  } as const;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <h2 className="font-display mb-5 text-2xl font-bold text-foreground md:text-3xl">
        Technical Stack
      </h2>

      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {skillsData.map((section) => (
          <motion.div
            key={section.category}
            variants={itemVariants}
            style={{ backgroundColor: section.bg }}
            className="rounded-2xl p-5 text-white"
          >
            <div className="mb-3 flex items-center gap-2">
              {section.icon}
              <h3 className="text-base font-bold">{section.category}</h3>
            </div>
            <ul className="space-y-1 text-sm text-white/90">
              {section.skills.map((skill) => (
                <li key={skill}>{skill}</li>
              ))}
            </ul>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default Skills;
