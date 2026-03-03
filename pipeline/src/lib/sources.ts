export type PoliticalLean =
  | "left"
  | "center-left"
  | "center"
  | "center-right"
  | "right"
  | "public";

export interface SourceConfig {
  name: string;
  url: string;
  rssUrl: string;
  politicalLean: PoliticalLean;
  /** Override URL to scrape (defaults to url) */
  scrapeUrl?: string;
}

export const SOURCES: SourceConfig[] = [
  {
    name: "El País",
    url: "https://elpais.com",
    rssUrl: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada",
    politicalLean: "center-left",
  },
  {
    name: "El Mundo",
    url: "https://elmundo.es",
    rssUrl: "https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml",
    politicalLean: "center-right",
  },
  {
    name: "ABC",
    url: "https://abc.es",
    rssUrl: "https://www.abc.es/rss/2.0/espana/",
    politicalLean: "right",
  },
  {
    name: "La Vanguardia",
    url: "https://lavanguardia.com",
    rssUrl: "https://www.lavanguardia.com/rss/home.xml",
    politicalLean: "center",
  },
  {
    name: "elDiario.es",
    url: "https://eldiario.es",
    rssUrl: "https://www.eldiario.es/rss/",
    politicalLean: "left",
  },
  {
    name: "La Razón",
    url: "https://larazon.es",
    rssUrl: "https://www.larazon.es/?outputType=xml",
    politicalLean: "right",
  },
  {
    name: "OKDiario",
    url: "https://okdiario.com",
    rssUrl: "https://okdiario.com/feed",
    politicalLean: "right",
  },
  {
    name: "El Confidencial",
    url: "https://elconfidencial.com",
    rssUrl: "https://rss.elconfidencial.com/espana/",
    politicalLean: "center",
  },
  {
    name: "20 Minutos",
    url: "https://20minutos.es",
    rssUrl: "https://www.20minutos.es/rss/",
    politicalLean: "center",
  },
  {
    name: "Newtral",
    url: "https://newtral.es",
    rssUrl: "https://www.newtral.es/feed/",
    politicalLean: "center-left",
  },
  {
    name: "El Español",
    url: "https://elespanol.com",
    rssUrl: "https://www.elespanol.com/rss/",
    politicalLean: "center-right",
  },
  {
    name: "Público",
    url: "https://publico.es",
    rssUrl: "",
    politicalLean: "left",
    scrapeUrl: "https://www.publico.es/",
  },
  {
    name: "RTVE",
    url: "https://rtve.es",
    rssUrl: "",
    politicalLean: "public",
    scrapeUrl: "https://www.rtve.es/noticias/",
  },
  {
    name: "El Periódico",
    url: "https://elperiodico.com",
    rssUrl: "https://www.elperiodico.com/es/cds/rss/?id=board.xml",
    politicalLean: "center-left",
  },
  {
    name: "Agencia SINC",
    url: "https://agenciasinc.es",
    rssUrl: "",
    politicalLean: "public",
    scrapeUrl: "https://www.agenciasinc.es/",
  },
  {
    name: "Redacción Médica",
    url: "https://redaccionmedica.com",
    rssUrl: "",
    politicalLean: "public",
    scrapeUrl: "https://www.redaccionmedica.com/",
  },
  {
    name: "Europa Press",
    url: "https://europapress.es",
    rssUrl: "",
    politicalLean: "center",
    scrapeUrl: "https://www.europapress.es/",
  },
  {
    name: "Xataka",
    url: "https://xataka.com",
    rssUrl: "",
    politicalLean: "center",
    scrapeUrl: "https://www.xataka.com/",
  },
  {
    name: "Hipertextual",
    url: "https://hipertextual.com",
    rssUrl: "",
    politicalLean: "center",
    scrapeUrl: "https://hipertextual.com/",
  },
  {
    name: "National Geographic España",
    url: "https://nationalgeographic.com.es",
    rssUrl: "",
    politicalLean: "public",
    scrapeUrl: "https://www.nationalgeographic.com.es/",
  },
  {
    name: "EFE",
    url: "https://efe.com",
    rssUrl: "",
    politicalLean: "public",
    scrapeUrl: "https://efe.com/ultimas-noticias/",
  },
];

export const LEAN_LABELS: Record<PoliticalLean, string> = {
  left: "Izquierda",
  "center-left": "Centro-izquierda",
  center: "Centro",
  "center-right": "Centro-derecha",
  right: "Derecha",
  public: "Público",
};

export const LEAN_COLORS: Record<PoliticalLean, string> = {
  left: "#c2185b",
  "center-left": "#e91e63",
  center: "#9e9e9e",
  "center-right": "#1976d2",
  right: "#0d47a1",
  public: "#4caf50",
};
