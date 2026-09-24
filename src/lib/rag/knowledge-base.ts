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
  /**
   * For a sub-topic document, the id of its overview document (e.g. the
   * Floq concurrency doc is part of 'project-floq-overview'). Documents with
   * a shared overview form a family: "tell me everything about X" retrieves
   * the whole family, and "list all projects" retrieves only overviews.
   */
  partOf?: string;
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
    id: 'education-tiet',
    category: 'background',
    title: 'Education — Thapar Institute of Engineering and Technology (TIET)',
    content: `Degree: Bachelor of Engineering (B.E.) in Computer Engineering
Institution: Thapar Institute of Engineering and Technology (TIET), Patiala, Punjab, India
Duration: 2023 – 2027

Relevant Coursework & Academic Foundations:
- Core Computer Science: Operating Systems, Object-Oriented Programming (OOP), Database Management Systems (DBMS), Computer Networks, Software Engineering, Data Structures & Algorithms.
- Data Science & AI: Foundations of Data Science, Predictive Analytics Using Statistics, Data Science (Computer Vision & Natural Language Processing), Machine Learning.
- Systems Engineering: Concurrent Programming, Distributed Computing Concepts, Relational Data Modeling, API Design & Scalability.`,
    keywords: [
      'education', 'degree', 'b.e.', 'btech', 'college', 'university',
      'thapar', 'tiet', 'patiala', 'computer engineering', 'coursework',
      'courses', 'subjects', 'graduation', '2027', 'academics',
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
    partOf: 'project-floq-overview',
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
    partOf: 'project-floq-overview',
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
    partOf: 'project-floq-overview',
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
    partOf: 'project-floq-overview',
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
    partOf: 'project-floq-overview',
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
- Architected a model-agnostic grading pipeline via LiteLLM (Gemini 3.1 Flash-Lite), decomposed into independent stages: CERA (concept extraction) -> CGR (concept grading) -> CBTE (trust scoring) -> SHRR (selective human review) -> Aggregator
- Achieved deterministic, reproducible scoring with a tuned trust threshold (tau = 0.5) and full pytest coverage across the grading pipeline`,
    keywords: [
      'scales', 'grading', 'automated', 'short-answer', 'fastapi',
      'litellm', 'huggingface', 'transformers', 'pytest', 'cbte',
      'trust estimation', 'nli', 'entailment', 'deberta', 'llm',
      'hallucination', 'ai', 'ml', 'machine learning',
    ],
  },

  {
    id: 'project-scales-cbte',
    category: 'project',
    partOf: 'project-scales',
    title: 'SCALES v3.0 — Consistency-Based Trust Estimation (CBTE) & 3-Tier Verification',
    content: `CBTE (scales/modules/cbte.py) is SCALES v3.0's core safety engine, replacing LLM self-confidence with a 3-tier external verification cascade:

Tier 1 — Zero-Cost Deterministic String & Keyword Verification:
- Verbatim Evidence Span Checking (verify_evidence): Enforces a hard veto (trust = 0.0, immediate DEFER) if the LLM's cited student evidence span is not an exact verbatim substring of the student's raw answer (eliminating hallucinated quotes).
- Fuzzy Keyword Grounding (fuzzy_keyword_match): Matches expected keywords and acceptable variants against student text (tier1_keyword_threshold = 0.3).
- Fast-Accepts: Confirmed ABSENT verdicts with low keyword presence are fast-accepted at trust = 0.90; high-keyword verified non-ABSENT answers are fast-accepted at trust = 0.85.

Tier 2 — DeBERTa NLI Cross-Encoder Entailment:
- Evaluates escalated judgments using cross-encoder/nli-deberta-v3-base.
- Constructs bare knowledge-point hypotheses (preventing neutral-label collapse caused by meta-prompting prefixes) and computes directional entailment/contradiction probabilities.
- If NLI score >= tier2_nli_threshold (0.70), judgment is accepted at Tier 2.

Tier 3 — Multi-Signal Weighted Aggregation & Deferral:
- Computes composite trust: trust = (0.4 * nli_score) + (0.3 * stability_score) + (0.3 * keyword_score).
- Compares against tuned threshold tau = 0.50. If trust < tau, marks the judgment as TrustDecision.DEFER for human teacher review.

Cohort Absent Audit (TC-012):
- Post-batch statistical audit across the whole student cohort. If >= 70% of students (min cohort >= 4) are auto-accepted ABSENT for a concept, the concept is flagged as mis-specified/unearnable and all associated judgments are escalated to DEFER for teacher review.`,
    keywords: [
      'scales', 'cbte', 'trust estimation', 'trust', 'verification',
      'nli', 'deberta', 'cross-encoder', 'entailment', 'evidence span',
      'hallucination', 'keyword grounding', 'deferral', 'defer',
      'human review', 'threshold', 'cohort audit', 'tier',
    ],
  },

  {
    id: 'project-scales-pipeline-modules',
    category: 'project',
    partOf: 'project-scales',
    title: 'SCALES v3.0 — CERA, CGR, SHRR, Aggregator & State Persistence',
    content: `Detailed breakdown of SCALES v3.0's modular pipeline components:

1. CERA (Concept Extraction from Reference Answer):
- Parses questions, reference answers, and rubrics into discrete CQATuple instances.
- Extracts discrete mark allocations, evidence_facets, evidence_role (synonym_set, all_facets, min_count_set), expected_keywords, acceptable_variants, and partial_credit_rule.
- Strict regex validation prevents prose AND-chain contamination and fake partial credit strings.

2. CGR (Concept-Level Grading & Reasoning):
- Grades a student answer against one CQA at a time to prevent cross-concept bias.
- Enforces strict discrete mark clamping: marks_awarded is clamped to allowed fractional steps (0.0, 0.5, 1.0 * max_marks) using _clamp_marks.
- Outputs structured Verdict (FULL, PARTIAL, INCORRECT, ABSENT), verbatim evidence spans, reasoning, and counter-arguments.

3. SHRR (Selective Human Review Resolution):
- Constructs an interactive queue of deferred items for teacher review.
- Records TeacherCorrection actions: AGREE, UPGRADE, DOWNGRADE, OVERRIDE, validating marks against allowed discrete rubric intervals.

4. Aggregator & ExamStore:
- Aggregator performs pure deterministic arithmetic summation of auto-accepted and teacher-corrected concept marks, bounding overall question trust to min(concept_trust_scores).
- ExamStore provides resilient JSON state persistence, enabling full grading batches to pause, resume, and generate pre-grade calibration reports.`,
    keywords: [
      'scales', 'cera', 'cgr', 'shrr', 'aggregator', 'examstore',
      'pipeline', 'modules', 'concept extraction', 'rubric', 'cqatuple',
      'grading', 'marks', 'partial credit', 'teacher review',
      'persistence', 'pydantic', 'verdict',
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

Note: This portfolio's own chat system previously used a lightweight in-memory RAG approach, but has now been upgraded to a Pinecone-based vector RAG system to support the growing knowledge base. PIP-RAG uses Qdrant because 226 companies' worth of placement data requires a dedicated vector store.`,
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
    id: 'project-ai-portfolio-rag',
    category: 'project',
    title: "AI Portfolio RAG — This Portfolio's Own Chatbot",
    url: 'https://github.com/manav-bhullar/portfolio_rag',
    content: `Most portfolios are a page you scroll. Manav wanted one you could interrogate: ask it anything about his work and get an answer grounded in his real projects, with sources. So this site is itself a RAG (Retrieval-Augmented Generation) system, built with Next.js 15 on Vercel's Edge runtime, the Vercel AI SDK, Google Gemini, and Pinecone as the vector database.

Here is what happens when you ask a question. A small router model (gemini-3.5-flash-lite) first decides whether it needs a search at all: "hi" and "what's the weather?" don't. The question is then embedded with gemini-embedding-2, matched against a hand-written knowledge base in Pinecone, re-ranked with 75% meaning similarity and 25% exact keyword and title matching, and filtered by a relevance threshold measured on a test set. Only then does gemini-3.6-flash write the answer, citing every claim as [citation: source_id]. Open "Under the hood" below any answer to watch it happen.

The first version worked, and was quietly wrong in three ways Manav only found by reading real answers: the database held documents that no longer existed in the code, every question received about twenty documents whether they were relevant or not, and the smarter routing he added briefly made answers fail on the free-tier quota. Each became a story of its own: the ghost documents, twenty documents for every question, and the quota crash.

The ending is measured, not claimed. On a 46-question test set, retrieval went from finding 87.4% of the right documents at 70.0% precision to 95.8% at 89.9%, with every routing decision correct. Around it: rotation across a pool of Gemini API keys, an Upstash Redis rate limiter, and an Edge deployment pinned near Pinecone's us-east-1.

Ask this chatbot how it works, and the answer is a live demonstration of the thing being described.`,
    keywords: [
      'ai portfolio rag', 'this chatbot', 'how does this work',
      'this website', 'this portfolio', 'rag', 'retrieval', 'pinecone',
      'embeddings', 'gemini', 'vector search', 'architecture', 'meta',
      'how were you built', 'citations', 'key rotation', 'rate limiting',
      'redis', 'upstash', 'edge', 'vercel', 'next.js', 'story',
    ],
  },

  {
    id: 'project-ai-portfolio-rag-ghost-documents',
    category: 'project',
    partOf: 'project-ai-portfolio-rag',
    title: "AI Portfolio RAG — The Ghost Documents (Keeping the Index in Sync)",
    url: 'https://github.com/manav-bhullar/portfolio_rag',
    content: `One day this chatbot answered a question about Floq by citing "Dynamic Greedy Trip Expansion & Pareto Fare Invariance", a document that existed nowhere in the code: not on any branch, not in the commit history.

Manav wrote a read-only audit that listed every record in Pinecone and compared it with the knowledge base in the repository: 37 records in the database, 29 in the code. Eight ghost documents were being retrieved and quoted to visitors, and no code review could have seen them. The cause was simple: ingestion only ever added and updated records. It never deleted anything. The audit exposed two quieter bugs as well: the keyword lists written for every document had never been uploaded, so the "hybrid" search was really title-only, and queries ignored the namespace that ingestion wrote to.

He reviewed each ghost by hand. Three were accurate and came home into the repository (two SCALES deep-dives and his education record); five were outdated or wrong and were removed.

The fix was a principle, not a patch: the repository is the single source of truth. Every build now syncs instead of appending. Each chunk's ID contains a fingerprint of its content, so unchanged text is never re-embedded, changed text gets a new ID, and anything in Pinecone that isn't in the code is pruned, after a dry run shows exactly what would go. As a bonus, ingestion became incremental, which matters if the knowledge base grows to tens of megabytes.

The lesson: a stale record in a vector database is a hallucination source that code review can't see.`,
    keywords: [
      'ghost documents', 'stale records', 'orphan', 'index sync', 'pruning',
      'prune', 'ingestion', 'incremental', 'source of truth', 'pinecone',
      'audit', 'keywords bug', 'namespace', 'debugging', 'story',
      'this chatbot',
    ],
  },

  {
    id: 'project-ai-portfolio-rag-relevance',
    category: 'project',
    partOf: 'project-ai-portfolio-rag',
    title: "AI Portfolio RAG — Twenty Documents for Every Question (Measuring Relevance)",
    url: 'https://github.com/manav-bhullar/portfolio_rag',
    content: `Look under the hood of an early answer about Floq and you'd find twenty retrieved documents: the six about Floq, plus SCALES, Olist, NYC Taxi and "Why hire Manav". The rule was "the top 6, plus anything scoring at least 0.3", sensible on paper. But Gemini embeddings give even unrelated text a similarity of about 0.45, so nothing was ever filtered out. Every question, even "what's the weather?", received the whole pile.

Manav's first instinct was to pick a better number. Instead he built a test set: 46 questions, each listing the documents it should retrieve, covering specific questions, broad ones, follow-ups, off-topic questions and small talk. Measuring revealed a clean gap: off-topic questions never scored above 0.536, and the weakest genuinely relevant match scored 0.605. The threshold became 0.57, chosen by data rather than intuition.

That answers "is anything relevant at all?". A second rule answers "which documents belong together?": keep what scores within 0.1 of the best match, between 2 and 6 documents. Some questions weren't similarity problems at all. "Tell me everything about Floq" now pulls Floq's whole family of six documents, and "what projects have you built?" fetches one overview per project, going from 2 of 7 projects found to 7 of 7. His own name turned out to be noise too: it appears in every document, so it pushed "About Manav" into nearly every answer until the search learned to ignore it.

The first measured version found 87.4% of the right documents at 70.0% precision; the tuned version found 98.6% at 91.4%.

The lesson: "top-k" is a guess, and a measured threshold is a decision.`,
    keywords: [
      'relevance', 'threshold', 'top-k', 'retrieval quality', 'evaluation',
      'test set', 'golden set', 'recall', 'precision', 'calibration',
      'hybrid search', 'parent-child', 'measured', 'story', 'this chatbot',
    ],
  },

  {
    id: 'project-ai-portfolio-rag-routing',
    category: 'project',
    partOf: 'project-ai-portfolio-rag',
    title: "AI Portfolio RAG — The Quota Crash (Routing Every Question)",
    url: 'https://github.com/manav-bhullar/portfolio_rag',
    content: `Not every message deserves a search. "Hi" doesn't, "what's the weather in Delhi?" doesn't, and "compare Floq and SCALES" deserves two. So Manav added a router: a small AI call that reads each message and decides whether to skip the search, search once, split a comparison into one search per project, list a whole category, or rewrite a follow-up like "how did you test it?" into "how was Floq tested?". On the test set it routed all 46 questions correctly.

Then, testing the live preview, answers began failing with "quota exceeded". The router ran on the same model as the answers, and on the free tier that model allows only 20 requests per day per key, so every message was spending the scarcest resource twice. In the same session, "compare Floq and SCALES" produced a Floq deep-dive card and no comparison, because the answer model reached for a single-project tool that ends its turn.

The turning point was a trade-off made on purpose: the router moved to a cheaper model with its own quota (gemini-3.5-flash-lite), and the deep-dive tool was limited to one project. The test set caught the cost immediately. The cheaper model shortened questions too much ("What does CERA do in SCALES?" became "CERA in SCALES"), and recall fell from 98.6% to 90.3%. The fix: keep questions that already make sense as they are, and search the visitor's original wording alongside the rewrite. Recall came back to 95.8%. If the router is ever slow or out of quota, simple rules take over and still find 94.4% of the right documents.

The lesson: a helper model must never spend the main model's budget, and every model swap gets re-measured.`,
    keywords: [
      'router', 'routing', 'query rewriting', 'follow-up', 'quota',
      'rate limit', 'free tier', 'gemini-3.5-flash-lite', 'trade-off',
      'comparison', 'fallback', 'regression', 'story', 'this chatbot',
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
- LinkedIn: https://www.linkedin.com/in/manav-bhullar-a27a0b282/
- Email: manavbhullar341@gmail.com
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
    content: `The craziest engineering hack Manav has pulled off: building and scaling his RAG systems and LLM applications, he hit Gemini's free-tier rate limits fast once real usage kicked in — one key just couldn't keep up. So he built a custom API key rotation layer across several Gemini keys, load-balancing requests across all of them instead of paying up. No paid tier, no downtime, just distributing the load.

This exact technique is running live right now: this portfolio's own chatbot rotates across 9 Gemini API keys server-side, with keys that hit a rate limit automatically put on cooldown so future requests skip them instead of failing. It first proved out on his standalone RAG project PIP-RAG, scaling free-tier throughput there to ~7,500 requests/day.`,
    keywords: [
      'crazy', 'craziest', 'hack', 'rate limit', 'api key', 'rotation',
      'gemini', 'throughput', 'clever', 'creative', 'fun', 'story',
      'this chatbot', 'this portfolio', 'cooldown',
    ],
  },

  {
    id: 'crazy-hack-remote-workspace',
    category: 'personal',
    title: 'Craziest Engineering Hack — The Hybrid Interrupt Remote Workspace',
    content: JSON.stringify({
      the_local_execution_trap: "When building on Antigravity 2.0 (which lacked native SSH remote environment support), Manav mounted his Ubuntu server locally onto his Mac using SMB over a Tailscale mesh network. However, executing builds (npm, cargo) locally on the SMB drive forced the Mac's CPU to do heavy compilation, causing overheating and massive I/O overhead on Tailscale.",
      the_hybrid_protocol: "He architected a strict hybrid workflow: file reads and edits happen instantly over the local SMB mount, but 100% of actual compute (builds, git operations) is securely routed through remote SSH terminal commands directly to the Ubuntu server.",
      the_brittle_connection: "The SMB connection dropped frequently. A cron-style polling script with Exponential Backoff safely remounted it, but caused sluggishness—waiting minutes for the backoff polling loop to reconnect after opening the laptop.",
      the_aha_moment: "Frustrated by software polling lag, Manav drew inspiration from low-level OS hardware interrupts: if a keyboard doesn't poll the CPU to say a key was pressed, a script shouldn't poll the network.",
      the_zero_latency_deep_dive: "He engineered a bidirectional, event-driven bridge. On the Mac, native macOS kernel interrupts (launchd WatchPaths) instantly trigger a remount the millisecond the Wi-Fi state changes. On the Ubuntu side, a systemd daemon monitors kernel routing tables. The exact second the server regains internet, it shoots a microscopic TCP ping over Tailscale back to a custom, 0-CPU Swift socket listener on the Mac.",
      impact: "A flawless remote workspace that protects the Mac's CPU from heavy compilation, yet reconnects instantly the exact millisecond the laptop opens or the server boots up. Zero polling, zero wasted CPU, pure event-driven engineering."
    }, null, 2),
    keywords: [
      'crazy', 'craziest', 'hack', 'antigravity', 'ssh', 'remote workspace', 'smb', 'tailscale',
      'polling', 'interrupts', 'launchd', 'macOS', 'ubuntu', 'systemd', 'tcp', 'socket', 'creative',
      'event-driven', 'exponential backoff', 'cron', 'engineering', 'zero-latency'
    ],
  },

  // ── Deep Personal Context & Behavioral Grit (Structured) ─────────
  {
    id: 'personal-origin-story',
    category: 'personal',
    title: 'The Origin Story: How Manav Started Coding',
    content: JSON.stringify({
      phase_1_curiosity: "Started well before programming. Fascinated by computers and games. By 10th grade, began modifying, rooting, and patching Android phones to understand what happened underneath the UI.",
      phase_2_catalyst: "Harvard's CS50 was the exact moment programming logic clicked. It gave structure to the raw curiosity, showing that programming isn't just writing code, but breaking down complex systems.",
      core_philosophy: "Computer Engineering was a natural passion, not just a career decision. It is the combination of early technological curiosity and a structured problem-solving mindset."
    }, null, 2),
    keywords: [
      'origin story', 'started coding', 'how', 'why', 'cs50', 'harvard', 
      'custom roms', 'rooting', 'android', 'childhood', 'passion', 'computer engineering'
    ],
  },

  {
    id: 'personal-workflow',
    category: 'personal',
    title: 'Workflow & Environment Rituals',
    content: JSON.stringify({
      sensory_environment: "Minimal and clean desk. MacBook connected to a large TV for multiple screens. Lo-fi music playing in the background. Only water (not a coffee person).",
      trigger_for_deep_work: "Finding a problem I genuinely want to solve, especially one I personally experienced (e.g., building a Gemini/Google Sheets workflow to manage placement forms because I kept forgetting them).",
      focus_duration: "Once genuinely hooked, working continuously for 3-4 hours feels effortless. Phone is only used for project-related tasks.",
      work_philosophy: "Deepest focus comes from intense curiosity about a problem, not from forcing a fixed number of hours."
    }, null, 2),
    keywords: [
      'workflow', 'environment', 'desk setup', 'deep work', 'music', 
      'lo-fi', 'water', 'coffee', 'macbook', 'screens', 'focus', 'flow state', 'rituals'
    ],
  },

  {
    id: 'personal-hobbies-entropy',
    category: 'personal',
    title: 'Hobbies & Outside Learning',
    content: JSON.stringify({
      reading: {
        topics: ["Psychology", "Human Behavior", "Leadership", "Genetics"],
        parallel_to_engineering: "Understanding human behavior makes me a better engineer because software is ultimately built for people, not just machines. It shows how motivations differ and how context influences actions."
      },
      fitness: {
        activities: ["Regular training", "Running", "Physical activity"],
        parallel_to_engineering: "There is a direct connection between physical activity and mental energy. Sitting too long makes me mentally tired; exercise acts as a hard reset for clarity."
      },
      discipline_philosophy: "I am not perfectly consistent, but long-term discipline isn't about never breaking a routine—it's about the ability to return to it after a break."
    }, null, 2),
    keywords: [
      'hobbies', 'reading', 'psychology', 'human behavior', 'fitness', 
      'training', 'running', 'exercise', 'discipline', 'mental energy', 'books', 'free time'
    ],
  },

  {
    id: 'personal-learning-loop',
    category: 'personal',
    title: 'The Learning Loop & Avoiding Tutorial Hell',
    content: JSON.stringify({
      step_1_mental_model: "Understand WHY the technology exists and WHAT problem it solves. Compare it to known technologies to avoid learning APIs in isolation.",
      step_2_documentation: "Move to official documentation for core concepts. Deliberately avoid staying in 'tutorial mode' for too long.",
      step_3_build_to_break: "Start building immediately to expose real gaps in understanding. The real test is if I can think in the technology's own concepts.",
      step_4_llm_assist: "Use LLMs (ChatGPT/Gemini) to clarify concepts, compare approaches, or understand errors—never as a replacement for understanding. Step away before blindly searching for answers.",
      core_rule: "Learn enough to build, build enough to expose gaps, then learn specifically to close those gaps."
    }, null, 2),
    keywords: [
      'learning', 'framework', 'tutorial hell', 'methodology', 'documentation', 
      'llms', 'chatgpt', 'gemini', 'mental model', 'building', 'how to learn'
    ],
  },

  {
    id: 'personal-handling-pressure',
    category: 'personal',
    title: 'Handling High-Pressure Deadlines',
    content: JSON.stringify({
      rule_1: "Accept reality and stay calm. Do not pretend we have unlimited time or try to maintain the original scope at any cost.",
      rule_2: "Prioritize by impact. Critical logical/functional bugs take precedence over new features. Low-impact edge cases are deferred or documented.",
      rule_3: "Communicate early. Do not hide delays from stakeholders until the deadline; ensure everyone understands what is realistically deliverable.",
      rule_4: "Drop perfectionism. Focus shifts from the original ideal version to the best reliable version that can be shipped with the resources available."
    }, null, 2),
    keywords: [
      'pressure', 'deadline', 'stress', 'triage', 'prioritize', 
      'perfectionism', 'shipping', 'communication', 'edge cases', 'bugs'
    ],
  },

  {
    id: 'personal-handling-pushback',
    category: 'personal',
    title: 'Handling Non-Technical Pushback',
    content: JSON.stringify({
      situation: "A non-technical stakeholder requests a feature or architectural approach that is technically infeasible or introduces unacceptable trade-offs.",
      behavior_1_separate: "Separate the technical disagreement from the person. Understand their underlying outcome, as their requested feature is just one way to achieve it.",
      behavior_2_explain_impact: "Avoid technical jargon. Translate the limitation into business impact (e.g., 'This will increase response time or maintenance cost').",
      behavior_3_explicit_tradeoff: "Make the trade-off explicit: 'We can do this, but we give up X.' If unacceptable, propose an alternative that reaches the same goal.",
      impact: "Maintains confidence in technical reasoning while treating disagreement as a healthy test of assumptions. Ensures the final solution is based on evidence, not ego."
    }, null, 2),
    keywords: [
      'pushback', 'disagreement', 'stakeholders', 'non-technical', 'communication', 
      'conflict resolution', 'trade-offs', 'assumptions', 'impact', 'sbi'
    ],
  },

  {
    id: 'ai-ux-principles',
    category: 'personal',
    title: 'Bridging AI and UX (The Agentic Future)',
    content: JSON.stringify({
      philosophy: "Artificial intelligence is useless if the user experience is alienating or introduces too much friction. A great AI product must deeply understand the broader product ecosystem and respect user psychology.",
      ux_principles: [
        "Latency Masking: Users hate waiting. Design UI states that feel instantly responsive even while backend inference is running.",
        "Streaming Responses: Always stream LLM outputs to provide immediate visual feedback rather than blocking on full generation.",
        "Maintaining Determinism: AI is naturally non-deterministic, but UI interactions must remain predictable and deterministic so the user feels in control.",
        "Clear Escape Hatches: Always provide users with manual fallbacks or 'escape hatches' to bypass AI features entirely when the AI inevitably fails or hallucinates."
      ]
    }, null, 2),
    keywords: [
      'ai', 'ux', 'user experience', 'design', 'agentic future', 'latency masking', 
      'streaming', 'determinism', 'escape hatches', 'product', 'friction', 'philosophy'
    ],
  }
];
