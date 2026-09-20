import { motion } from 'framer-motion';
import { Rocket } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ProjectExplorerProps {
  content: string;
}

export default function ProjectExplorer({ content }: ProjectExplorerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      <div className="border-b border-border bg-muted/50 px-4 py-3 flex items-center gap-2">
        <Rocket className="h-5 w-5 text-primary" />
        <h3 className="font-semibold tracking-tight">Project Deep Dive</h3>
      </div>
      <div className="p-5">
        <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-primary">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
}
