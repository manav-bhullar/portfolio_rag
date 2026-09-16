import { tool } from "ai";
import { z } from "zod";
import { KNOWLEDGE_BASE } from "@/lib/rag/knowledge-base";

export const exploreProject = tool({
  description:
    "Fetch in-depth details about a specific project by Manav (e.g., Floq, SCALES, PIP-RAG, Olist, NYC Taxi). Use this when the user asks for more details, tech stack, or challenges about a single project.",
  parameters: z.object({
    projectKeyword: z.string().describe("A keyword to search for the project (e.g. 'floq', 'scales', 'pip', 'rag', 'olist', 'taxi')"),
  }),
  execute: async ({ projectKeyword }) => {
    const term = projectKeyword.toLowerCase();
    const matches = KNOWLEDGE_BASE.filter(doc => 
      doc.category === 'project' && 
      (doc.title.toLowerCase().includes(term) || 
       doc.keywords.some(k => k.toLowerCase().includes(term)))
    );

    if (matches.length === 0) {
      return `No specific project found matching '${projectKeyword}'. Manav's main projects are Floq (task management), SCALES (supply chain ML), PIP-RAG (AI PDF search), Olist E-commerce Analytics, and NYC Taxi Analytics.`;
    }

    const project = matches[0];
    return `Found project details for ${project.title}:\n\n${project.content}\n\nI should highlight the key technologies and interesting challenges from this data. I will also render a project deep-dive UI card.`;
  },
});
