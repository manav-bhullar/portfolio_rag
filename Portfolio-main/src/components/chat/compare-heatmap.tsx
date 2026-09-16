import { motion } from 'framer-motion';
import { CheckCircle2, CircleAlert, HelpCircle } from 'lucide-react';

interface HeatmapSkill {
  name: string;
  matchLevel: 'strong' | 'partial' | 'gap';
  evidence: string;
}

interface CompareHeatmapProps {
  result: {
    role: string;
    skills: HeatmapSkill[];
  };
}

const colorMap = {
  strong: 'bg-[#3FB37F]/15 border-[#3FB37F]/30',
  partial: 'bg-[#F0954A]/15 border-[#F0954A]/30',
  gap: 'bg-muted border-border',
};

const iconMap = {
  strong: <CheckCircle2 className="h-4 w-4 text-[#3FB37F] shrink-0 mt-0.5" />,
  partial: <HelpCircle className="h-4 w-4 text-[#F0954A] shrink-0 mt-0.5" />,
  gap: <CircleAlert className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />,
};

export default function CompareHeatmap({ result }: CompareHeatmapProps) {
  const { role, skills } = result;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm"
    >
      <div className="mb-5 border-b border-border pb-4">
        <h3 className="text-sm font-bold tracking-widest text-muted-foreground uppercase mb-1">
          Role Fit Heatmap
        </h3>
        <h2 className="text-xl font-bold text-foreground sm:text-2xl">
          {role}
        </h2>
      </div>

      <div className="grid gap-3">
        {skills.map((skill, idx) => (
          <div
            key={idx}
            className={`flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 rounded-xl border p-3 transition-colors ${colorMap[skill.matchLevel]}`}
          >
            <div className="flex items-center gap-2 sm:w-1/3 shrink-0">
              {iconMap[skill.matchLevel]}
              <span className="font-semibold text-foreground text-sm">{skill.name}</span>
            </div>
            <div className="text-sm text-foreground/80 leading-relaxed flex-1">
              {skill.evidence}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
