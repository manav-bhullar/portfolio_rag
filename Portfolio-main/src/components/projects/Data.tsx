import { ChevronRight, Link } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Car, MonitorCheck, FileSearch, BarChart3, MapPinned, Bot } from 'lucide-react';
import type { ProjectCardData } from './ProjectCard';

// Full detail content shown when a card is expanded
const PROJECT_CONTENT = [
  {
    title: 'Floq',
    description:
      "A real-time ride-matching engine (carpooling system) - not a CRUD app with a map on top. Manages ride lifecycles with a Finite State Machine, prevents double-matching race conditions using Redis SET NX PX distributed locks with Lua atomic release plus PostgreSQL FOR UPDATE SKIP LOCKED row-level locking, and dispatches in real time over a Socket.io Pub/Sub layer. The matching engine itself uses a constrained backtracking algorithm that prunes the pickup/drop-off permutation search space from 40,320 down to 2,520 for 4 riders under a 30% max-detour constraint. A hot-path optimization (single-pass loops + Int32Array instead of higher-order array allocations) delivered a benchmarked 4.8x speedup - 34.3ms to 7.1ms for 10k iterations. Backed by 108 integration tests at 100% pass rate, covering FSM transitions, Pub/Sub cascade cancellations, cache invalidation timing, and identical-coordinate reuse attacks.",
    techStack: ['Node.js', 'PostgreSQL', 'Redis', 'Socket.io', 'JWT'],
    date: 'Live',
    links: [] as { name: string; url: string }[],
  },
  {
    title: 'SCALES v3.0',
    description:
      "An automated short-answer grading engine. v2.0 had a circular-dependency failure - confidence scoring was trained on the LLM's own ~15,000 pseudo-labels and learned to trust its own hallucinations. v3.0 fixes that with a Consistency-Based Trust Estimation (CBTE) pipeline and a 3-tier trust verification system: exact evidence-span substring matching, NLI entailment checking via cross-encoder/nli-deberta-v3-base, and synonym-based stability re-prompting - low-trust grades get deferred to human review instead of guessed. The grading pipeline is model-agnostic via LiteLLM (running Gemini 3.1 Flash-Lite), decomposed into independent stages: CERA (concept extraction) -> CGR (concept grading) -> CBTE (trust scoring) -> Aggregator. Deterministic and reproducible with a tuned trust threshold (tau = 0.5) and full pytest coverage.",
    techStack: ['FastAPI', 'LiteLLM', 'HuggingFace Transformers', 'pytest'],
    date: '2026',
    links: [] as { name: string; url: string }[],
  },
  {
    title: 'AI Portfolio RAG',
    description:
      "A fully interactive portfolio featuring a conversational AI assistant grounded in my real data. Implemented a complete Retrieval-Augmented Generation (RAG) pipeline using Pinecone for vector search and Gemini's gemini-embedding-2 for text embeddings. The AI is restricted from hallucinating outside the injected context, ensuring accurate answers about my skills and experience. Built with Next.js 15, Tailwind CSS, and the Vercel AI SDK. Includes a custom rate-limiting and API key rotation layer to scale free-tier usage.",
    techStack: ['Next.js', 'Pinecone', 'Gemini API', 'Tailwind'],
    date: '2026',
    links: [] as { name: string; url: string }[],
  },
  {
    title: 'Olist Analytics',
    description:
      "Customer and operations analytics over Olist's e-commerce data. Merged and cleaned 9 relational tables spanning 96,095 unique customers, resolving nulls across delivery timestamps, payment values, and review scores. RFM segmentation revealed 48% of customers as \"Lost\" and only 2% as Loyal/Champions - directly informing a re-engagement recommendation targeting 46,000+ churned buyers. Quantified delivery delay impact: late orders averaged 2.5/5 stars vs 4.1/5 for on-time deliveries (a 39% satisfaction drop), surfacing SLA enforcement as the highest-ROI operational fix. Wrote 4 DuckDB SQL queries using window functions (LAG, RANK) for MoM revenue growth, AOV by state, top-10 GMV categories, and seller rankings, then built a 4-view interactive Tableau Public dashboard.",
    techStack: ['Python', 'DuckDB', 'Tableau', 'Pandas'],
    date: '2025',
    links: [
      {
        name: 'Tableau Dashboard',
        url: 'https://public.tableau.com/authoring/manavbhullar/Dashboard1#1',
      },
    ],
  },
  {
    title: 'NYC Taxi Analytics',
    description:
      "Demand and operations analytics over 9.38M raw NYC taxi trip records (Jan-Mar 2023), ingested via PyArrow's iter_batches() chunked processing and cleaned with IQR-based outlier capping on fare and distance down to a 540K-row clean dataset. Identified citywide peak demand at Thursday 6PM, with BigQuery analysis revealing Saturday 1AM surges of 260-490 trips/hour concentrated in nightlife zones. Engineered a surge proxy metric via BigQuery window functions (PERCENTILE_CONT at the 90th percentile per zone) across 3 CTEs, flagging the top 20 high-frequency surge windows. Also discovered card payments averaged a 25.2% tip rate vs $0.00 recorded for cash trips, recommending in-app payment nudges to improve driver earnings visibility. Visualized as an interactive Folium choropleth map across all 263 NYC taxi zones.",
    techStack: ['Python', 'BigQuery', 'Folium', 'SQL'],
    date: '2025',
    links: [] as { name: string; url: string }[],
  },
];

