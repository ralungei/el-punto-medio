# El Punto Medio

Agregador de noticias español con IA. Lee 21 medios del espectro político, agrupa noticias por tema, analiza sesgo/tono de cada fuente y sintetiza artículos equilibrados.

## Arquitectura

Tres paquetes independientes, sin monorepo root:

### `pipeline/` — ETL + IA (Node, SQLite, Claude API)
Pipeline de 6 etapas: ingest → filter → scrape → cluster → analyze → synthesize.

- **Ingest** (`src/lib/ingest.ts`): Playwright scraping de 21 fuentes (sin RSS, todo scraping). Max 4 concurrentes.
- **Filter** (`src/lib/filter.ts`): Descarta duplicados y artículos irrelevantes.
- **Scrape** (`src/lib/scrape.ts`): Extrae contenido completo con Readability.
- **Cluster** (`src/lib/clustering.ts`): Agrupa artículos sobre el mismo tema.
- **Analyze** (`src/lib/analyze.ts`): Claude analiza tono/sesgo/framing por fuente.
- **Synthesize** (`src/lib/synthesize.ts`): Claude redacta artículo neutral combinando fuentes.
- **Export** (`src/lib/export.ts`): Genera JSON para el frontend.

**DB**: SQLite con Drizzle ORM. Schema en `db/schema.ts`.
**Fuentes**: Configuradas en `src/lib/sources.ts`. 21 medios con `politicalLean` y `scrapeUrl`.

```bash
cd pipeline
npm run seed          # Inserta/actualiza fuentes en DB
npm run pipeline      # Ejecuta pipeline completo
npm run pipeline -- --stage ingest  # Solo una etapa
npm run export:web    # Genera JSON para frontend
```

### `frontend/` — SPA (React 19, Vite, Tailwind 4, React Router 7)
Periódico digital estático que consume JSON generado por el pipeline.

**Estructura**:
- `src/App.tsx` — Layout raíz, estado global (hideNegative, hiddenCats), outlet context
- `src/pages/` — HomePage (feed), ArticlePage, ArchivePage, NotFoundPage
- `src/components/layout/` — Header, NavBar, Footer, TopBar, BreakingTicker, SearchOverlay
- `src/components/article/` — Detalle de artículo (secciones, cobertura, espectro)
- `src/components/home/` — Cards del feed (Hero, Grid, Sidebar, etc.)
- `src/components/shared/` — Reutilizables (ImageCarousel, CategoryTag, SourcesBadge)
- `src/constants.ts` — Colores, categorías, NAV_ITEMS, SOURCE_DOMAIN
- `src/lib/storage.ts` — localStorage helpers (readSlugs, hiddenCats)

**Despliegue**: Cloudflare Pages.

```bash
cd frontend
npm run dev       # Vite dev server :5173
npm run build     # Build producción
```

### `worker/` — API (Hono, Cloudflare Workers, D1)
API REST que sirve datos desde D1 (SQLite en edge).

- Token auth con SHA-256 + salt temporal
- CORS configurado para Pages + localhost

```bash
cd worker
npm run dev       # Wrangler dev
npm run deploy    # Deploy a Workers
```

## Fuentes (21 medios)

| Sesgo | Medios |
|-------|--------|
| Izquierda | elDiario.es, Público |
| Centro-izq | El País, Newtral, El Periódico |
| Centro | La Vanguardia, El Confidencial, 20 Minutos, Europa Press, Xataka |
| Centro-der | El Mundo, El Español |
| Derecha | ABC, La Razón, OKDiario |
| Público | RTVE, Agencia SINC, Redacción Médica, Hipertextual, NatGeo España, EFE |

Config en `pipeline/src/lib/sources.ts`. Favicons en `frontend/src/constants.ts` (`SOURCE_DOMAIN`).

## Despliegue

### URLs de producción
- **Frontend**: https://el-punto-medio.pages.dev (Cloudflare Pages)
- **API**: https://el-punto-medio-api.ras-alungei.workers.dev (Cloudflare Workers)
- **D1 Database**: `el-punto-medio-db` (ID: `15a88e33-e880-4f87-9ddc-c88c9aacee43`)

### GitHub Actions (`.github/workflows/`)
- **`deploy.yml`**: Despliega frontend a Cloudflare Pages en push a `main` (solo si cambia `frontend/`)
- **`pipeline.yml`**: Ejecuta pipeline cada 6h (cron: `0 0,6,12,18 * * *`) + dispatch manual. Timeout 45min.

### Secrets necesarios
| Secret | Uso |
|--------|-----|
| `ANTHROPIC_API_KEY` | Claude API (pipeline) |
| `CF_D1_TOKEN` | Cloudflare API token (deploy + pipeline) |
| `CF_ACCOUNT_ID` | Cloudflare account ID |
| `CF_D1_DATABASE_ID` | D1 database ID (pipeline escribe via REST API) |

### Worker (`worker/wrangler.toml`)
- Nombre: `el-punto-medio-api`
- Binding D1: `DB`
- Deploy manual: `cd worker && npm run deploy`

### Entorno local vs producción
- **Local**: SQLite en `pipeline/data/panorama.db` (better-sqlite3)
- **Producción**: Cloudflare D1 via HTTP REST adapter (pipeline en CI) + D1 binding (worker)
- Variable `CF_D1_TOKEN` presente → modo producción (D1); ausente → modo local (SQLite)

## Convenciones

- **TypeScript** en todo. Strict mode.
- **Estilo**: Sin emojis. Español en UI, inglés en código.
- **CSS**: Tailwind utility classes + CSS variables (`var(--blue)`, `var(--text-muted)`, etc.).
- **Estado client**: localStorage con prefijo `epm:` (ej: `epm:readSlugs`, `epm:hiddenCats`, `epm:hideNegative`).
- **Componentes**: Funciones exportadas con nombre, no default export (excepto páginas).
- **Sin tests** por ahora.
- **Sin monorepo tooling** — cada paquete tiene su propio `package.json` y se gestiona independientemente.

## Features actuales

- Feed con categorías (política, economía, sociedad, internacional, cultura, deportes, tecnología, salud, ciencia)
- Filtro por categoría en NavBar (`/?cat=X`)
- Modo positivo (oculta noticias negativas)
- Filtro de categorías (dropdown en Header, oculta categorías del feed)
- Artículos leídos (opacity reducida)
- Ticker de breaking news
- Búsqueda (Ctrl+K)
- Archivo de ediciones anteriores
- Espectro político por artículo (barra de colores izq→der)
- Análisis de tono/framing por fuente
