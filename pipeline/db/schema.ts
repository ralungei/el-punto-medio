import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const sources = sqliteTable("sources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  rssUrl: text("rss_url").notNull(),
  politicalLean: text("political_lean").notNull(), // left, center-left, center, center-right, right, public
  logoUrl: text("logo_url"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const editions = sqliteTable("editions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(), // morning, midday, night
  publishedAt: text("published_at"),
  articleCount: integer("article_count").notNull().default(0),
  status: text("status").notNull().default("draft"), // draft, published
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const rawArticles = sqliteTable("raw_articles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceId: integer("source_id")
    .notNull()
    .references(() => sources.id),
  editionId: integer("edition_id").references(() => editions.id),
  title: text("title").notNull(),
  description: text("description"),
  url: text("url").notNull().unique(),
  author: text("author"),
  publishedAt: text("published_at"),
  category: text("category"),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  content: text("content"),
  contentImages: text("content_images"),
  fetchedAt: text("fetched_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const clusters = sqliteTable("clusters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  editionId: integer("edition_id")
    .notNull()
    .references(() => editions.id),
  storyId: text("story_id"),
  topicSummary: text("topic_summary"),
  articleCount: integer("article_count").notNull().default(0),
  category: text("category"), // deprecated — kept for backwards compat
  categories: text("categories"), // JSON array: ["deportes","sociedad"]
  avgSimilarity: real("avg_similarity"),
  analysisHash: text("analysis_hash"),
});

export const clusterArticles = sqliteTable(
  "cluster_articles",
  {
    clusterId: integer("cluster_id")
      .notNull()
      .references(() => clusters.id),
    rawArticleId: integer("raw_article_id")
      .notNull()
      .references(() => rawArticles.id),
  },
  (table) => [primaryKey({ columns: [table.clusterId, table.rawArticleId] })]
);

export const sourceAnalyses = sqliteTable("source_analyses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clusterId: integer("cluster_id")
    .notNull()
    .references(() => clusters.id),
  sourceId: integer("source_id")
    .notNull()
    .references(() => sources.id),
  tone: text("tone"), // neutral, alarmist, favorable, critical, etc
  framing: text("framing"),
  emphasis: text("emphasis"),
  omissions: text("omissions"),
  rawJson: text("raw_json"), // full analysis JSON
}, (table) => [
  uniqueIndex("source_analyses_cluster_source_idx").on(table.clusterId, table.sourceId),
]);

export const articles = sqliteTable("articles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clusterId: integer("cluster_id")
    .notNull()
    .references(() => clusters.id),
  editionId: integer("edition_id")
    .notNull()
    .references(() => editions.id),
  slug: text("slug").notNull().unique(),
  headline: text("headline").notNull(),
  summary: text("summary"),
  sections: text("sections").notNull(), // JSON with all article sections
  category: text("category"), // deprecated — kept for backwards compat
  categories: text("categories"), // JSON array: ["deportes","sociedad"]
  imageUrl: text("image_url"),
  sentiment: text("sentiment"), // positive, negative, neutral
  sourcesCount: integer("sources_count").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at"),
  synthesisHash: text("synthesis_hash"),
});
