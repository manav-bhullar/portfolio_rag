#!/usr/bin/env python3
"""Generate a print-ready PDF overview of the Manav Bhullar AI portfolio."""

from __future__ import annotations

import os
from datetime import date

PAGE_W, PAGE_H = 595.28, 841.89  # A4
MARGIN_L, MARGIN_R = 54, 54
MARGIN_T, MARGIN_B = 64, 56
CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R

# Portfolio palette (0-1 RGB)
INK = (0.098, 0.098, 0.098)  # #191919
MUTED = (0.361, 0.349, 0.322)  # #5C5952
CARD = (0.980, 0.969, 0.937)  # #FAF7EF
SURFACE = (0.929, 0.902, 0.839)  # #EDE6D6
GREEN = (0.247, 0.702, 0.498)  # #3FB37F
ORANGE = (0.941, 0.584, 0.290)  # #F0954A
PINK = (0.878, 0.333, 0.612)  # #E0559C
BLUE = (0.243, 0.557, 0.871)  # #3E8EDE
VIOLET = (0.545, 0.373, 0.878)  # #8B5FE0
WHITE = (1, 1, 1)
RULE = (0.847, 0.816, 0.745)  # #D8D0BE


def esc(text: str) -> str:
    return (
        text.replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
        .replace("\r", "")
    )


def rgb(color: tuple[float, float, float]) -> str:
    return f"{color[0]:.3f} {color[1]:.3f} {color[2]:.3f}"


def wrap(text: str, font: str, size: float, width: float) -> list[str]:
    """Greedy wrap using approximate Helvetica widths."""
    avg = 0.50 * size if font.endswith("Bold") or "Bold" in font else 0.48 * size
    words = text.split()
    if not words:
        return [""]
    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        trial = f"{current} {word}"
        if len(trial) * avg <= width:
            current = trial
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


