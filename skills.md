# PlaceHack AI — Agent Capabilities & Skills

**Document Version:** 1.0.0
**Classification:** Internal Technical Reference
**Scope:** Runtime Intelligence Agents · Design-Time Development Agents

---

## Overview

PlaceHack AI is a location intelligence platform built on a dual-agent architecture. At runtime, a **Location Intelligence Agent** handles real-time geospatial data acquisition, enrichment, and structured report synthesis. At design time, a **Codex Development Agent** drives UI engineering, asset optimization, and document generation workflows. This document is the canonical reference for the capabilities, constraints, and integration contracts of both agents.

---

## 1. Runtime Agent: Location Intelligence Agent

The Location Intelligence Agent is responsible for transforming raw geolocation signals into rich, structured cultural and geographical dossiers. It operates as an AI-powered middleware layer between the browser frontend and the underlying LLM, ensuring that every response is grounded in precise geographic context.

---

### Skill 1.A — Geolocation & Reverse Geocoding

**Purpose**
Translate raw browser-provided latitude/longitude coordinates into a semantically meaningful place name, address, or administrative region label that the LLM can reason over.

**How It Works**

The frontend invokes the browser's native Geolocation API to capture the user's current coordinates. These coordinates are forwarded to the Express.js backend, which prepends them as structured context to the LLM prompt. This prevents vague or incorrect geographic assumptions and ensures all downstream intelligence is anchored to the user's actual location.

**Data Flow**

```
Browser Geolocation API
        │
        ▼
  { lat, lng } payload
        │
        ▼
  Express.js Backend
        │
        ▼
  Reverse Geocoding Layer  ──►  Place Name / Address Label
        │
        ▼
  LLM Prompt Context Injection
```

**Key Constraints**

- Requires explicit user permission for location access via the browser's permissions API.
- Accuracy depends on the device's geolocation method (GPS vs. IP fallback). GPS is strongly preferred.
- The backend must sanitize and validate coordinates before passing them to the LLM to prevent prompt injection via malformed values.

**Failure Modes & Fallbacks**

| Condition | Behavior |
|---|---|
| User denies location permission | Prompt user to enter location manually |
| GPS unavailable (desktop/low-signal) | Fall back to IP-based geolocation with reduced accuracy |
| Coordinates out of valid range | Reject and surface a validation error to the frontend |

---

### Skill 1.B — Structured Location Dossier Synthesis

**Purpose**
Compile a comprehensive, multi-dimensional geographical and cultural intelligence report about a given location. The output strictly conforms to a predefined JSON schema, enabling deterministic rendering in both the web UI and the PDF export pipeline.

**Output Characteristics**

The synthesized dossier covers six thematic categories:

- **Historical Timeline** — Key dated milestones in the location's history
- **Must-Visit Places** — Curated points of interest with category tagging and visit rationale
- **Local Flavors** — Food, drink, and cultural experiences unique to the area
- **Practical Tips** — Actionable visitor guidance organized by category
- **Fun Facts** — Curated trivia and surprising insights about the location

**JSON Schema Contract**

The agent must produce output that exactly satisfies the following schema. Any deviation will cause rendering failures in the UI and PDF pipeline.

