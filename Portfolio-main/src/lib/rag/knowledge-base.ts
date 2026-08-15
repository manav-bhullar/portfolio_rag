/**
 * Knowledge Base for Manav Bhullar's Portfolio RAG System
 *
 * Each document is a focused, self-contained chunk about one topic.
 * The retriever will embed these and return the most relevant ones
 * for each user query.
 */

export interface KnowledgeDocument {
  id: string;
  category: 'background' | 'project' | 'experience' | 'skills' | 'personal';
  title: string;
  content: string;
  keywords: string[];
}

export const KNOWLEDGE_BASE: KnowledgeDocument[] = [
  // ── Background ──────────────────────────────────────────────
  {
    id: 'about-me',
    category: 'background',
    title: 'About Manav Bhullar',
    content: `Manav Bhullar (full name Manavdeep Singh Bhullar) is a Computer Engineering student from Patiala, Punjab, India. He is pursuing a B.E. in Computer Engineering at Thapar Institute of Engineering and Technology (TIET), 2023-2027.

He works across three domains: full-stack web development (MERN stack), data analytics, and AI/ML. He doesn't pick one lane — he builds production-grade systems in all three.

Relevant coursework: Operating Systems, Object-Oriented Programming, Database Management Systems, Computer Networks, Software Engineering, Foundations of Data Science, Predictive Analytics Using Statistics, Data Science (Computer Vision & NLP).`,
    keywords: [
      'manav', 'bhullar', 'manavdeep', 'about', 'who', 'introduction',
      'thapar', 'tiet', 'patiala', 'computer engineering', 'student',
      'education', 'coursework', 'background',
    ],
  },

  {
    id: 'achievements-certifications',
    category: 'background',
    title: 'Achievements & Certifications',
    content: `Achievements:
- Solved 400+ Data Structures & Algorithms problems across LeetCode and GeeksforGeeks.

Certifications:
- Coursera: Advanced Relational Database and SQL
- Coursera: APIs in Node.js (RESTful Backend Development)
- Coursera: CI/CD Pipeline with Docker
- Coursera: Mastering Data Analysis with Pandas (5-part path)
- Coursera: Statistics for Data Science
- Coursera: Working with BigQuery
- Coursera: Business Analysis & Process Management
- Coursera: Exploratory Data Analysis with Python and Pandas
- NVIDIA: Fundamentals of Deep Learning
- Generative AI: Foundation Models and Platforms`,
    keywords: [
      'achievements', 'certifications', 'courses', 'coursera', 'nvidia',
      'leetcode', 'geeksforgeeks', 'dsa', 'algorithms', 'problems',
      'certificates', 'credentials',
    ],
  },

  // ── Experience ──────────────────────────────────────────────
  {
    id: 'experience-virsa',
    category: 'experience',
    title: 'Experience — Technical Head, Virsa Society, Thapar Institute',
    content: `Role: Technical Head / Core Member at Virsa Society, Thapar Institute of Engineering and Technology.
Duration: Core Member 2023-2024, Technical Head 2023-2025.

Key contributions:
- Approached 30+ local vendors in Patiala for stall partnerships at Virsa Mela
- Converted 20 vendors into confirmed sponsors for an event drawing 4,000+ student attendees
- Rebuilt the society website (ssavirsa.in) frontend from scratch in React, migrating off static HTML/CSS
- Independently built the events page and gallery page for the website`,
    keywords: [
      'virsa', 'society', 'thapar', 'experience', 'work', 'technical head',
      'core member', 'website', 'react', 'ssavirsa', 'mela', 'event',
      'sponsors', 'vendors',
    ],
  },

  {
    id: 'experience-deloitte',
    category: 'experience',
    title: 'Experience — Data Analytics Job Simulation, Deloitte (via Forage)',
    content: `Role: Data Analytics Job Simulation at Deloitte (via Forage), 2025.

Key contributions:
- Unified conflicting JSON telemetry streams from manufacturing machines using Python/Pandas into a clean analysis-ready dataset
- Built an interactive Tableau dashboard visualizing factory failure rates and downtime trends for predictive maintenance
- Analyzed raw web server logs to detect anomalous automated login patterns and isolate a suspected breach IP
- Ran a gender pay equity analysis using Excel PivotTables and XLOOKUP across roles and departments`,
    keywords: [
      'deloitte', 'forage', 'experience', 'work', 'job simulation',
      'data analytics', 'tableau', 'python', 'pandas', 'telemetry',
      'dashboard', 'predictive maintenance', 'security', 'pay equity',
    ],
  },

  // ── Projects ────────────────────────────────────────────────
  {
    id: 'project-floq',
    category: 'project',
    title: 'Floq — Real-Time Ride-Matching Engine (Carpooling System) — LIVE',
    content: `Floq is Manav's most advanced system — a real-time ride-matching/carpooling engine. Tech stack: Node.js, PostgreSQL, Redis, Socket.io.

Technical details:
- Managed ride lifecycles with a Finite State Machine (FSM)
- Prevented double-matching race conditions using Redis SET NX PX distributed locks with Lua atomic release, plus PostgreSQL FOR UPDATE SKIP LOCKED row-level locking — two layers of concurrency safety
- Read-through cache pattern using Redis to cut PostgreSQL read latency
- Pub/Sub architecture via Socket.io for real-time event-driven dispatching and live location updates
- JWT-based authentication for riders/drivers
- Built the actual matching engine with a constrained backtracking algorithm that generates pickup/drop-off permutations — pruned the search space from 40,320 down to 2,520 for 4 riders under a 30% max-detour constraint
- Optimized multi-rider connectivity validation by replacing higher-order array allocations with single-pass manual loops and Int32Array — benchmarked a 4.8x speedup (34.3ms -> 7.1ms for 10k iterations) using process.hrtime
- Wrote 108 integration tests covering FSM state transitions, Pub/Sub cascade cancellations, read-through cache invalidation timing, and identical-coordinate reuse attacks — 100% pass rate

This is NOT just a normal carpooling app — it's built like real infrastructure: distributed locking, race-condition handling, and algorithmic route optimization, not a CRUD app with a map on top.`,
    keywords: [
      'floq', 'carpooling', 'ride', 'matching', 'real-time', 'redis',
      'postgresql', 'socket.io', 'node.js', 'fsm', 'finite state machine',
      'distributed locks', 'race condition', 'backtracking', 'algorithm',
      'pub/sub', 'jwt', 'cache', 'integration tests', 'benchmark',
      'concurrency', 'live', 'flagship',
    ],
  },

  {
    id: 'project-scales',
    category: 'project',
    title: 'SCALES v3.0 — Automated Short-Answer Grading Engine',
    content: `SCALES v3.0 is an automated short-answer grading engine. Tech stack: FastAPI, LiteLLM, HuggingFace Transformers, pytest.

Technical details:
- Designed a Consistency-Based Trust Estimation (CBTE) pipeline to fix a circular-dependency failure from v2.0, where confidence scoring had been trained on the LLM's own ~15,000 pseudo-labels and learned to trust its own hallucinations
- Built a 3-tier trust verification system: exact evidence-span substring matching, NLI entailment checking via cross-encoder/nli-deberta-v3-base, and synonym-based stability re-prompting — low-trust grades get deferred to human review instead of guessing
- Architected a model-agnostic grading pipeline via LiteLLM (Gemini 3.1 Flash-Lite), decomposed into independent stages: CERA (concept extraction) -> CGR (concept grading) -> CBTE (trust scoring) -> Aggregator
- Achieved deterministic, reproducible scoring with a tuned trust threshold (tau = 0.5) and full pytest coverage across the grading pipeline`,
    keywords: [
      'scales', 'grading', 'automated', 'short-answer', 'fastapi',
      'litellm', 'huggingface', 'transformers', 'pytest', 'cbte',
      'trust estimation', 'nli', 'entailment', 'deberta', 'llm',
      'hallucination', 'ai', 'ml', 'machine learning',
    ],
  },

  {
    id: 'project-pip-rag',
    category: 'project',
    title: 'PIP-RAG — Placement Intelligence RAG System',
    content: `PIP-RAG is a real conversational RAG system Manav built and shipped. Tech stack: FastAPI, Qdrant, Gemini API.

Technical details:
- Grounds LLM responses in retrieved interview questions and company data using Qdrant vector search + Gemini text-embedding-004 embeddings
- Indexed 226 companies with metadata-grounded top-6 chunk retrieval and hard CGPA-eligibility filters applied directly at the vector search layer
- Exposes conversational Q&A, gap-analysis, and eligibility-shortlisting as separate FastAPI endpoints
- Designed a custom API key rotation layer across 5-6 Gemini keys to scale free-tier throughput to ~7,500 requests/day, bypassing per-key rate limits — instead of one key choking, rotate across several and load-balance requests

Note: This portfolio's own chat system is NOT vector-based RAG — it uses a lightweight in-memory RAG approach because there's much less data. PIP-RAG uses Qdrant because 226 companies' worth of placement data is actually too much for in-memory search.`,
    keywords: [
      'pip-rag', 'rag', 'placement', 'intelligence', 'qdrant', 'vector',
      'embedding', 'gemini', 'fastapi', 'interview', 'companies',
      'cgpa', 'api key rotation', 'rate limits', 'hack', 'throughput',
      'conversational', 'retrieval',
    ],
  },

  {
    id: 'project-olist',
    category: 'project',
    title: 'Olist E-Commerce Customer & Operations Analytics',
    content: `Olist Analytics is a data analytics project. Tech stack: Python, DuckDB, Tableau.

Technical details:
- Merged and cleaned 9 relational tables spanning 96,095 unique customers, resolving nulls across delivery timestamps, payment values, and review scores
- RFM segmentation revealed 48% of customers as "Lost" and only 2% as Loyal/Champions — directly informed a re-engagement recommendation targeting 46,000+ churned buyers
- Quantified delivery delay impact: late orders averaged 2.5/5 stars vs 4.1/5 for on-time deliveries (a 39% satisfaction drop) — surfaced SLA enforcement as the highest-ROI operational fix
- Wrote 4 DuckDB SQL queries using window functions (LAG, RANK) to derive MoM revenue growth, AOV by state, top-10 GMV categories, and seller performance rankings
- Built a 4-view interactive Tableau Public dashboard: RFM distribution, revenue by category, state-level order heatmap, delay-vs-review correlation`,
    keywords: [
      'olist', 'e-commerce', 'analytics', 'data', 'python', 'duckdb',
      'tableau', 'rfm', 'segmentation', 'customers', 'sql', 'dashboard',
      'delivery', 'operations', 'revenue', 'window functions',
    ],
  },

  {
    id: 'project-nyc-taxi',
    category: 'project',
    title: 'NYC Taxi Demand & Operations Analytics',
    content: `NYC Taxi Analytics is a data analytics project. Tech stack: Python, BigQuery, Folium.

Technical details:
- Ingested 9.38M raw trip records (Jan-Mar 2023) via PyArrow iter_batches() chunked processing; applied IQR-based outlier capping on fare and distance, yielding a 540K-row clean dataset
- Identified citywide peak demand at Thursday 6PM; BigQuery analysis revealed Saturday 1AM surges of 260-490 trips/hour concentrated in nightlife zones (148, 79)
- Engineered a surge proxy metric via BigQuery window functions (PERCENTILE_CONT at 90th percentile per zone) across 3 CTEs, flagging the top 20 high-frequency surge windows
- Discovered card payments averaged a 25.2% tip rate vs $0.00 recorded for cash trips — recommended in-app payment nudges to improve driver earnings visibility
- Generated an interactive Folium choropleth map from TLC shapefiles (EPSG:4326), visualizing pickup density and revenue concentration across all 263 NYC taxi zones`,
    keywords: [
      'nyc', 'taxi', 'demand', 'analytics', 'data', 'python', 'bigquery',
      'folium', 'pyarrow', 'surge', 'choropleth', 'map', 'trips',
      'tip', 'payment', 'window functions', 'operations',
    ],
  },

  {
    id: 'projects-other-web',
    category: 'project',
    title: 'Other Web Development Projects',
    content: `Manav has also built several other full-stack web projects:

1. Campus Marketplace — full-stack second-hand marketplace for students. Google OAuth + JWT authentication, protected routes, RESTful APIs, frontend/backend deployed independently for scalability.

2. Housekeeping Management System — MERN-based system for managing service requests and workflows. Structured DB schema, CRUD APIs.

3. Medicine Price Comparator — medicine comparison platform. JWT authentication, RESTful APIs, favorites feature.

These are supplementary projects demonstrating breadth in full-stack web development beyond his flagship systems.`,
    keywords: [
      'campus marketplace', 'housekeeping', 'medicine', 'comparator',
      'web', 'mern', 'oauth', 'jwt', 'crud', 'restful', 'full-stack',
      'other projects', 'more projects',
    ],
  },

  // ── Skills ──────────────────────────────────────────────────
  {
    id: 'skills',
    category: 'skills',
    title: 'Technical & Soft Skills',
    content: `Manav Bhullar's complete skill set:

Languages: JavaScript, Python, C++, SQL, R

Web & Backend: React.js, Node.js, Express.js, Socket.io, FastAPI, HTML, CSS

AI/ML: LiteLLM, HuggingFace Transformers, Gemini API, Qdrant (Vector DB), RAG, NLI/Embeddings, TensorFlow, scikit-learn, GitHub Copilot

Databases: PostgreSQL, MongoDB, Redis, Prisma ORM, DuckDB, Google BigQuery

Data & Analytics: Pandas, NumPy, Matplotlib, Seaborn, Folium, PyArrow, Tableau, Excel, Jupyter Notebook, EDA, RFM Segmentation, Feature Engineering, Statistical Analysis

Tools & Testing: Git, GitHub, Docker, Postman, Jest, pytest, Vercel, Render

Soft Skills: Communication, Problem-Solving, Adaptability, Learning Agility, Teamwork, Ownership`,
    keywords: [
      'skills', 'languages', 'javascript', 'python', 'c++', 'sql', 'react',
      'node', 'express', 'fastapi', 'tensorflow', 'pandas', 'numpy',
      'docker', 'git', 'jest', 'pytest', 'databases', 'tools',
      'web', 'backend', 'ai', 'ml', 'data', 'analytics', 'soft skills',
      'technologies', 'tech stack',
    ],
  },

  // ── Personal ────────────────────────────────────────────────
  {
    id: 'personal-interests',
    category: 'personal',
    title: 'Personal Interests & Hobbies',
    content: `Manav's interests outside of engineering are reading and fitness. He likes keeping his mind and body both in shape — it's part of how he stays sharp for deep technical work.`,
    keywords: [
      'interests', 'hobbies', 'reading', 'fitness', 'personal', 'fun',
      'outside', 'free time',
    ],
  },

  {
    id: 'why-hire-me',
    category: 'personal',
    title: 'Why Hire Manav Bhullar',
    content: `Why hire Manav: He doesn't stay in one lane — he ships production-grade systems across full-stack, AI/ML, and data analytics, and he backs every claim with real numbers (test counts, benchmarks, throughput). He goes deep on the hard engineering problems (race conditions, algorithmic optimization, trust estimation in LLM pipelines) instead of settling for the surface-level version.

What kind of project makes him say "yes" immediately: anything with a genuinely hard concurrency, algorithmic, or trust/verification problem at its core — not another CRUD app.`,
    keywords: [
      'hire', 'why', 'value', 'strengths', 'pitch', 'unique',
      'what excites', 'motivation', 'yes immediately',
    ],
  },

  {
    id: 'contact',
    category: 'personal',
    title: 'Contact Information',
    content: `Manav Bhullar's contact information:
- GitHub: https://github.com/manav-bhullar
- LinkedIn: https://linkedin.com/in/manav-bhullar
- Email: manavbhullar2004@gmail.com
- Location: Patiala, Punjab, India

He is happy to connect and discuss potential collaborations, projects, or opportunities.`,
    keywords: [
      'contact', 'email', 'github', 'linkedin', 'reach', 'connect',
      'hire', 'location', 'social',
    ],
  },

  {
    id: 'crazy-hack',
    category: 'personal',
    title: 'Craziest Engineering Hack — API Key Rotation',
    content: `The craziest engineering hack Manav has pulled off: On PIP-RAG, his placement-intelligence RAG system, he hit Gemini's free-tier rate limits fast once real usage kicked in. So he built a custom API key rotation layer across 5-6 Gemini keys — load-balancing requests across all of them to scale free-tier throughput to ~7,500 requests/day, completely bypassing the per-key limit. No paid tier, no downtime, just distributing the load. Probably the hackiest-but-most-effective thing he's shipped.`,
    keywords: [
      'crazy', 'craziest', 'hack', 'rate limit', 'api key', 'rotation',
      'gemini', 'throughput', 'clever', 'creative', 'fun', 'story',
    ],
  },
];