interface ProjectProps {
  title: string;
}

export const ProjectContent = ({ project }: { project: ProjectProps }) => {
  const projectData = PROJECT_CONTENT.find((p) => p.title === project.title);

  if (!projectData) {
    return <div>Project details not available</div>;
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-secondary p-6">
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{projectData.date}</span>
          </div>

          <p className="text-foreground leading-relaxed">
            {projectData.description}
          </p>

          <div className="pt-2">
            <h3 className="mb-3 text-xs font-bold tracking-wide text-muted-foreground uppercase">
              Technologies
            </h3>
            <div className="flex flex-wrap gap-2">
              {projectData.techStack.map((tech, index) => (
                <span
                  key={index}
                  className="rounded-full bg-card px-3 py-1 text-sm font-medium text-foreground"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {projectData.links.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
              Links
            </h3>
            <Link className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <Separator className="mb-4" />
          <div className="space-y-3">
            {projectData.links.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between rounded-xl bg-secondary p-4 transition-colors hover:bg-secondary/70"
              >
                <span className="font-medium text-foreground">{link.name}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Card-facing data for the cookie-shaped project carousel
export const projectCards: ProjectCardData[] = [
  {
    id: 'Floq',
    title: 'Floq',
    blurb: 'Distributed backtracking route-optimization for ride-matching.',
    metric: '4.8x speedup',
    tags: ['Node.js', 'Redis', 'Socket.io'],
    icon: Car,
    accent: 'floq',
  },
  {
    id: 'SCALES v3.0',
    title: 'SCALES v3.0',
    blurb: 'Multi-tier trust-verification for automated grading.',
    metric: 'CBTE pipeline',
    tags: ['FastAPI', 'LiteLLM', 'HuggingFace'],
    icon: MonitorCheck,
    accent: 'scales',
  },
  {
    id: 'AI-Portfolio',
    title: 'AI Portfolio RAG',
    blurb: 'Interactive portfolio with an embedded vector RAG assistant.',
    metric: 'Vector Search',
    tags: ['Next.js', 'Pinecone', 'Gemini'],
    icon: Bot,
    accent: 'piprag',
  },
  {
    id: 'Olist Analytics',
    title: 'Olist Analytics',
    blurb: 'RFM segmentation and SLA impact across 96K customers.',
    metric: '46K+ churned buyers',
    tags: ['DuckDB', 'Tableau'],
    icon: BarChart3,
    accent: 'olist',
  },
  {
    id: 'NYC Taxi Analytics',
    title: 'NYC Taxi Analytics',
    blurb: 'Demand surge analysis over 9M+ trip records.',
    metric: '9.38M records',
    tags: ['BigQuery', 'Folium'],
    icon: MapPinned,
    accent: 'nyctaxi',
  },
];