```json
{
  "type": "object",
  "required": [
    "title",
    "subtitle",
    "soul",
    "history",
    "must_visit",
    "local_flavors",
    "practical_tips",
    "fun_facts"
  ],
  "properties": {
    "title": {
      "type": "string",
      "description": "The primary display name of the location (e.g., city or neighborhood name)."
    },
    "subtitle": {
      "type": "string",
      "description": "A short, evocative tagline capturing the essence of the location."
    },
    "soul": {
      "type": "string",
      "description": "A prose paragraph (2–4 sentences) describing the location's character, atmosphere, and identity."
    },
    "history": {
      "type": "array",
      "description": "Chronological milestones in the location's history.",
      "items": {
        "type": "object",
        "required": ["year", "title", "description"],
        "properties": {
          "year": { "type": "string", "description": "The year or approximate period (e.g., '1857' or 'c. 1200')." },
          "title": { "type": "string", "description": "A short headline for the historical event." },
          "description": { "type": "string", "description": "1–3 sentences elaborating on the event's significance." }
        }
      }
    },
    "must_visit": {
      "type": "array",
      "description": "Curated list of recommended points of interest.",
      "items": {
        "type": "object",
        "required": ["name", "category", "description", "why_visit"],
        "properties": {
          "name": { "type": "string", "description": "Official or common name of the place." },
          "category": { "type": "string", "description": "Place type (e.g., 'Landmark', 'Museum', 'Nature', 'Market')." },
          "description": { "type": "string", "description": "Factual description of the place." },
          "why_visit": { "type": "string", "description": "Opinionated, engaging reason to visit this specific place." }
        }
      }
    },
    "local_flavors": {
      "type": "array",
      "description": "Notable local food, beverages, and culinary traditions.",
      "items": {
        "type": "object",
        "required": ["title", "type", "description"],
        "properties": {
          "title": { "type": "string", "description": "Name of the dish, drink, or culinary tradition." },
          "type": { "type": "string", "description": "Classification (e.g., 'Street Food', 'Traditional Dish', 'Festival Delicacy')." },
          "description": { "type": "string", "description": "Sensory and cultural description of the flavor or experience." }
        }
      }
    },
    "practical_tips": {
      "type": "array",
      "description": "Actionable visitor guidance.",
      "items": {
        "type": "object",
        "required": ["category", "tip"],
        "properties": {
          "category": { "type": "string", "description": "Tip category (e.g., 'Transport', 'Safety', 'Currency', 'Etiquette')." },
          "tip": { "type": "string", "description": "Concise, practical advice for visitors." }
        }
      }
    },
    "fun_facts": {
      "type": "array",
      "description": "Surprising or memorable facts about the location.",
      "items": {
        "type": "string",
        "description": "A single, self-contained fun fact (1–2 sentences)."
      }
    }
  }
}
```

**Validation & Error Handling**

The backend must validate the LLM's JSON output against this schema before returning it to the frontend. If validation fails:

1. Log the raw output and the schema violation.
2. Attempt a one-pass repair prompt instructing the model to correct only the failing fields.
3. If the second attempt also fails, return a structured error response to the frontend rather than partial/broken data.

**Quality Guidelines for LLM Prompt Design**

- Always provide the full JSON schema in the system prompt as a hard constraint.
- Instruct the model to produce output as a raw JSON object with no markdown fences, preamble, or commentary.
- Include the reverse-geocoded place name and coordinates in the user prompt context.
- Specify minimum array lengths (e.g., at least 3 history entries, 4 must-visit places) to ensure content richness.

---

## 2. Design-Time Agent: Codex Development Agent

The Codex Development Agent handles the engineering and refinement of the PlaceHack AI application. It is responsible for UI implementation, frontend performance, and document generation — operating as a code-generation and build-automation agent during the development lifecycle.

---

### Skill 2.A — Layout & UI Polish

**Purpose**
Implement and maintain a polished, accessible, and responsive user interface using Tailwind CSS, with full support for both dark and light modes.

**Responsibilities**

- Define and apply consistent component layouts using Tailwind utility classes, with no custom CSS unless strictly necessary.
- Implement a dark/light mode toggle that persists user preference via `localStorage` and respects the `prefers-color-scheme` media query as the initial default.
- Standardize text color usage across mode switches. All primary text must use the `text-primary-600` utility class. Hard-coded color values (e.g., `text-gray-700`) are not permitted in shared components.
- Ensure all interactive elements meet WCAG 2.1 AA contrast ratios in both dark and light modes.
- Apply responsive breakpoints consistently: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px).

**Design Conventions**

| Element | Convention |
|---|---|
| Primary text | `text-primary-600` (both modes) |
| Section headings | `font-semibold text-lg` or higher |
| Cards / panels | `rounded-xl shadow-md` with mode-aware background |
| Spacing scale | Use Tailwind's 4px base grid only (`p-4`, `gap-6`, etc.) |
| Animations | Use `transition-all duration-200` for interactive state changes |

