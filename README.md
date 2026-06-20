# AURA-METNMAT Platform

**Multi-company AI Requirement Gathering & Stakeholder Interview Platform** powered by METNMAT.

Use this platform for **any client company** METNMAT onboarded — not limited to a single organization.

## Architecture

| Database | Purpose |
|----------|---------|
| **Reference DB** | Per-company Excel/PDF operational data |
| **Interview DB** | Companies, employee interviews, attachments, reports |

## Quick Start

```bash
cd aura-platform
npm install
npm run setup      # DB + seed companies + import reference data
npm run dev        # http://localhost:3000
```

## OpenAI + Claude

- **Claude (Anthropic)** — primary for interview chat, reports, and knowledge retrieval
- **OpenAI** — secondary fallback + TTS voice + fast translation

Set in `.env`:
- `ANTHROPIC_API_KEY` — Claude (required for best experience)
- `OPENAI_API_KEY` — OpenAI (required for TTS; fallback for chat)

## Multi-Company Workflow

1. **Admin → Companies** — Add a client company (name, industry, AI context)
2. **Admin → Import** — Import reference files scoped to company slug
3. **Interview** — Employee selects company → language → details → chat

## Pre-seeded Companies

- `jsl` — JSL (Jindal Stainless) — example with furnace/industrial context
- `demo-corp` — Demo Corporation — generic example

## Scripts

| Command | Description |
|---------|-------------|
| `npm run db:seed` | Seed/update companies |
| `npm run db:import` | Import reference data (set `IMPORT_COMPANY_SLUG`) |
| `npm run dev` | Start dev server |
