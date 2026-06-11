<div align="center">

# 🌍 PlaceHack AI

### One-click cultural intelligence for any place on Earth.

Scan your coordinates or search any location — PlaceHack AI's Location Intelligence Agent synthesizes hidden history, must-visit spots, local flavors, practical travel tips, and surprising facts into a polished, exportable dossier.

[Live Demo](https://placehack-ai.onrender.com) · [Report an Issue](https://github.com/misbah7172/PlaceHack-AI/issues) · [Source Code](https://github.com/misbah7172/PlaceHack-AI)

> ⚠️ Hosted on Render's free tier — first load may take 30–60 seconds due to cold starts.

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Running the App](#running-the-app)
- [How to Use](#how-to-use)
- [OpenAI Integration](#openai-integration)
- [Agentic Development](#agentic-development)
- [Project Structure](#project-structure)
- [Author](#author)

---

## Overview

Getting a genuine, structured picture of any place is surprisingly difficult. Mainstream travel guides recycle the same major cities. Wikipedia lacks depth on districts. Blog posts are optimized for search engines, not for insight. Assembling real cultural depth — local history, hidden spots, authentic food, practical logistics — demands hours of research across fragmented sources.

**PlaceHack AI solves this in a single click.**

It detects the user's location via the browser's Geolocation API (reverse-geocoded to district + country) or accepts a manual text query for anywhere in the world. A dedicated AI agent then produces a magazine-quality cultural dossier — validated, schema-bound, and ready to read or export as PDF. Not a chatbot. Not a summary. A structured intelligence report.

---

## Features

| Feature | Description |
|---|---|
| **Geolocation Scan** | Browser GPS → reverse-geocoded to English district + country → instant report |
| **Manual Search** | Enter any city, district, landmark, or region worldwide |
| **AI Location Dossier** | 10 structured sections: title, subtitle, soul narrative, theme context, history, must-visit, local flavors, practical tips, accidents & disasters, fun facts |
| **Adaptive World UI** | Retro pixel-art theme switches automatically based on the location's development context and environment |
| **Historical Incidents** | Respectful coverage of historical accidents, disasters, and crises relevant to the area |
| **Strict JSON Outputs** | OpenAI `json_schema` enforcement — every field typed, required, and validated before render |
| **Report Caching** | JSON-backed local store prevents redundant API calls for repeated queries |
| **Force Regenerate** | Bypass cache and trigger a fresh AI analysis on demand |
| **PDF Export** | Download a formatted intelligence dossier via PDFKit |
| **User Accounts** | Register and log in to persist your full report history |
| **Dark Mode** | System-aware toggle with local storage persistence |
| **Responsive UI** | Tailwind CSS 4, mobile-first layout |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js, Express.js |
| **Templating** | EJS |
| **Frontend** | Tailwind CSS 4, Vite |
| **AI** | OpenAI `gpt-5-mini` via the official `openai` Node SDK |
| **Geocoding** | OpenStreetMap Nominatim (no API key required) |
| **Data Store** | Local JSON file — `data/placehack.json` |
| **PDF Generation** | PDFKit |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [npm](https://www.npmjs.com/)
- An [OpenAI API key](https://platform.openai.com/api-keys)

### Installation

```bash
# Clone the repository
git clone https://github.com/misbah7172/PlaceHack-AI.git
cd PlaceHack-AI

# Install dependencies
npm install
```

### Environment Configuration

Open `.env` and fill in your credentials:

```env
APP_NAME="PlaceHack AI"
NODE_ENV=development
PORT=3000
SESSION_SECRET=change-this-to-a-random-string

OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-5-mini
OPENAI_MAX_COMPLETION_TOKENS=9000
OPENAI_REASONING_EFFORT=low
```

> **Why `max_completion_tokens=9000` and `reasoning_effort=low`?**  
> `gpt-5-mini` is a reasoning model — it consumes tokens on internal chain-of-thought before writing output. The default 4000-token budget can be exhausted before the full dossier is generated. Raising the token ceiling and lowering reasoning effort ensures the complete report is always returned.

### Running the App

**Development** (with Vite hot reload):

```bash
npm run dev
```

**Production-style local run:**

```bash
npm run build
npm start
```

Then open **[http://127.0.0.1:3000](http://127.0.0.1:3000)** in your browser.

---

## How to Use

1. **Scan or Search** — Click **Scan Geolocation** and allow location access, or type any place into the search bar.
2. **Wait for the Dossier** — The Location Intelligence Agent takes ~30–60 seconds to synthesize the full report.
3. **Explore the Report** — Scroll through history, must-visit spots, local flavors, practical tips, and more.
4. **Regenerate** — Click **Regenerate** to force a fresh analysis and bypass the cache.
5. **Export** — Click **Download PDF** to save a formatted version of the dossier.
6. **Save History** — Create an account to persist reports across sessions.

---

## OpenAI Integration

PlaceHack AI uses OpenAI as its **core intelligence layer** — not as a chat widget or autocomplete aid. The entire product depends on a single, well-engineered structured API call.

### Model Configuration

| Parameter | Value | Reason |
|---|---|---|
| **Model** | `gpt-5-mini` | Strong long-form synthesis at efficient cost |
| **Endpoint** | `/v1/chat/completions` | Standard Chat Completions |
| **Response format** | `strict json_schema` | Guarantees every field is present and typed |
| **Max completion tokens** | `9000` | Headroom for full dossier after internal reasoning |
| **Reasoning effort** | `low` | Reserves token budget for output, not chain-of-thought |
| **SDK** | `openai` (Node.js) | Official OpenAI Node SDK |

### Structured Output Schema

Every report conforms to a strict schema with 10 required top-level sections. The schema is enforced at the OpenAI API level — if a field is missing or incorrectly typed, the API rejects it before the response reaches the application.

```
title · subtitle · soul · theme_context · history[]
must_visit[] · local_flavors[] · practical_tips[]
historical_accidents_disasters[] · fun_facts[]
```

This means the EJS renderer, PDF exporter, and cache layer all operate on a guaranteed, predictable data shape — no defensive parsing, no fallback handling.

### Agent Persona

The system prompt configures the **PlaceHack Intelligence Agent** as a world-class travel writer, cultural anthropologist, and historian. The persona instruction produces vivid, non-generic writing that surfaces lesser-known local stories rather than recycling Wikipedia entries.

### Adaptive Theme Selection

The schema includes a `theme_context.world_theme` field. The frontend reads this value and automatically switches the retro pixel-art UI theme to match the detected environment — jungle, developed city, underdeveloped town, village, mining town, coastal port, and more.

---

## Agentic Development

PlaceHack AI was co-engineered using **Codex** as an agentic pair programmer. The development process followed a three-phase agentic workflow:

1. **Interactive Planning** — Requirements, design tokens, color palette verification, and constraint identification upfront.
2. **Context-Aware Implementation** — Full codebase analysis before each change; targeted, minimal edits rather than broad rewrites.
3. **Automated Verification** — Node.js runtime checks and Vite production builds after every cycle.

The agent architecture is treated as a first-class engineering artifact, fully documented in two companion files:

| Document | Contents |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Runtime agent persona, system architecture diagrams, Mermaid sequence workflows, and configuration reference |
| [`skills.md`](skills.md) | Geocoding skill, annotated JSON schema spec, PDF export contract, UI design conventions, and Vite build pipeline |

---

## Project Structure

```
PlaceHack-AI/
├── src/
│   ├── server.js                    # Express routes, auth, geocoding, PDF export
│   ├── store.js                     # JSON-backed local data store
│   └── services/
│       └── openaiReportService.js   # Location Intelligence Agent + JSON schema
├── resources/
│   ├── js/app.js                    # Geolocation handling, report UI, API calls
│   └── css/app.css                  # Tailwind CSS entry point
├── views/                           # EJS templates
├── data/
│   └── placehack.json               # Cached reports store
├── public/
│   └── favicon.svg
├── AGENTS.md                        # Agent architecture reference
├── skills.md                        # Agent capabilities reference
├── .env                             # Environment variables (not committed)
└── package.json
```

---

## Author

**Misbah** — [@misbah7172](https://github.com/misbah7172)