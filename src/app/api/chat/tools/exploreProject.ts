import { tool } from "ai";
import { z } from "zod";
import { KNOWLEDGE_BASE } from "@/lib/rag/knowledge-base";

const PROJECTS = KNOWLEDGE_BASE.filter((doc) => doc.category === 'project');

export const exploreProject = tool({
  description:
    "Fetch everything the knowledge base has about one of Manav's projects (e.g., Floq, SCALES, PIP-RAG, Olist, NYC Taxi): its overview plus every sub-topic document. Use this when the user asks for details, the tech stack, challenges, or everything about a single project.",
  parameters: z.object({
    projectKeyword: z.string().describe("A keyword to search for the project (e.g. 'floq', 'scales', 'pip', 'rag', 'olist', 'taxi')"),
  }),
  execute: async ({ projectKeyword }) => {
    const term = projectKeyword.toLowerCase().trim();
    const matches = PROJECTS.filter(
      (doc) =>
        doc.title.toLowerCase().includes(term) ||
        doc.keywords.some((k) => k.toLowerCase().includes(term))
    );

    if (matches.length === 0) {
      const overviews = PROJECTS.filter((doc) => !doc.partOf)
        .map((doc) => `- ${doc.title}`)
        .join('\n');
      return `No project found matching '${projectKeyword}'. Manav's projects:\n\n${overviews}`;
    }

    // Prefer a title match, then return that project's whole family:
    // the overview first, followed by its sub-topic documents.
    const best = matches.find((doc) => doc.title.toLowerCase().includes(term)) ?? matches[0];
    const rootId = best.partOf ?? best.id;
    const family = PROJECTS.filter((doc) => doc.id === rootId || doc.partOf === rootId).sort(
      (a, b) => Number(a.id !== rootId) - Number(b.id !== rootId)
    );

    return family.map((doc) => `### ${doc.title}\n\n${doc.content}`).join('\n\n');
  },
});