class PDF:
    def __init__(self) -> None:
        self.pages: list[list[str]] = []
        self.ops: list[str] = []
        self.y = PAGE_H - MARGIN_T
        self.page_num = 0

    def new_page(self) -> None:
        if self.ops:
            self.pages.append(self.ops)
        self.ops = []
        self.page_num += 1
        self.y = PAGE_H - MARGIN_T
        self.ops.append(f"{rgb(SURFACE)} rg 0 0 {PAGE_W:.2f} {PAGE_H:.2f} re f")
        # top accent bar
        self.ops.append(f"{rgb(INK)} rg 0 {PAGE_H - 8:.2f} {PAGE_W:.2f} 8 re f")
        self.ops.append(f"{rgb(GREEN)} rg 0 {PAGE_H - 11:.2f} {PAGE_W:.2f} 3 re f")
        # footer
        self.ops.append(f"{rgb(RULE)} rg {MARGIN_L:.2f} 36 {CONTENT_W:.2f} 0.6 re f")
        self._text(
            MARGIN_L,
            24,
            "Manav Bhullar  |  AI Portfolio Overview",
            "F1",
            8,
            MUTED,
        )
        self._text(
            PAGE_W - MARGIN_R - 40,
            24,
            f"Page {self.page_num}",
            "F1",
            8,
            MUTED,
        )

    def _text(
        self,
        x: float,
        y: float,
        text: str,
        font: str,
        size: float,
        color: tuple[float, float, float],
    ) -> None:
        self.ops.append(
            f"BT /{font} {size:.1f} Tf {rgb(color)} rg {x:.2f} {y:.2f} Td ({esc(text)}) Tj ET"
        )

    def ensure(self, need: float) -> None:
        if self.y - need < MARGIN_B + 8:
            self.new_page()

    def spacer(self, h: float = 10) -> None:
        self.y -= h

    def h1(self, text: str) -> None:
        self.ensure(36)
        self._text(MARGIN_L, self.y, text, "F2", 22, INK)
        self.y -= 12
        self.ops.append(
            f"{rgb(GREEN)} rg {MARGIN_L:.2f} {self.y:.2f} 72 3 re f"
        )
        self.y -= 18

    def h2(self, text: str) -> None:
        self.ensure(28)
        self.y -= 6
        self._text(MARGIN_L, self.y, text, "F2", 13, INK)
        self.y -= 8
        self.ops.append(
            f"{rgb(RULE)} rg {MARGIN_L:.2f} {self.y:.2f} {CONTENT_W:.2f} 0.5 re f"
        )
        self.y -= 14

    def h3(self, text: str) -> None:
        self.ensure(18)
        self._text(MARGIN_L, self.y, text, "F2", 11, INK)
        self.y -= 14

    def body(self, text: str, color: tuple[float, float, float] = INK, size: float = 10) -> None:
        leading = size + 3.4
        for line in wrap(text, "F1", size, CONTENT_W):
            self.ensure(leading)
            self._text(MARGIN_L, self.y, line, "F1", size, color)
            self.y -= leading
        self.y -= 4

    def bullet(self, text: str) -> None:
        leading = 13.4
        lines = wrap(text, "F1", 10, CONTENT_W - 16)
        for i, line in enumerate(lines):
            self.ensure(leading)
            if i == 0:
                self.ops.append(
                    f"{rgb(GREEN)} rg {MARGIN_L + 3:.2f} {self.y + 2:.2f} 3.2 3.2 re f"
                )
            self._text(MARGIN_L + 14, self.y, line, "F1", 10, INK)
            self.y -= leading
        self.y -= 2

    def pill_row(self, items: list[tuple[str, tuple[float, float, float]]]) -> None:
        self.ensure(22)
        x = MARGIN_L
        y = self.y
        for label, color in items:
            w = 8 + len(label) * 5.1
            if x + w > PAGE_W - MARGIN_R:
                x = MARGIN_L
                y -= 20
                self.y = y
                self.ensure(22)
                y = self.y
            self.ops.append(
                f"{rgb(color)} rg {x:.2f} {y - 3:.2f} {w:.2f} 16 re f"
            )
            self._text(x + 6, y + 1.5, label, "F2", 8, WHITE)
            x += w + 6
        self.y = y - 22

    def kv_table(self, rows: list[tuple[str, str]], col1: float = 130) -> None:
        row_h_min = 16
        for i, (left, right) in enumerate(rows):
            right_lines = wrap(right, "F1", 9.5, CONTENT_W - col1 - 12)
            h = max(row_h_min, 6 + len(right_lines) * 12)
            self.ensure(h + 2)
            bg = CARD if i % 2 == 0 else WHITE
            self.ops.append(
                f"{rgb(bg)} rg {MARGIN_L:.2f} {self.y - h + 8:.2f} {CONTENT_W:.2f} {h:.2f} re f"
            )
            self._text(MARGIN_L + 8, self.y - 2, left, "F2", 9, INK)
            ly = self.y - 2
            for line in right_lines:
                self._text(MARGIN_L + col1, ly, line, "F1", 9.5, MUTED)
                ly -= 12
            self.y -= h
        self.y -= 8

    def callout(self, title: str, body: str) -> None:
        lines = wrap(body, "F1", 9.5, CONTENT_W - 28)
        h = 28 + len(lines) * 12.5
        self.ensure(h + 8)
        yb = self.y - h + 10
        self.ops.append(
            f"{rgb(CARD)} rg {MARGIN_L:.2f} {yb:.2f} {CONTENT_W:.2f} {h:.2f} re f"
        )
        self.ops.append(
            f"{rgb(GREEN)} rg {MARGIN_L:.2f} {yb:.2f} 4 {h:.2f} re f"
        )
        self._text(MARGIN_L + 16, self.y, title, "F2", 10, INK)
        self.y -= 14
        for line in lines:
            self._text(MARGIN_L + 16, self.y, line, "F1", 9.5, MUTED)
            self.y -= 12.5
        self.y -= 14

    def finish(self) -> bytes:
        if self.ops:
            self.pages.append(self.ops)

        objects: list[bytes] = []

        def add(obj: str) -> int:
            objects.append(obj.encode("latin-1", "replace"))
            return len(objects)

        add("<< /Type /Catalog /Pages 2 0 R >>")
        kids = " ".join(f"{i} 0 R" for i in range(3, 3 + len(self.pages)))
        add(f"<< /Type /Pages /Kids [{kids}] /Count {len(self.pages)} >>")

        content_ids: list[int] = []
        for _ in self.pages:
            content_ids.append(0)  # placeholder, filled after streams reserved

        # page objects 3..n, then content streams, then fonts
        font1_id = 3 + len(self.pages) * 2
        font2_id = font1_id + 1

        streams: list[str] = []
        for ops in self.pages:
            streams.append("\n".join(ops) + "\n")

        # We build objects in order: catalog(1), pages(2), then for each page: page, content
        objects = objects[:2]
        for i, stream in enumerate(streams):
            page_id = 3 + i * 2
            content_id = page_id + 1
            page_obj = (
                f"<< /Type /Page /Parent 2 0 R "
                f"/MediaBox [0 0 {PAGE_W:.2f} {PAGE_H:.2f}] "
                f"/Contents {content_id} 0 R "
                f"/Resources << /Font << /F1 {font1_id} 0 R /F2 {font2_id} 0 R >> >> >>"
            )
            objects.append(page_obj.encode("latin-1"))
            stream_bytes = stream.encode("latin-1", "replace")
            content_obj = (
                f"<< /Length {len(stream_bytes)} >>\nstream\n".encode("latin-1")
                + stream_bytes
                + b"\nendstream"
            )
            objects.append(content_obj)

        objects.append(
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
        )
        objects.append(
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
        )

        # Fix Pages kids to actual page object numbers (3, 5, 7, ...)
        page_refs = " ".join(f"{3 + i * 2} 0 R" for i in range(len(self.pages)))
        objects[1] = (
            f"<< /Type /Pages /Kids [{page_refs}] /Count {len(self.pages)} >>".encode(
                "latin-1"
            )
        )

        out = bytearray(b"%PDF-1.4\n")
        offsets = [0]
        for i, obj in enumerate(objects, start=1):
            offsets.append(len(out))
            out.extend(f"{i} 0 obj\n".encode("latin-1"))
            out.extend(obj)
            out.extend(b"\nendobj\n")
        xref_pos = len(out)
        out.extend(f"xref\n0 {len(objects) + 1}\n".encode("latin-1"))
        out.extend(b"0000000000 65535 f \n")
        for off in offsets[1:]:
            out.extend(f"{off:010d} 00000 n \n".encode("latin-1"))
        out.extend(
            (
                f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\n"
                f"startxref\n{xref_pos}\n%%EOF\n"
            ).encode("latin-1")
        )
        return bytes(out)


