// src/components/chat/tool-renderer.tsx
import { Contact } from '../contact';
import { Presentation } from '../presentation';
import AllProjects from '../projects/AllProjects';
import Resume from '../resume';
import Skills from '../skills';
import Interests from '../interests';
import Crazy from '../crazy';
import UiActionExecutor from './ui-action-executor';
import JobFitAnalysis, { type JobFitResult } from './job-fit-analysis';
import LeadCaptureForm from './lead-capture-form';
import CoverLetterResult from './cover-letter-result';
import ProjectExplorer from './project-explorer';
import CompareHeatmap from './compare-heatmap';

export interface ToolInvocationItem {
  toolCallId: string;
  toolName: string;
  args?: unknown;
  result?: unknown;
  state?: string;
}

interface ToolRendererProps {
  toolInvocations: ToolInvocationItem[];
  messageId?: string;
}

export default function ToolRenderer({
  toolInvocations,
}: ToolRendererProps) {
  return (
    <div className="w-full transition-all duration-300">
      {toolInvocations.map((tool) => {
        const { toolCallId, toolName } = tool;

        // Return specialized components based on tool name
        switch (toolName) {
          case 'getProjects':
            return (
              <div
                key={toolCallId}
                className="w-full overflow-hidden rounded-lg"
              >
                <AllProjects />
              </div>
            );

          // Legacy: exploreProject was removed as a tool (the deep-dive card is now
          // chosen by retrieval). Kept so saved and shared conversations still render.
          case 'exploreProject':
            return (
              <div
                key={toolCallId}
                className="w-full overflow-hidden rounded-lg"
              >
                <ProjectExplorer content={typeof tool.result === 'string' ? tool.result : JSON.stringify(tool.result)} />
              </div>
            );

          case 'compareWithRole':
            return (
              <div
                key={toolCallId}
                className="w-full overflow-hidden rounded-lg"
              >
                <CompareHeatmap result={typeof tool.result === 'string' ? JSON.parse(tool.result) : tool.result} />
              </div>
            );

          case 'getPresentation':
            return (
              <div
                key={toolCallId}
                className="w-full overflow-hidden rounded-lg"
              >
                <Presentation />
              </div>
            );

          case 'getResume':
            return (
              <div key={toolCallId} className="w-full rounded-lg">
                <Resume />
              </div>
            );

          case 'getContact':
            return (
              <div key={toolCallId} className="w-full rounded-lg">
                <Contact />
              </div>
            );

          case 'getSkills':
            return (
              <div key={toolCallId} className="w-full rounded-lg">
                <Skills />
              </div>
            );

          case 'getInterests':
            return (
              <div key={toolCallId} className="w-full rounded-lg">
                <Interests />
              </div>
            );

          case 'getCrazy':
            return (
              <div key={toolCallId} className="w-full rounded-lg">
                <Crazy />
              </div>
            );

          case 'analyzeJobFit': {
            let parsed: JobFitResult | null = null;
            try {
              parsed = typeof tool.result === 'string' ? JSON.parse(tool.result) : (tool.result as JobFitResult);
            } catch {
              parsed = null;
            }
            if (!parsed) return null;
            const jobDescription = (tool.args as { jobDescription?: string })?.jobDescription;
            return (
              <div key={toolCallId} className="w-full rounded-lg">
                <JobFitAnalysis result={parsed} jobDescription={jobDescription} />
              </div>
            );
          }

          case 'generateCoverLetter':
            return (
              <div key={toolCallId} className="w-full rounded-lg">
                <CoverLetterResult letter={String(tool.result ?? '')} />
              </div>
            );

          case 'submitContactRequest':
            return (
              <div key={toolCallId} className="w-full rounded-lg">
                <LeadCaptureForm />
              </div>
            );

          case 'executeUiAction':
            return (
              <div key={toolCallId} className="w-full rounded-lg">
                <UiActionExecutor action={(tool.args as { action: string })?.action || (tool.result as { action: string })?.action} />
              </div>
            );

          // Default renderer for other tools
          default:
            return (
              <div
                key={toolCallId}
                className="bg-secondary/10 w-full rounded-lg p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-lg font-medium">{toolName}</h3>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-100">
                    Tool Result
                  </span>
                </div>
                <div className="mt-2">
                  {typeof tool.result === 'object' ? (
                    <pre className="bg-secondary/20 overflow-x-auto rounded p-3 text-sm">
                      {JSON.stringify(tool.result, null, 2)}
                    </pre>
                  ) : (
                    <p>{String(tool.result)}</p>
                  )}
                </div>
              </div>
            );
        }
      })}
    </div>
  );
}
