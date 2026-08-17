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
  tags?: string[];
  url?: string;
  date?: string;
  metadata?: Record<string, unknown>;
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
    id: 'project-floq-overview',
    category: 'project',
    title: 'Floq — Real-Time Ride-Matching Engine (Overview)',
    content: `Floq is Manav's flagship system — a real-time ride-matching/carpooling engine built with Node.js, PostgreSQL, Redis, and Socket.io. This document provides the high-level overview.

Instead of a standard CRUD app, Floq is built like real infrastructure. It handles live ride requests, computes optimal multi-rider routes using a constrained backtracking algorithm, and dispatch notifications in real-time. It uses a Finite State Machine (FSM) to manage ride lifecycles (PENDING -> MATCHED -> IN_PROGRESS -> COMPLETED) and relies heavily on Redis for distributed locking, rate limiting, and read-through caching.`,
    keywords: [
      'floq', 'carpooling', 'ride', 'matching', 'overview', 'real-time',
      'node.js', 'postgresql', 'redis', 'socket.io', 'fsm', 'flagship',
    ],
  },

  {
    id: 'project-floq-concurrency',
    category: 'project',
    title: 'Floq — Concurrency & Distributed Locks',
    content: `Floq is a real-time ride-matching engine. This document details its concurrency and distributed locking architecture.

To prevent race conditions during the matching cycle (where two cron instances might try to match the same riders simultaneously), Floq uses two layers of concurrency safety:
1. Distributed Lock (Redis): The cron scheduler acquires a Redis \`SET NX PX\` lock (\`matching:cron:lock\` with a 5-minute TTL) before running a batch. If another instance holds the lock, it skips the cycle. This ensures only one process runs the heavy matching logic.
2. Row-Level Lock (PostgreSQL): Inside the matching transaction, it fetches PENDING ride requests using \`FOR UPDATE SKIP LOCKED\`. This guarantees that even if the Redis lock fails, the database will strictly lock the rows being matched and skip any rows already locked by another transaction, completely eliminating double-matching.`,
    keywords: [
      'floq', 'concurrency', 'race condition', 'distributed locks', 'redis',
      'postgresql', 'for update skip locked', 'set nx px', 'cron', 'scheduler',
      'double-matching', 'transaction',
    ],
  },

  {
    id: 'project-floq-matching-algorithm',
    category: 'project',
    title: 'Floq — Backtracking Matching Algorithm & Route Optimization',
    content: `Floq is a real-time ride-matching engine. This document details its core matching algorithm.

The matching engine groups riders (up to 4 per vehicle) by generating pickup/drop-off permutations. To optimize this, Floq uses a constrained backtracking algorithm. Instead of checking all (2n)! permutations, it prunes the search space by enforcing that a user's pickup must always precede their drop-off. For 4 riders, this reduces the search space from 40,320 down to just 2,520 valid sequences.

The engine also enforces a strict \`MAX_USER_DETOUR\` ratio of 30%. It calculates the haversine distance for each user's segment in the shared route and compares it to their solo direct distance. If any user experiences a detour > 30%, the permutation is rejected.`,
    keywords: [
      'floq', 'matching', 'algorithm', 'route', 'optimization', 'backtracking',
      'permutations', 'pruning', 'search space', 'detour', 'haversine',
      'distance', 'max detour',
    ],
  },

  {
    id: 'project-floq-realtime-sockets',
    category: 'project',
    title: 'Floq — Real-Time WebSockets & Cache-Aside',
    content: `Floq is a real-time ride-matching engine. This document details its WebSocket architecture.

Floq uses Socket.io for real-time dispatch and driver location tracking. When a driver emits a \`driverLocationUpdate\` (containing lat, lng, bearing), the server broadcasts this to the \`trip_{tripId}\` room so riders see the car moving on the map.

Crucially, it uses a Redis cache-aside pattern: the server caches the driver's latest location in Redis (\`driver:location:{tripId}\`) with a 60-second TTL. When a rider opens the app and joins the trip room, the server immediately fetches the location from Redis and emits it, giving the rider an instant map pin without waiting for the next GPS tick from the driver and without hammering PostgreSQL for location state.`,
    keywords: [
      'floq', 'real-time', 'websockets', 'socket.io', 'pub/sub', 'driver',
      'location', 'gps', 'redis', 'cache-aside', 'ttl', 'broadcast', 'rooms',
    ],
  },

  {
    id: 'project-floq-rate-limiting',
    category: 'project',
    title: 'Floq — Redis Rate Limiting Middleware',
    content: `Floq is a real-time ride-matching engine. This document details its API rate limiting implementation.

Floq implements a custom Redis-backed sliding/fixed window rate limiter to protect its endpoints. It uses an atomic \`INCR\` and \`EXPIRE\` strategy without needing Lua scripts. The key format is \`rl:{windowIndex}:{identifier}\`.

It has two pre-configured limiters:
1. \`authLimiter\`: Strictly caps unauthenticated IPs to 10 requests per 15 minutes to prevent brute-force attacks on login, registration, and OTP endpoints.
2. \`apiLimiter\`: Caps authenticated users to 100 requests per 1 minute for general API usage.

If Redis is unreachable (e.g. cold start), the middleware is designed to "fail open" (catch the error and call \`next()\`) to ensure the platform remains available rather than dropping legitimate traffic.`,
    keywords: [
      'floq', 'rate limiting', 'middleware', 'redis', 'incr', 'expire',
      'fixed window', 'brute-force', 'auth', 'api', 'throttle', 'fail open',
    ],
  },

  {
    id: 'project-floq-testing-performance',
    category: 'project',
    title: 'Floq — Testing & Performance Benchmarks',
    content: `Floq is a real-time ride-matching engine. This document details its testing and performance optimizations.

To optimize multi-rider connectivity validation (checking if riders overlap in the sequence), the team replaced higher-order array allocations (map/some/findIndex) with single-pass manual loops and \`Int32Array\`s. Benchmarking with \`process.hrtime\` showed a 4.8x speedup (from 34.3ms down to 7.1ms for 10,000 iterations).

For testing, Floq has a comprehensive suite of 108 integration tests with a 100% pass rate. These tests don't just mock the database; they hit a test PostgreSQL instance to verify complex behaviors like Finite State Machine (FSM) transitions, Pub/Sub cascade cancellations, read-through cache invalidation timing, and identical-coordinate reuse attacks.`,
    keywords: [
      'floq', 'testing', 'performance', 'benchmarks', 'optimization',
      'speedup', 'int32array', 'process.hrtime', 'integration tests', 'fsm',
      'coverage',
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
    content: `PIP-RAG is a real conversational RAG system Manav built and shipped. Tech stack: FastAPI, Pinecone, Gemini API.

Technical details:
- Grounds LLM responses in retrieved interview questions and company data using Pinecone vector search + Gemini gemini-embedding-2 embeddings
- Indexed 226 companies with metadata-grounded top-6 chunk retrieval and hard CGPA-eligibility filters applied directly at the vector search layer
- Exposes conversational Q&A, gap-analysis, and eligibility-shortlisting as separate FastAPI endpoints
- Designed a custom API key rotation layer across 5-6 Gemini keys to scale free-tier throughput to ~7,500 requests/day, bypassing per-key rate limits — instead of one key choking, rotate across several and load-balance requests

Note: This portfolio's own chat system is NOT vector-based RAG — it uses a lightweight in-memory RAG approach because there's much less data. PIP-RAG uses Pinecone because 226 companies' worth of placement data is actually too much for in-memory search.`,
    keywords: [
      'pip-rag', 'rag', 'placement', 'intelligence', 'pinecone', 'vector',
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

AI/ML: LiteLLM, HuggingFace Transformers, Gemini API, Pinecone (Vector DB), RAG, NLI/Embeddings, TensorFlow, scikit-learn, GitHub Copilot

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