def build() -> PDF:
    pdf = PDF()
    pdf.new_page()

    pdf.h1("Manav Bhullar  --  AI Portfolio")
    pdf.body(
        "Interactive conversational portfolio. Visitors talk to an AI persona of "
        "Manav; answers are grounded in a Pinecone RAG knowledge base and rendered "
        "as React cards instead of a traditional multi-page site.",
        MUTED,
        11,
    )
    pdf.pill_row(
        [
            ("Next.js 15.2.8", INK),
            ("React 19", BLUE),
            ("Gemini Flash", GREEN),
            ("Pinecone", PINK),
            ("Upstash Redis", VIOLET),
            ("PostHog", ORANGE),
        ]
    )
    pdf.body(f"Codebase overview  |  {date.today().isoformat()}  |  Source: Portfolio-main")

    pdf.callout(
        "Product idea",
        "There is no persistent nav, sidebar, or About page. Me / Projects / Skills / "
        "Fun / Contact are conversation starters. The home hero collects a question "
        "and routes to /chat?query=...",
    )

    pdf.h2("1. What this is")
    pdf.body(
        "The live product lives in Portfolio-main. A visitor lands on a single-column "
        "hero, types a question or taps a chip, and is sent into chat. From there the "
        "site is a conversation. The persona speaks in first person as Manavdeep Singh "
        "Bhullar -- Computer Engineering at Thapar Institute (TIET), Patiala, 2023-2027 "
        "-- working across full-stack, data analytics, and AI/ML."
    )
    pdf.body(
        "The persona is explicitly not a general-purpose assistant: no writing code, "
        "no trivia, deflect back to the portfolio. Design is documented in DESIGN.md: "
        "warm tan surface, cream cards, organic cookie blobs behind clean rectangles, "
        "Google Sans Flex headlines, Inter body, forced light theme."
    )

    pdf.h2("2. Visitor flow")
    pdf.kv_table(
        [
            ("1. Land  /", "Warm organic-blob hero. Search bar, five chips, welcome modal, GitHub star, Analytics button."),
            ("2. Ask  /chat", "Query auto-submits from the URL. Empty state offers a projects CTA; chips stay in the bottom bar."),
            ("3. Retrieve  POST /api/chat", "Rate limit, rewrite follow-ups, embed, Pinecone top-20, hybrid rerank, inject context."),
            ("4. Answer  Chat UI", "Gemini streams text plus at most one tool. Tools mount React cards. Citations and follow-up chips parse out of the text."),
        ],
        col1=148,
    )

    pdf.h2("3. Pages and APIs")
    pdf.kv_table(
        [
            ("/", "Landing hero. Forced light theme. Google Sans Flex display + Inter body."),
            ("/chat", "Conversational UI via useChat (Vercel AI SDK). Shows the latest turn, not a full history thread."),
            ("/analytics", "Private dashboard. Gated by ?key=manav or localStorage. Metrics from localStorage + PostHog."),
            ("POST /api/chat", "Streaming LLM: gemini-flash-latest, maxDuration 60s, 10 req / 60s per IP."),
            ("/test, /test/title", "Leftover dev pages, not part of the product."),
        ]
    )

    pdf.h2("4. The AI stack")
    pdf.h3("Models")
    pdf.bullet("Chat: gemini-flash-latest")
    pdf.bullet("Follow-up rewrite: gemini-1.5-flash (last 6 messages rewritten into a standalone query)")
    pdf.bullet("Embeddings: gemini-embedding-2, 3072 dimensions")
    pdf.bullet("API keys picked at random from every GEMINI_API_KEY* / GOOGLE_API_KEY* env var")

    pdf.h3("RAG pipeline")
    pdf.bullet("Source of truth: src/lib/rag/knowledge-base.ts -- 20 self-contained documents")
    pdf.bullet("Ingest: scripts/ingest.ts runs on every npm run build; SHA-256 cache in .rag-cache.json")
    pdf.bullet("Store: Pinecone cosine, serverless AWS, 3072-d vectors")
    pdf.bullet("Retrieve: embed query, Pinecone top 20, hybrid rerank 75% vector + 25% keyword/title")
    pdf.bullet("Keep top 6 plus anything scoring 0.3 or higher")
    pdf.bullet("Retrieved chunks merge into the single Gemini system message")
    pdf.bullet("Persona prompt holds no bio data -- all facts come from RAG")
    pdf.bullet("Retrieval failure is non-fatal: chat still runs without context")

    pdf.h3("Persona rules")
    pdf.bullet("First person as Manav; short punchy sentences; match the user's language")
    pdf.bullet("Portfolio-only -- never write code, never answer general knowledge")
    pdf.bullet("Must use retrieved numbers; must cite [citation: source_id]")
    pdf.bullet("Every text reply ends with FOLLOW_UP_QUESTIONS (2-3 items)")
    pdf.bullet("At most one tool per turn (maxSteps: 1)")

    pdf.h2("5. Chat tools map to UI cards")
    pdf.body(
        "Tool execute functions return a short string. The real payload is the client "
        "component ToolRenderer mounts from the tool name."
    )
    pdf.kv_table(
        [
            ("getPresentation", "presentation.tsx -- name, degree, Patiala, three-domain bio"),
            ("getProjects", "AllProjects + carousel -- five cards; Floq/SCALES open interactive sandboxes"),
            ("getSkills", "skills.tsx -- four color-blocked groups: web, AI, data, soft skills"),
            ("getResume", "resume.tsx -- three PDF downloads: SDE, AI/ML, Data Analyst"),
            ("getContact", "contact.tsx -- email, phone, GitHub, LinkedIn, LeetCode, Tableau"),
            ("getInterests", "interests.tsx -- reading and fitness"),
            ("getCrazy", "crazy.tsx -- Gemini API key-rotation story (~7,500 req/day)"),
        ]
    )

    pdf.h2("6. Featured projects")
    pdf.h3("Floq  --  green  --  4.8x speedup")
    pdf.body(
        "Real-time ride-matching / carpooling. Node.js, PostgreSQL, Redis, Socket.io. "
        "FSM ride lifecycle, Redis SET NX PX plus Postgres FOR UPDATE SKIP LOCKED, "
        "constrained backtracking (40,320 to 2,520 sequences, 30% max detour), "
        "cache-aside driver GPS, 108 integration tests. Expanding the card opens a "
        "backtracking sandbox."
    )
    pdf.h3("SCALES v3.0  --  orange  --  CBTE pipeline")
    pdf.body(
        "Automated short-answer grading. FastAPI, LiteLLM, HuggingFace. CBTE trust "
        "pipeline after v2 learned to trust its own hallucinations. Stages: CERA -> "
        "CGR -> CBTE -> Aggregator, tau = 0.5. Expanding the card opens a pipeline sandbox."
    )
    pdf.h3("AI Portfolio RAG  --  pink  --  vector search")
    pdf.body("This site itself. Next.js, Pinecone, Gemini, Tailwind, Vercel AI SDK.")
    pdf.h3("Olist Analytics  --  blue  --  46K+ churned buyers")
    pdf.body(
        "96,095 customers, RFM (48% Lost, 2% Loyal), late deliveries 2.5 vs 4.1 stars, "
        "DuckDB + Tableau Public dashboard."
    )
    pdf.h3("NYC Taxi Analytics  --  violet  --  9.38M records")
    pdf.body(
        "9.38M raw trips to 540K cleaned, BigQuery surge windows, Folium choropleth of "
        "263 NYC taxi zones."
    )
    pdf.body(
        "The knowledge base also still describes PIP-RAG (Qdrant + Gemini over 226 "
        "companies, CGPA filters, key rotation) and smaller MERN apps: Campus Marketplace, "
        "Housekeeping Management, Medicine Price Comparator. Those are in RAG, not on the carousel.",
        MUTED,
        9.5,
    )

    pdf.h2("7. Person and knowledge base")
    pdf.body(
        "Manavdeep Singh Bhullar -- B.E. Computer Engineering at TIET, Patiala, 2023-2027. "
        "Builds across full-stack, data analytics, and AI/ML. 400+ DSA problems. Technical "
        "Head of Virsa Society (ssavirsa.in rebuild, 20 sponsors, 4,000+ attendees). "
        "Deloitte data-analytics job simulation via Forage. Three role-specific resumes "
        "in /public: SDE, AI/ML, Data Analyst."
    )
    pdf.h3("Indexed RAG topics (20 documents)")
    pdf.kv_table(
        [
            ("Background", "about-me, achievements-certifications"),
            ("Experience", "Virsa Society, Deloitte Forage simulation"),
            ("Projects", "Floq (6 chunks), SCALES, PIP-RAG, Olist, NYC Taxi, other web"),
            ("Skills", "languages, web, AI, data, tools, soft skills"),
            ("Personal", "interests, why-hire-me, contact, crazy-hack"),
        ]
    )

    pdf.h2("8. Quota protection and analytics")
    pdf.h3("Quota")
    pdf.bullet("Upstash sliding window 10 requests / 60s per IP; in-memory fallback for local")
    pdf.bullet("Fails open if Redis errors so chat stays up")
    pdf.bullet("429 responses include Retry-After and X-RateLimit-* headers")
    pdf.h3("Analytics")
    pdf.bullet("PostHog: pageleave + chat_query_submitted with topic classification")
    pdf.bullet("Vercel Analytics on the root layout")
    pdf.bullet("localStorage ledger of queries (cap 500) and visits (cap 1000)")
    pdf.bullet("Dashboard: visitors, query count, weekly traffic, topic bars, recent ledger")
    pdf.bullet("Unlock via ?key=manav (also 1 / true). Cmd+Shift+A listener exists but is never mounted")

    pdf.h2("9. Design system")
    pdf.kv_table(
        [
            ("#EDE6D6  surface", "Page background (warm tan)"),
            ("#FAF7EF  card", "Cards and chat surfaces"),
            ("#191919  ink", "Primary text / chips"),
            ("#3FB37F  Floq green", "Focus ring, citations, Floq accent"),
            ("#F0954A  SCALES orange", "Fun chip, SCALES accent"),
            ("#E0559C  PIP-RAG pink", "Portfolio RAG accent"),
            ("#3E8EDE  Olist blue", "Projects chip"),
            ("#8B5FE0  NYC violet", "Contact chip"),
        ]
    )
    pdf.body(
        "Signature pattern: organic accent blob plus clean rectangular content. Pills, "
        "chips, and the search bar stay symmetric. Never a photorealistic face -- the MB "
        "mark is the identity treatment."
    )

    pdf.h2("10. Tests and leftover agent work")
    pdf.body(
        "tests/ is a custom four-tier harness (run-all.ts) covering rate limiting, RAG "
        "ingest/hash cache, chat route behavior, and some a11y/DOM checks, plus separate "
        "adversarial/empirical scripts. Vitest is in package.json but this runner is homemade. "
        ".agents/ is orchestration metadata from a prior mobile 100dvh + ESLint pass, not product."
    )

    pdf.h2("11. Gaps worth knowing")
    pdf.h3("Content drift")
    pdf.bullet("Carousel replaced PIP-RAG with AI Portfolio RAG; knowledge base still indexes PIP-RAG")
    pdf.bullet("Knowledge base still claims this site is in-memory RAG; it is Pinecone now")
    pdf.bullet("Emails disagree: contact.tsx uses manavbhullar341@gmail.com; RAG uses manavbhullar2004@gmail.com")
    pdf.h3("Leftovers from the original fork")
    pdf.bullet("French Chargement du chat... on the /chat suspense fallback")
    pdf.bullet("Unused getWeather tool and unused photos.tsx")
    pdf.bullet("public/ still holds another author's screenshots (pharmassist, youbot, minishell, Toukoum logo)")
    pdf.bullet("Welcome modal still says What's ???? / Why ???")
    pdf.h3("Wiring")
    pdf.bullet("AdminShortcutListener (Cmd+Shift+A) is never mounted in the layout")
    pdf.bullet("Chip questions do not match client-side mock-tool shortcuts, so those quota shortcuts almost never fire")
    pdf.bullet("ESLint is ignored during production builds (next.config.ts)")
    pdf.bullet("OneDrive conflict copies exist (Dashboard / chat Manav's MacBook Air)")

    pdf.h2("Bottom line")
    pdf.body(
        "The site is a designed chat product that is the portfolio. The interesting "
        "engineering is the RAG + tool-card loop, not a gallery of static pages. The "
        "person it represents is a TIET Computer Engineering student who wants to be "
        "evaluated on Floq, SCALES, and the analytics work -- and this repo is both "
        "the brochure and one of the projects."
    )
    pdf.callout(
        "Highest-leverage cleanup",
        "Align RAG vs carousel vs contact details, and strip the fork leftovers so a "
        "recruiter only sees Manav's work.",
    )

    return pdf


def main() -> None:
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    out = os.path.join(root, "Manav_Bhullar_Portfolio_Overview.pdf")
    pdf = build()
    data = pdf.finish()
    with open(out, "wb") as f:
        f.write(data)
    print(f"Wrote {out} ({len(data)} bytes, {len(pdf.pages)} pages)")


if __name__ == "__main__":
    main()
