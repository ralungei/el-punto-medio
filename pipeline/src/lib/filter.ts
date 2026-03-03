import { llm } from "./usage";
import { db, schema } from "./db";
import { eq } from "drizzle-orm";
import { runConcurrent } from "./concurrent";

const BATCH_SIZE = 30;
const MAX_BATCH_RETRIES = 2;

const FILTER_PROMPT = `Eres un editor jefe de un periódico serio. Tu trabajo es filtrar noticias para decidir cuáles merecen ser publicadas.

DESCARTA (responde "no") artículos que sean:
- Clickbait o sensacionalismo vacío (ej: "No creerás lo que hizo...", "El impactante cambio de look de...")
- Cotilleos, prensa rosa o vida privada: bodas, rupturas, embarazos, relaciones sentimentales, rumores sobre famosos, declaraciones de estilistas/amigos/familiares sobre la vida personal de celebridades. Aunque mencionen un evento cultural (alfombra roja, gala, premios), si el foco es la vida privada → DESCARTAR
- Reality shows, influencers, contenido sobre físico/vestimenta/looks de personas públicas
- Horóscopos, tests, rankings subjetivos sin base
- Publicidad encubierta o contenido patrocinado
- Noticias hiperlocales sin interés general (ej: corte de agua en una calle específica)
- Resultados deportivos menores (ligas regionales, amistosos sin relevancia)
- Recetas, trucos del hogar, listicles de entretenimiento

CONSERVA (responde "sí") artículos que sean:
- Política nacional o internacional
- Economía, mercados, empleo
- Sanidad, salud pública, ciencia
- Justicia, legislación, derechos
- Medio ambiente, clima
- Tecnología con impacto social
- Cultura con relevancia informativa real (política cultural, industria del cine/música, censura, debates). NO conservar cotilleos disfrazados de cultura
- Deportes de alto nivel (La Liga, Champions, Juegos Olímpicos, selecciones)
- Sucesos graves (accidentes, catástrofes, crímenes importantes)
- Educación, sociedad

Para cada artículo, responde SOLO "sí" o "no". Responde con un JSON array de strings.`;

interface ArticleToFilter {
  id: number;
  title: string;
  description: string | null;
}

async function filterBatch(articles: ArticleToFilter[]): Promise<Set<number>> {
  const keep = new Set<number>();

  const list = articles
    .map((a, i) => `[${i}] ${a.title}${a.description ? ` — ${a.description.slice(0, 120)}` : ""}`)
    .join("\n");

  const response = await llm({
    model: "claude-haiku-4-5",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `${FILTER_PROMPT}\n\nArtículos:\n${list}\n\nResponde SOLO con un JSON array de "sí" o "no", uno por artículo. Ejemplo: ["sí","no","sí"]`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "");
  const decisions: string[] = JSON.parse(cleaned);

  for (let i = 0; i < articles.length && i < decisions.length; i++) {
    if (decisions[i].toLowerCase().startsWith("sí") || decisions[i].toLowerCase() === "si") {
      keep.add(articles[i].id);
    }
  }

  return keep;
}

export async function filterEdition(editionId: number): Promise<{ kept: number; discarded: number }> {
  const articles = await db
    .select({
      id: schema.rawArticles.id,
      title: schema.rawArticles.title,
      description: schema.rawArticles.description,
    })
    .from(schema.rawArticles)
    .where(eq(schema.rawArticles.editionId, editionId))
    .all();

  if (articles.length === 0) return { kept: 0, discarded: 0 };

  const totalBatches = Math.ceil(articles.length / BATCH_SIZE);
  console.log(`  Filtrando ${articles.length} artículos en ${totalBatches} batches...`);

  // Test API connectivity with first batch before processing all
  const firstBatch = articles.slice(0, BATCH_SIZE);
  let firstKeep: Set<number>;
  try {
    firstKeep = await filterBatch(firstBatch);
  } catch (e) {
    throw new Error(`Filtro: API no disponible — ${e}`);
  }

  const keepIds = new Set<number>(firstKeep);
  console.log(`  [1/${totalBatches}] ${firstKeep.size}/${firstBatch.length} kept (test batch ok)`);

  // Process remaining batches in parallel (concurrency=5)
  const remainingBatches: { batch: ArticleToFilter[]; batchNum: number }[] = [];
  for (let i = BATCH_SIZE; i < articles.length; i += BATCH_SIZE) {
    remainingBatches.push({
      batch: articles.slice(i, i + BATCH_SIZE),
      batchNum: Math.floor(i / BATCH_SIZE) + 1,
    });
  }

  let failedBatches = 0;
  if (remainingBatches.length > 0) {
    const tasks = remainingBatches.map(({ batch, batchNum }) => async () => {
      let batchKeep: Set<number> | null = null;
      for (let attempt = 0; attempt <= MAX_BATCH_RETRIES; attempt++) {
        try {
          batchKeep = await filterBatch(batch);
          break;
        } catch (e) {
          if (attempt < MAX_BATCH_RETRIES) {
            console.log(`    ⚠ Batch ${batchNum} falló, reintentando... (${attempt + 1}/${MAX_BATCH_RETRIES})`);
          } else {
            console.log(`    ✗ Batch ${batchNum} falló tras ${MAX_BATCH_RETRIES} reintentos, descartando batch`);
            failedBatches++;
          }
        }
      }
      if (batchKeep) {
        console.log(`  Batch ${batchNum}/${totalBatches}: ${batchKeep.size}/${batch.length} kept`);
      }
      return batchKeep;
    });

    const results = await runConcurrent(tasks, 5);
    for (const batchKeep of results) {
      if (batchKeep) {
        for (const id of batchKeep) keepIds.add(id);
      }
    }
  }

  if (failedBatches > 0) {
    console.log(`  ⚠ ${failedBatches} batches fallidos — sus artículos se descartaron`);
  }

  // Delete discarded articles
  const discardIds = articles.filter((a: { id: number }) => !keepIds.has(a.id)).map((a: { id: number }) => a.id);

  if (discardIds.length > 0) {
    for (const id of discardIds) {
      await db.delete(schema.rawArticles).where(eq(schema.rawArticles.id, id)).run();
    }
  }

  console.log(`  ✓ ${keepIds.size} conservados, ${discardIds.length} descartados`);
  return { kept: keepIds.size, discarded: discardIds.length };
}
