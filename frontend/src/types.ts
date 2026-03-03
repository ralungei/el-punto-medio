export type PoliticalLean =
  | "left"
  | "center-left"
  | "center"
  | "center-right"
  | "right"
  | "public";

export interface Source {
  id: number;
  name: string;
  url: string;
  rssUrl: string;
  politicalLean: PoliticalLean;
  logoUrl: string | null;
  active: boolean;
}

export interface Edition {
  id: number;
  type: string;
  publishedAt: string | null;
  articleCount: number;
  status: string;
  createdAt: string;
  articles?: EditionArticlePreview[];
}

export interface CarouselImage {
  url: string;
  source: string;
}

export interface EditionArticlePreview {
  id: number;
  slug: string;
  headline: string;
  imageUrl: string | null;
  images?: CarouselImage[];
  sourcesCount: number;
  category: string | null;
  categories?: string[];
}

export type Sentiment = "positive" | "negative" | "neutral";

export interface ArticleWithMeta {
  id: number;
  slug: string;
  headline: string;
  summary: string | null;
  sentiment: Sentiment | null;
  category: string | null;
  categories?: string[];
  imageUrl: string | null;
  images?: CarouselImage[];
  sourcesCount: number;
  createdAt: string;
  updatedAt: string | null;
  editionType: string;
}

export interface CoverageSource {
  sourceName: string;
  tone: string;
  summary: string;
}

export interface ArticleSections {
  facts: string;
  coverage: CoverageSource[];
  hidden: string;
  context: string;
  questions: string[];
}

export interface ClusterSource {
  id: number;
  title: string;
  url: string;
  publishedAt: string | null;
  sourceId: number;
  source: {
    id: number;
    name: string;
    politicalLean: PoliticalLean;
  } | null;
}

export interface FeedMeta {
  days: number;
  editionCount: number;
  articleCount: number;
  latestEdition: {
    id: number;
    type: string;
    publishedAt: string | null;
    articleCount: number;
  } | null;
}

export interface FeedData {
  meta: FeedMeta;
  articles: ArticleWithMeta[];
}

export interface ArticleDetail {
  id: number;
  clusterId: number;
  editionId: number;
  slug: string;
  headline: string;
  summary: string | null;
  sentiment: Sentiment | null;
  sections: ArticleSections;
  category: string | null;
  categories?: string[];
  imageUrl: string | null;
  images?: CarouselImage[];
  sourcesCount: number;
  createdAt: string;
  updatedAt: string | null;
  clusterSources: ClusterSource[];
  allSources: { id: number; name: string; politicalLean: PoliticalLean }[];
}