---

### Skill 2.B — PDF Export

**Purpose**
Generate downloadable, well-formatted dossier PDFs from the same structured JSON data used to render the web UI, ensuring content parity across both surfaces.

**Implementation**

PDF generation is handled by **PDFKit** on the Node.js backend. The export endpoint receives the validated dossier JSON, maps each field to a styled PDF section, and streams the resulting binary to the client.

**Content & Formatting Requirements**

- Section order in the PDF must exactly mirror the section order in the web dossier view: `title → subtitle → soul → history → must_visit → local_flavors → practical_tips → fun_facts`.
- Each section must have a visually distinct header using PDFKit's font size and color APIs.
- Arrays (e.g., `history`, `must_visit`) must render as structured blocks, not raw bullet strings.
- The PDF must embed the location name in the document metadata (`Title`, `Subject` fields).
- Font: Use a system-safe serif font (e.g., Helvetica) for body text and a bold weight variant for headers.

**Export Endpoint Contract**

```
POST /api/export/pdf
Content-Type: application/json

Request body: { dossier: <DossierJSON> }

Response:
  Content-Type: application/pdf
  Content-Disposition: attachment; filename="placehack-<location>.pdf"
```

**Error Handling**

If PDFKit encounters a rendering error, the endpoint must return a `500` with a structured error body rather than a partial PDF stream.

---

### Skill 2.C — Build & Asset Optimization

**Purpose**
Manage the compilation, bundling, and optimization of all frontend assets using **Vite** and **Tailwind CSS**, ensuring fast load times and clean production builds.

**Toolchain**

| Tool | Role |
|---|---|
| Vite | Module bundler, dev server, HMR |
| Tailwind CSS | Utility CSS generation & purging |
| PostCSS | CSS transformation pipeline |

**Build Process**

1. **Development mode** (`vite dev`): Enables Hot Module Replacement (HMR), skips minification, and serves Tailwind without purging for rapid iteration.
2. **Production build** (`vite build`): Minifies JavaScript, purges unused Tailwind classes using the content paths defined in `tailwind.config.js`, and outputs hashed asset filenames for cache busting.
3. **Preview** (`vite preview`): Serves the production build locally for pre-deployment validation.

**Tailwind Purge Configuration**

The `content` array in `tailwind.config.js` must include all template files that use Tailwind classes. Missing entries will cause styles to be stripped from production builds.

```js
// tailwind.config.js
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class", // Required for manual dark mode toggle
  theme: {
    extend: {
      colors: {
        primary: { /* custom scale */ }
      }
    }
  }
}
```

**Performance Targets**

| Metric | Target |
|---|---|
| First Contentful Paint | < 1.5s on 4G |
| JS bundle size (gzip) | < 150 KB |
| CSS bundle size (gzip) | < 20 KB |
| Unused CSS in production | 0% (enforced by purge) |

---

## Appendix: Agent Interaction Summary

```
┌─────────────────────────────────────────┐
│           PlaceHack AI System           │
│                                         │
│  ┌──────────────┐   ┌────────────────┐  │
│  │   Browser    │   │  Codex Agent   │  │
│  │  (Frontend)  │   │ (Design-Time)  │  │
│  │              │   │                │  │
│  │ Geolocation  │   │  UI / Tailwind │  │
│  │ API capture  │   │  PDF Export    │  │
│  └──────┬───────┘   │  Vite Build    │  │
│         │           └────────────────┘  │
│         ▼                               │
│  ┌──────────────┐                       │
│  │  Express.js  │                       │
│  │   Backend    │                       │
│  └──────┬───────┘                       │
│         │                               │
│         ▼                               │
│  ┌──────────────────────────────────┐   │
│  │   Location Intelligence Agent   │   │
│  │  (Runtime)                       │   │
│  │                                  │   │
│  │  Reverse Geocoding               │   │
│  │  Dossier Synthesis (JSON Schema) │   │
│  │  Schema Validation & Repair      │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

*Last updated: June 2026 · Maintained by the PlaceHack AI core team*