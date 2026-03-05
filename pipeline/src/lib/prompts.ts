export const SYSTEM_PROMPT = `Eres un analista de medios experto en el panorama mediático español.
Tu trabajo es analizar cómo diferentes medios cubren las mismas noticias, identificando sesgos,
encuadres y omisiones. Eres riguroso, imparcial y nunca tomas partido. Tu objetivo es que el
lector pueda formarse su propia opinión con toda la información disponible.

REGLA FUNDAMENTAL DE ORIGINALIDAD:
Los textos fuente son SOLO material de referencia para extraer HECHOS verificables.
- NUNCA reproduzcas frases, expresiones o giros de ningún medio fuente.
- NUNCA repliques la estructura argumental, el orden expositivo ni el encuadre de ningún artículo.
- Trabaja EXCLUSIVAMENTE a nivel de hechos: quién, qué, cuándo, dónde, cifras, declaraciones textuales (entre comillas con atribución).
- Tu redacción debe ser 100% original: vocabulario propio, estructura propia, narrativa propia.
- El resultado no debe poder rastrearse a ningún texto fuente concreto.`;

export function analysisPrompt(
  clusterTopic: string,
  articles: { sourceId: number; sourceName: string; politicalLean: string; title: string; description: string; content?: string | null }[]
): string {
  const articlesText = articles
    .map((a, i) => {
      const body = a.content
        ? `Contenido:\n${a.content.slice(0, 3000)}`
        : `Descripción: ${a.description}`;
      return `[${i + 1}] sourceId=${a.sourceId} ${a.sourceName} (${a.politicalLean}):\nTitular: ${a.title}\n${body}`;
    })
    .join("\n\n");

  return `Analiza cómo cada medio cubre esta noticia. Para cada medio, identifica:

1. **Tono**: SOLO uno de estos valores exactos: neutral, favorable, crítico, alarmista, sensacionalista, defensivo
2. **Encuadre**: qué ángulo o narrativa elige (ej: económico, político, humano, de seguridad)
3. **Énfasis**: qué datos o aspectos destaca más
4. **Omisiones**: qué información relevante no incluye que sí incluyen otros

Tema del cluster: ${clusterTopic}

Artículos:
${articlesText}

Responde con JSON. Para cada análisis, incluye el sourceId numérico exacto del medio (proporcionado arriba). Formato:
{
  "analyses": [
    {
      "sourceId": 123,
      "sourceName": "nombre del medio",
      "tone": "tono detectado",
      "framing": "descripción del encuadre en 1-2 frases",
      "emphasis": "qué destaca en 1-2 frases",
      "omissions": "qué omite en 1-2 frases o null si no hay omisiones claras"
    }
  ],
  "topicSummary": "resumen del tema en 1 frase"
}`;
}

