CREATE TABLE `articles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cluster_id` integer NOT NULL,
	`edition_id` integer NOT NULL,
	`slug` text NOT NULL,
	`headline` text NOT NULL,
	`summary` text,
	`sections` text NOT NULL,
	`category` text,
	`sources_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`cluster_id`) REFERENCES `clusters`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`edition_id`) REFERENCES `editions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `articles_slug_unique` ON `articles` (`slug`);--> statement-breakpoint
CREATE TABLE `cluster_articles` (
	`cluster_id` integer NOT NULL,
	`raw_article_id` integer NOT NULL,
	PRIMARY KEY(`cluster_id`, `raw_article_id`),
	FOREIGN KEY (`cluster_id`) REFERENCES `clusters`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`raw_article_id`) REFERENCES `raw_articles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `clusters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`edition_id` integer NOT NULL,
	`topic_summary` text,
	`article_count` integer DEFAULT 0 NOT NULL,
	`category` text,
	`avg_similarity` real,
	FOREIGN KEY (`edition_id`) REFERENCES `editions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `editions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`published_at` text,
	`article_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `raw_articles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` integer NOT NULL,
	`edition_id` integer,
	`title` text NOT NULL,
	`description` text,
	`url` text NOT NULL,
	`author` text,
	`published_at` text,
	`category` text,
	`fetched_at` text NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`edition_id`) REFERENCES `editions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `raw_articles_url_unique` ON `raw_articles` (`url`);--> statement-breakpoint
CREATE TABLE `source_analyses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cluster_id` integer NOT NULL,
	`source_id` integer NOT NULL,
	`tone` text,
	`framing` text,
	`emphasis` text,
	`omissions` text,
	`raw_json` text,
	FOREIGN KEY (`cluster_id`) REFERENCES `clusters`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`rss_url` text NOT NULL,
	`political_lean` text NOT NULL,
	`logo_url` text,
	`active` integer DEFAULT true NOT NULL
);
