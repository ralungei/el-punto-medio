/**
 * Test script: check which date extraction methods work across Spanish news sources.
 * Fetches a sample of articles and tries multiple extraction strategies.
 */

const URLS: [string, string][] = [
  // [source, url] — 2 per source
  ["El País", "https://elpais.com/internacional/2026-03-02/ultima-hora-del-ataque-de-ee-uu-e-israel-contra-iran-en-directo.html"],
  ["El País", "https://elpais.com/espana/2026-03-02/el-supremo-confirma-que-el-pp-de-rajoy-se-lucro-con-la-trama-gurtel.html"],
  ["El Mundo", "https://www.elmundo.es/economia/2026/03/02/69a55de7fc6c8351218b4595.html"],
  ["El Mundo", "https://www.elmundo.es/espana/2026/03/02/69a57967e85ece0a208b4582.html"],
  ["ABC", "https://www.abc.es/espana/robles-nombro-jefe-sanidad-militar-pesar-informe-20260302040308-nt.html"],
  ["ABC", "https://www.abc.es/espana/castilla-leon/candidato-psoe-castilla-leon-adjudico-130000e-empresa-20260227040346-nt.html"],
  ["La Vanguardia", "https://www.lavanguardia.com/local/valencia/20260302/11479135/contudencia-avl-favor-acento-abierto-valencia-16-votos-favor-2.html"],
  ["La Vanguardia", "https://www.lavanguardia.com/local/andalucia/20260301/11478619/detenido-hombre-intentar-raptar-menor-fuengirola.html"],
  ["elDiario.es", "https://www.eldiario.es/economia/oscar-puente-admite-adif-erro-no-avisar-inmediatamente-justicia-material-retirado-adamuz_1_13032114.html"],
  ["elDiario.es", "https://www.eldiario.es/politica/abascal-mantiene-negociacion-extremadura-demasiado-lejos-pp-sugiere-no-se-reuniran_1_13030948.html"],
  ["La Razón", "https://www.larazon.es/castilla-y-leon/15m-jovenes-movilidad-transporte-prioridades_2026030269a5802c9243cc133c6cb51e.html"],
  ["La Razón", "https://www.larazon.es/internacional/ataque-israel-eeuu-iran-directo-ataque-bases-estadounidenses-muertos-negociacion-ultima-hora_2026030269a5323d9243cc133c6c2157.html"],
  ["OKDiario", "https://okdiario.com/tecnologia/huawei-watch-gt-runner-2-freebuds-pro-5-lanzamientos-ponerse-marcha-16314651"],
  ["OKDiario", "https://okdiario.com/trailer/estrenos-mas-esperados-marzo-estan-movistar-plus-cuando-podremos-ver-valor-sentimental-16328551"],
  ["El Confidencial", "https://www.elconfidencial.com/economia/el-beneficio-de-la-duda/2026-03-01/el-petroleo-cerro-el-viernes-en-73-dolares-cuanto-subira-cuando-reabra-el-mercado-el-lunes_4312308"],
  ["El Confidencial", "https://www.elconfidencial.com/espana/cataluna/2026-02-27/fechas-y-detalles-mobile-world-congress-2026_4310253"],
  ["20 Minutos", "https://www.20minutos.es/internacional/iran-agita-europa-con-sus-ultimos-ataques-los-lideres-piden-contencion-que-se-retome-diplomacia_6940358_0.html"],
  ["20 Minutos", "https://www.20minutos.es/medio-ambiente/ornitologos-piden-edificios-ladrillos-nido-pajaros-medioambiente_6939906_0.html"],
  ["Newtral", "https://www.newtral.es/fiesta-tel-aviv-bulo-ataque-eeuu-israel-iran/20260228"],
  ["Newtral", "https://www.newtral.es/mapa-pensionistas-municipio/20260226"],
  ["El Español", "https://www.elespanol.com/sociedad/20260302/oficial-miles-jubilados-mutualistas-recibiran-intereses-demora-hacienda-retrasa-pago/1003744145107_0.html"],
  ["El Español", "https://www.elespanol.com/el-cultural/cine/20260301/domingos-conquista-goya-mejor-pelicula-gala-corta-politica/1003744150480_0.html"],
  ["Público", "https://www.publico.es/mujer/forocoches-pp-ayuso-estrategia-derechas-expulsar-charos-espacio-publico.html"],
  ["Público", "https://www.publico.es/internacional/ataque-eeuu-e-israel-iran-ultima-hora-directo.html"],
  ["RTVE", "https://www.rtve.es/noticias/20260301/israel-iran-eeuu-segunda-jornada-ataques/16959685.shtml"],
  ["RTVE", "https://www.rtve.es/noticias/20260226/casi-70-poblacion-cree-prostitucion-forma-violencia-contra-mujer/16955448.shtml"],
  ["El Periódico", "https://www.elperiodico.com/es/internacional/20260302/oiea-accidente-nuclear-iran-eeuu-israel-127448892"],
  ["El Periódico", "https://www.elperiodico.com/es/opinion/20260301/iran-guerra-legalidad-internacional-onu-127418011"],
];

interface DateResult {
  source: string;
  url: string;
  ogArticlePublishedTime: string | null;
  jsonLdDatePublished: string | null;
  metaDate: string | null;
  timeElement: string | null;
  urlDate: string | null;
}

// Extract date from common meta tags
function extractOgDate(html: string): string | null {
  const match = html.match(/<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']article:published_time["']/i);
  return match?.[1] || null;
}