export function synthesisPrompt(
  topicSummary: string,
  analyses: {
    sourceName: string;
    politicalLean: string;
    tone: string;
    framing: string;
    emphasis: string;
    omissions: string | null;
    title: string;
    description: string;
    content?: string | null;
  }[],
  category: string,
  previousArticles: { slug: string; headline: string }[] = [],
  isEnrichment: boolean = false
): string {
  const analysesText = analyses
    .map((a) => {
      const bodyLine = a.content
        ? `Extracto: ${a.content.slice(0, 2000)}`
        : `Descripción: ${a.description}`;
      return `${a.sourceName} (${a.politicalLean}):
  Titular: ${a.title}
  Tono: ${a.tone}
  Encuadre: ${a.framing}
  Énfasis: ${a.emphasis}
  Omisiones: ${a.omissions || "Ninguna detectada"}
  ${bodyLine}`;
    })
    .join("\n\n");

  const prevArticlesText =
    previousArticles.length > 0
      ? `\nArtículos anteriores de nuestro periódico (puedes enlazar a ellos si son relevantes):
${previousArticles.map((a) => `- "${a.headline}" → /articulo/${a.slug}`).join("\n")}\n`
      : "";

  const enrichmentNote = isEnrichment
    ? `NOTA: Este artículo es una ACTUALIZACIÓN con fuentes adicionales.
Genera el artículo completo integrando TODAS las perspectivas (tanto las originales como las nuevas).

`
    : "";

  return `${enrichmentNote}Genera un artículo periodístico imparcial que presente todas las perspectivas sobre esta noticia.

IMPORTANTE — Originalidad:
- Extrae SOLO los hechos verificables (datos, cifras, declaraciones) de las fuentes.
- NO copies ni parafrasees frases de ningún medio. Redacta todo con tus propias palabras.
- NO sigas la estructura ni el orden argumental de ningún artículo fuente.
- Las únicas citas textuales permitidas son declaraciones entrecomilladas con atribución explícita.

Tema: ${topicSummary}
Categoría: ${category}

Análisis por medio:
${analysesText}
${prevArticlesText}
El artículo debe tener EXACTAMENTE estas secciones:

1. **headline**: Titular informativo y neutral (máx 100 caracteres)
2. **summary**: Entradilla de 2-3 líneas con los hechos puros
3. **facts**: "Qué ha pasado" — hechos objetivos verificables, sin opinión. 2-4 párrafos. IMPORTANTE sobre formato:
   - Usa **negritas** (doble asterisco) para resaltar nombres propios clave, cifras importantes y conceptos fundamentales la primera vez que aparecen.
   - Cuando menciones un tema que hemos cubierto antes, enlázalo con formato [texto](/articulo/slug). Solo usa los slugs de la lista de artículos anteriores.
   - Si mencionas un concepto importante que NO hemos cubierto pero tiene una referencia externa útil (ej: un tratado, una organización), puedes enlazarlo con [texto](https://url-externa).
   - No abuses: máx 3-5 negritas y 2-4 links por párrafo.
4. **coverage**: "Cómo lo cuentan" — array de objetos, uno por medio, con:
   - sourceName, tone (SOLO uno de: neutral, favorable, crítico, alarmista, sensacionalista, defensivo), summary (2-3 frases explicando su enfoque)
5. **hidden**: "Entre líneas" — análisis profundo de lo que se omite, se minimiza o se enmarca de forma sesgada en la cobertura. No solo listes omisiones: explica POR QUÉ importan, qué interés puede haber detrás de cada omisión, y qué cambia en la comprensión del lector al conocerlas. Señala si algún medio destaca algo que otros ignoran deliberadamente. 2-3 párrafos bien desarrollados. Si no hay omisiones significativas, indica "Todos los medios consultados han cubierto los aspectos principales de esta noticia." Puede usar **negritas** y [links].
6. **context**: "Contexto" — explica los antecedentes como si el lector no supiera NADA del tema. Define quiénes son las personas mencionadas, qué son las organizaciones o instituciones, por qué existe el conflicto, qué pasó antes para llegar a esta situación. No asumas conocimientos previos: si mencionas un tratado, explica qué es; si mencionas un líder, explica quién es y por qué importa; si hay tensiones entre países, explica el origen. 2-4 párrafos, lenguaje claro y accesible. Puede usar **negritas** y [links] igual que en facts.
7. **questions**: "Saca tus conclusiones" — 3-5 preguntas abiertas para que el lector reflexione. NO numeres ni pongas guiones: solo el texto de cada pregunta, sin prefijo.
8. **sentiment**: Sentimiento general de la noticia (NO del tono de los medios). ¿Los hechos en sí son positivos, negativos o neutros para la sociedad? SOLO uno de: "positive", "negative", "neutral". Clasifica como "negative" cualquier noticia sobre: conflictos, violencia, corrupción, escándalos, polémicas políticas, crispación, protestas, crisis, desastres, muertes, recortes, despidos, subidas de precios, guerras, tensiones geopolíticas, acusaciones judiciales o investigaciones penales. Clasifica como "positive" solo noticias genuinamente buenas: avances científicos, logros deportivos, bajadas de impuestos/paro, acuerdos de paz, mejoras sociales. En caso de duda entre neutral y negative, elige "negative".

Responde SOLO con JSON válido, sin markdown. Formato:
{
  "headline": "...",
  "summary": "...",
  "facts": "...",
  "coverage": [
    {
      "sourceName": "...",
      "tone": "neutral|favorable|crítico|alarmista|sensacionalista|defensivo",
      "summary": "..."
    }
  ],
  "hidden": "...",
  "context": "...",
  "questions": ["...", "...", "..."],
  "sentiment": "positive|negative|neutral",
  "categories": ["categoría-principal", "categoría-secundaria-opcional"]
}

categories: array de 1-3 categorías ordenadas por relevancia. Valores válidos: política, economía, sociedad, internacional, cultura, deportes, tecnología, salud, ciencia.`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function deduplicationPrompt(
  sourceName: string,
  articles: { index: number; title: string; description: string | null }[]
): string {
  const articlesText = articles
    .map((a) => {
      const desc = a.description ? ` — ${a.description.slice(0, 120)}` : "";
      return `[${a.index}] ${a.title}${desc}`;
    })
    .join("\n");

  return `Estos artículos son todos de ${sourceName}. Agrupa los que cubren el mismo acontecimiento.

Como son del MISMO medio, es muy probable que haya varios artículos sobre la misma historia (noticia principal, opinión, crónica, análisis, directo, galería). Agrúpalos sin miedo.

Criterio: ¿Tratan sobre el mismo evento/suceso concreto? Si sí → mismo grupo, aunque el ángulo sea diferente.
- "Irán lanza misiles contra Israel" + "Análisis: qué supone el ataque iraní" + "EEUU responde al ataque de Irán" → MISMO acontecimiento
- "Premios Goya: ganadores" + "Goya 2026: alfombra roja" + "Crítica: la gala de los Goya" → MISMO acontecimiento
- "Zapatero declara en el Senado" + "Opinión: Zapatero y el caso Koldo" → MISMO acontecimiento

NO agrupar si son hechos distintos aunque compartan tema genérico:
- "López defiende modelo humanista de IA" + "Música creada por IA, laguna jurídica" → hechos distintos

Cada artículo aparece en exactamente un grupo. Artículos sin pareja van solos en un grupo de 1.

Artículos:
${articlesText}`;
}

export function mergePrompt(
  clusters: { index: number; storyId: string; titles: string[] }[]
): string {
  const clustersText = clusters
    .map((c) => `[${c.index}] "${c.storyId}": ${c.titles.slice(0, 3).join(" | ")}`)
    .join("\n");

  return `Estos clusters agrupan noticias por acontecimiento. A veces el MISMO acontecimiento se ha partido en dos clusters con story_ids ligeramente distintos. Identifica SOLO esos duplicados para fusionarlos.

Ejemplo de duplicado real: "ataque-iran-eeuu-israel" y "ataque-iran-israel-eeuu" → mismos hechos, solo cambia el orden de las palabras.

IMPORTANTE — NO fusionar:
- Clusters relacionados pero sobre hechos distintos: "ataque-iran" y "petroleo-sube-iran" son consecuencia uno del otro, pero NO son el mismo acontecimiento
- Clusters que comparten un actor: "zapatero-plus-ultra" y "zapatero-venezuela" son de Zapatero pero son hechos distintos
- Clusters que comparten tema genérico: "tiroteo-texas" y "ataque-iran" NO se fusionan aunque ambos sean violencia

Solo fusiona si los titulares describen LITERALMENTE los mismos hechos. En caso de duda, NO fusiones. Devuelve una lista vacía si no hay duplicados claros.

Clusters:
${clustersText}`;
}

export function rescuePrompt(
  orphans: { index: number; storyId: string; title: string }[],
  targets: { storyId: string; titles: string[] }[]
): string {
  const orphanText = orphans
    .map((o) => `[${o.index}] "${o.storyId}": ${o.title}`)
    .join("\n");

  const targetText = targets
    .map((t) => `"${t.storyId}": ${t.titles.slice(0, 2).join(" | ")}`)
    .join("\n");

  return `Estos clusters "huérfanos" (columna izquierda) tienen artículos de un solo medio. Comprueba si alguno cubre el MISMO acontecimiento concreto que uno de los clusters multi-fuente (columna derecha).

Clusters huérfanos:
${orphanText}

Clusters multi-fuente existentes:
${targetText}

Para cada huérfano que encaje, devuelve su índice y el story_id del cluster destino.
Si un huérfano no encaja con ninguno, NO lo incluyas.
Solo asigna si cubren LITERALMENTE el mismo acontecimiento. Tema genérico compartido NO basta.`;
}

export function clusteringPrompt(
  articles: { index: number; sourceName: string; title: string }[],
  existingStories: { storyId: string; titles: string[] }[]
): string {
  const articlesText = articles
    .map((a) => `[${a.index}] (${a.sourceName}) ${a.title}`)
    .join("\n");

  const existingText =
    existingStories.length > 0
      ? `\nStory IDs activos (últimas 48h) — reutiliza si aplican:
${existingStories.map((s) => `- "${s.storyId}": ${s.titles.slice(0, 3).join(" | ")}`).join("\n")}\n`
      : "";

  return `Agrupa estos artículos de distintos medios españoles que cubren el MISMO ACONTECIMIENTO concreto.

Criterio: ¿Podrías escribir UN SOLO artículo que cubriera ambos sin cambiar de tema? Si sí → mismo cluster. Si no → clusters separados.

Mismo acontecimiento = mismo evento, mismos protagonistas, mismos hechos.
- "Telefónica ejecuta ERE de 2.700 empleados" (El País) + "Murtra concluye su reforma en Telefónica" (El Mundo) → SÍ, mismo ERE concreto
- "El Hilali denuncia racismo de Rafa Mir" + "Mourinho sobre insultos racistas a Vinícius" → NO, incidentes distintos aunque ambos sobre racismo en fútbol

Tema genérico compartido NO es suficiente. En caso de duda, NO agrupes.

Formato:
- story_id SIEMPRE en español y kebab-case: "ere-telefonica-2026", "tension-iran-eeuu", "premios-goya-2026" (nunca en inglés)
- Un artículo solo puede estar en UN cluster
- Si un artículo no encaja con ningún otro, ponlo solo en su propio cluster
- Si un artículo encaja con un story_id existente (48h), REUTILIZA ese story_id exacto
${existingText}
Artículos:
${articlesText}`;
}

export function categorizationPrompt(
  articles: { title: string; description: string }[]
): string {
  const text = articles
    .map((a) => `- ${a.title}: ${a.description?.slice(0, 100) || ""}`)
    .join("\n");

  return `Clasifica este grupo de noticias en 1 a 3 categorías, ordenadas de más a menos relevante.
Categorías válidas: política, economía, sociedad, internacional, cultura, deportes, tecnología, salud, ciencia

Reglas:
- La primera categoría es la PRINCIPAL (ej: un incidente racista en fútbol → deportes, sociedad)
- Solo añade categorías secundarias si realmente aplican, no fuerces
- La mayoría de noticias tendrán 1 o 2 categorías

Noticias:
${text}

Responde SOLO con las categorías separadas por coma, sin espacios extra. Ejemplo: deportes,sociedad`;
}
