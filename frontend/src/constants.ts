export const CATEGORY_COLORS: Record<string, string> = {
  política: "#E03131",
  economía: "#2F9E44",
  sociedad: "#7048E8",
  internacional: "#2563EB",
  cultura: "#F59F00",
  deportes: "#2F9E44",
  tecnología: "#0CA678",
  salud: "#E64980",
  ciencia: "#9775FA",
};

export const LEAN_COLORS: Record<string, string> = {
  left: "#E03131",
  "center-left": "#F06292",
  center: "#868E96",
  "center-right": "#5C7CFA",
  right: "#2563EB",
  public: "#2F9E44",
};

export const LEAN_ORDER: Record<string, number> = {
  left: 0,
  "center-left": 1,
  center: 2,
  public: 2.5,
  "center-right": 3,
  right: 4,
};

export const LEAN_LABELS: Record<string, string> = {
  left: "Izquierda",
  "center-left": "Centro-izq",
  center: "Centro",
  "center-right": "Centro-der",
  right: "Derecha",
  public: "Público",
};

export const EDITION_LABELS: Record<string, string> = {
  morning: "Matinal",
  midday: "Mediodía",
  night: "Nocturna",
};

export const NAV_ITEMS = [
  { label: "Portada", href: "/" },
  { label: "Política", href: "/?cat=política" },
  { label: "Economía", href: "/?cat=economía" },
  { label: "Sociedad", href: "/?cat=sociedad" },
  { label: "Internacional", href: "/?cat=internacional" },
  { label: "Cultura", href: "/?cat=cultura" },
  { label: "Deportes", href: "/?cat=deportes" },
  { label: "Tecnología", href: "/?cat=tecnología" },
  { label: "Salud", href: "/?cat=salud" },
  { label: "Ciencia", href: "/?cat=ciencia" },
  { label: "Archivo", href: "/archivo" },
];

export const SPECTRUM_COLORS = [
  "#E03131",
  "#F06292",
  "#868E96",
  "#5C7CFA",
  "#2563EB",
  "#2F9E44",
];

export const SOURCE_DOMAIN: Record<string, string> = {
  "El País": "elpais.com",
  "El Mundo": "elmundo.es",
  ABC: "abc.es",
  "La Vanguardia": "lavanguardia.com",
  "elDiario.es": "eldiario.es",
  "La Razón": "larazon.es",
  Público: "publico.es",
  OKDiario: "okdiario.com",
  "El Confidencial": "elconfidencial.com",
  "20 Minutos": "20minutos.es",
  RTVE: "rtve.es",
  "El Periódico": "elperiodico.com",
  Newtral: "newtral.es",
  "El Español": "elespanol.com",
};

export function getFavicon(name: string): string | null {
  const domain = SOURCE_DOMAIN[name];
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

export const TONE_COLORS: Record<string, string> = {
  neutral: "#868E96",
  favorable: "#40A02B",
  crítico: "#E64553",
  alarmista: "#FE640B",
  sensacionalista: "#DF8E1D",
  defensivo: "#7C3AED",
};