// Extract from JSON-LD
function extractJsonLdDate(html: string): string | null {
  const ldRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = ldRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      // Handle arrays of LD objects
      const objects = Array.isArray(data) ? data : [data];
      for (const obj of objects) {
        if (obj.datePublished) return obj.datePublished;
        if (obj["@graph"]) {
          for (const item of obj["@graph"]) {
            if (item.datePublished) return item.datePublished;
          }
        }
      }
    } catch { /* ignore parse errors */ }
  }
  return null;
}

// Extract from <meta name="date"> or similar
function extractMetaDate(html: string): string | null {
  const patterns = [
    /<meta[^>]+name=["']date["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']DC\.date["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']sailthru\.date["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']publish[_-]?date["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+itemprop=["']datePublished["'][^>]+content=["']([^"']+)["']/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

// Extract first <time datetime="...">
function extractTimeElement(html: string): string | null {
  const match = html.match(/<time[^>]+datetime=["']([^"']+)["']/i);
  return match?.[1] || null;
}

// Extract date from URL pattern (YYYY/MM/DD or YYYYMMDD)
function extractUrlDate(url: string): string | null {
  const m = url.match(/\/(\d{4})[\/-](\d{2})[\/-](\d{2})/)
    || url.match(/[-\/](\d{4})(\d{2})(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html",
        "Accept-Language": "es-ES,es;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function main() {
  const results: DateResult[] = [];

  for (const [source, url] of URLS) {
    process.stdout.write(`  ${source}... `);
    const html = await fetchHtml(url);

    if (!html) {
      console.log("FETCH FAILED");
      results.push({ source, url, ogArticlePublishedTime: null, jsonLdDatePublished: null, metaDate: null, timeElement: null, urlDate: null });
      continue;
    }

    const r: DateResult = {
      source,
      url: url.slice(0, 80),
      ogArticlePublishedTime: extractOgDate(html),
      jsonLdDatePublished: extractJsonLdDate(html),
      metaDate: extractMetaDate(html),
      timeElement: extractTimeElement(html),
      urlDate: extractUrlDate(url),
    };
    results.push(r);

    const methods = [r.ogArticlePublishedTime && "OG", r.jsonLdDatePublished && "JSON-LD", r.metaDate && "meta", r.timeElement && "time", r.urlDate && "URL"].filter(Boolean);
    console.log(methods.length > 0 ? methods.join(", ") : "NONE");

    // Small delay between requests
    await new Promise(r => setTimeout(r, 300));
  }

  // Summary
  console.log("\n══════════════════════════════════════");
  console.log("  RESUMEN POR MÉTODO");
  console.log("══════════════════════════════════════");

  const total = results.length;
  const fetched = results.filter(r => r.ogArticlePublishedTime !== null || r.jsonLdDatePublished !== null || r.metaDate !== null || r.timeElement !== null || r.urlDate !== null).length;
  const none = results.filter(r => !r.ogArticlePublishedTime && !r.jsonLdDatePublished && !r.metaDate && !r.timeElement && !r.urlDate).length;

  const byMethod = {
    "article:published_time (OG)": results.filter(r => r.ogArticlePublishedTime).length,
    "JSON-LD datePublished": results.filter(r => r.jsonLdDatePublished).length,
    "<meta name=date>": results.filter(r => r.metaDate).length,
    "<time datetime>": results.filter(r => r.timeElement).length,
    "URL pattern": results.filter(r => r.urlDate).length,
  };

  for (const [method, count] of Object.entries(byMethod)) {
    console.log(`  ${method}: ${count}/${total} (${Math.round(count/total*100)}%)`);
  }

  // Best strategy: OG || JSON-LD || meta || time || URL
  const withAnyReliable = results.filter(r => r.ogArticlePublishedTime || r.jsonLdDatePublished || r.metaDate).length;
  const withAny = results.filter(r => r.ogArticlePublishedTime || r.jsonLdDatePublished || r.metaDate || r.timeElement).length;
  const withAnyIncUrl = fetched;

  console.log(`\n  Combinados (OG || JSON-LD || meta): ${withAnyReliable}/${total} (${Math.round(withAnyReliable/total*100)}%)`);
  console.log(`  + <time>: ${withAny}/${total} (${Math.round(withAny/total*100)}%)`);
  console.log(`  + URL fallback: ${withAnyIncUrl}/${total} (${Math.round(withAnyIncUrl/total*100)}%)`);
  console.log(`  Sin fecha: ${none}/${total}`);

  // Per-source breakdown
  console.log("\n══════════════════════════════════════");
  console.log("  POR FUENTE");
  console.log("══════════════════════════════════════");

  const sources = [...new Set(results.map(r => r.source))];
  for (const s of sources) {
    const sourceResults = results.filter(r => r.source === s);
    const methods = sourceResults.map(r => {
      const best = r.ogArticlePublishedTime ? `OG: ${r.ogArticlePublishedTime.slice(0,19)}`
        : r.jsonLdDatePublished ? `LD: ${r.jsonLdDatePublished.slice(0,19)}`
        : r.metaDate ? `meta: ${r.metaDate.slice(0,19)}`
        : r.timeElement ? `time: ${r.timeElement.slice(0,19)}`
        : r.urlDate ? `URL: ${r.urlDate}`
        : "NONE";
      return best;
    });
    console.log(`  ${s.padEnd(18)} ${methods.join("  |  ")}`);
  }
}

main().catch(console.error);
