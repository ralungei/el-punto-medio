# Panorama — Noticias con todas las perspectivas

Digital newspaper that aggregates news from 14 Spanish media, analyzes coverage perspectives, and generates impartial articles.

## Tech Stack
- Next.js 15 + React 19 + Tailwind CSS 4
- SQLite via better-sqlite3 + Drizzle ORM
- Claude API (Sonnet for analysis/synthesis, Haiku for clustering/dedup)
- Playwright for headless browser scraping

## Structure
- `src/app/` — Next.js pages (homepage, article, archive)
- `src/lib/` — Core logic (db, ingest, clustering, analyze, synthesize, prompts, queries)
- `src/components/` — React components
- `db/schema.ts` — Drizzle schema (7 tables)
- `scripts/` — Pipeline orchestrator + seed script
- `data/panorama.db` — SQLite database

## Commands
- `npm run dev` — Start dev server
- `npm run pipeline` — Run full pipeline (ingest → cluster → analyze → synthesize)
- `npm run pipeline:ingest` — Only ingestion stage
- `npm run seed` — Seed the 14 media sources
- `npm run db:generate` — Generate Drizzle migrations
- `npm run db:migrate` — Run migrations

## Pipeline Stages
1. **Ingest**: Scrape 14 source homepages with Playwright → store in raw_articles
2. **Scrape**: Fetch full article content with Readability
3. **Cluster**: 4-phase LLM clustering (dedup per source → global clustering → merge duplicates → rescue orphans)
4. **Analyze**: Claude Sonnet analyzes tone/framing/omissions per source
5. **Synthesize**: Claude Sonnet generates final impartial article with sections

## Environment
- Requires `ANTHROPIC_API_KEY` env var for Claude API calls
