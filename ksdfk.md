# PlaceHack AI

## One-click location intelligence, powered by OpenAI structured outputs and agentic engineering.

Scan your coordinates or search any place on Earth — PlaceHack AI instantly generates a structured cultural dossier covering hidden history, must-visit spots, local flavors, practical travel tips, and surprising facts. No generic summaries. No scattered tabs. One click, one deep-dive report.

---

## 🌍 The Problem

Getting a rich, accurate picture of a place is surprisingly hard. Mainstream travel guides focus on the same fifty cities. Wikipedia is shallow on districts. Blogs are SEO-filler. Pulling together real cultural depth — local history, what's worth visiting, what to eat, how to move around — requires hours of research across a dozen sources, and the result is still rarely structured or trustworthy.

This is especially true for **lesser-known districts and towns**, where mainstream coverage is thin or nonexistent.

---

## 💡 The Solution

PlaceHack AI eliminates that research gap. It uses the browser's **Geolocation API** to detect the user's precise location (reverse-geocoded to district + country in English), or accepts a manual text search for anywhere in the world. It then invokes an AI agent that produces a **magazine-quality dossier** in a single structured API call.

The output isn't a chatbot response or a free-form summary — it's a validated, schema-bound JSON document rendered into a polished UI and exportable as a PDF.

---

## 👥 Who It's For

| Audience | Use Case |
|---|---|
| **Travelers** | Instant cultural briefing before or during a trip |
| **Students & Researchers** | Quick, structured cultural and historical context |
| **Remote Workers** | Orientation for unfamiliar cities and neighborhoods |
| **Local Communities** | A fresh AI lens on their own region's history and identity |

---

## ⚙️ How It Works

```
User (browser geolocation or text search)
        │
        ▼
Reverse geocoding → district + country string
        │
        ▼
OpenAI Chat Completions (/v1/chat/completions)
  └─ Model: gpt-5-mini
  └─ Response format: strict json_schema
  └─ System prompt: PlaceHack Intelligence Agent persona
        │
        ▼
Structured JSON dossier (8 required sections)
        │
        ├─► In-memory / file cache (prevent duplicate API calls)
        ├─► Express.js + EJS UI (responsive, dark mode)
        └─► PDFKit export (downloadable report)
```

The core pipeline is intentionally simple: one structured API call, one validated JSON object, one rendered dossier. Reliability is built into the schema, not patched in afterward.

---

## 🤖 OpenAI Integration

### Model & Configuration

| Parameter | Value | Rationale |
|---|---|---|
| **Model** | `gpt-5-mini` | Strong long-form synthesis at hackathon-appropriate cost |
| **Endpoint** | `/v1/chat/completions` | Standard Chat Completions |
| **Response format** | `strict json_schema` | Guarantees parseable, UI-ready output — no regex, no fallbacks |
| **Max completion tokens** | `9000` | Reasoning models consume internal tokens; headroom prevents truncation |
| **Reasoning effort** | `low` | Reserves token budget for the output payload rather than internal chain-of-thought |
| **SDK** | `openai` (Node.js) | Official OpenAI Node.js SDK |

### Why Structured Outputs?

The entire product depends on the JSON being **exactly right** every time. Strict schema enforcement means:

- The frontend always has the fields it expects
- PDF export never breaks from a missing key
- No defensive parsing logic scattered across the codebase

The schema enforces eight required top-level sections: `title`, `subtitle`, `soul`, `history`, `must_visit`, `local_flavors`, `practical_tips`, `fun_facts`. Every field is typed, required, and validated before the response reaches the UI layer.

### The Agent Persona

The system prompt defines the **PlaceHack Intelligence Agent** as a world-class travel writer, cultural anthropologist, and historian. This produces vivid, non-generic writing with fresh historical angles — not Wikipedia-level summaries or SEO-style bullet points.

---

## 🏗️ Technical Architecture

PlaceHack AI is a full-stack **Node.js** application:

- **Backend**: Node.js + Express.js — routing, auth, API orchestration, caching, PDF export
- **AI Layer**: OpenAI Node.js SDK calling `gpt-5-mini` with strict JSON schema
- **Database**: JSON file store / SQLite — lightweight report caching to avoid redundant API calls
- **Frontend**: EJS templates + Tailwind CSS — responsive UI with dark mode support
- **PDF Export**: PDFKit — server-side report generation from the same structured dossier data
- **Geocoding**: Browser Geolocation API → reverse-geocoded to English district + country string
- **Hosting**: Render (free tier)

> ⚠️ The live demo runs on Render's free tier and may take 30–60 seconds on first load due to cold starts. The local setup below is instant.

---

## 🤝 Agentic Development

This project was co-engineered using **Codex** as an agentic pair programmer, following documented agentic workflows:

- **`AGENTS.md`** — Documents the runtime Location Intelligence Agent architecture, Mermaid sequence diagrams, configuration parameters, and system boundaries
- **`skills.md`** — Defines the geocoding skill, structured dossier synthesis spec (with full annotated JSON schema), PDF export contract, UI conventions, and Vite build pipeline

The development process followed three agentic phases: **interactive planning** (requirements, constraints, design tokens), **context-aware implementation** (targeted edits with full codebase awareness), and **automated verification** (Node.js checks + build validation after each cycle).

---

## 📐 Dossier Schema

The structured output schema is the backbone of the product. Every report conforms to this contract:

$$
\text{Dossier} = \{\ title,\ subtitle,\ soul,\ history[\ ],\ must\_visit[\ ],\ local\_flavors[\ ],\ practical\_tips[\ ],\ fun\_facts[\ ]\ \}
$$

Where each array section contains typed objects with required fields — ensuring the frontend renderer, PDF exporter, and cache layer all operate on a guaranteed, predictable data shape.

---

## 🚀 Local Setup

```bash
git clone https://github.com/misbah7172/PlaceHack-AI
cd PlaceHack-AI
npm install
# Add OPENAI_API_KEY to .env
npm start
# Open http://localhost:3000
```

Full instructions in [`README.md`](https://github.com/misbah7172/PlaceHack-AI).

---

## 🏆 Why PlaceHack AI

- **Not a chatbot** — a deterministic, schema-bound intelligence report, not a conversational answer
- **Genuinely useful** — produces depth on lesser-known districts that mainstream guides ignore
- **Platform-aware engineering** — explicit reasoning effort tuning, token budget management, and strict output schemas show deliberate use of the OpenAI platform, not just an API wrapper
- **Documented agent architecture** — `AGENTS.md` and `skills.md` treat AI agent design as a first-class engineering artifact
- **Production-grade pipeline** — auth, caching, error handling, PDF export, and dark mode out of the box

---