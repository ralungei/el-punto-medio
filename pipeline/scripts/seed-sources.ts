import "dotenv/config";
import { db, schema, initDb } from "../src/lib/db.js";
import { SOURCES } from "../src/lib/sources.js";
import { eq } from "drizzle-orm";

async function seed() {
  await initDb();

  console.log("Seeding sources...");

  for (const source of SOURCES) {
    const existing = await db
      .select()
      .from(schema.sources)
      .where(eq(schema.sources.name, source.name))
      .get();

    if (existing) {
      // Update rssUrl and url if they changed
      if (existing.rssUrl !== source.rssUrl || existing.url !== source.url) {
        await db.update(schema.sources)
          .set({ rssUrl: source.rssUrl, url: source.url })
          .where(eq(schema.sources.id, existing.id))
          .run();
        console.log(`  ↻ ${source.name} (updated)`);
      } else {
        console.log(`  · ${source.name} (already exists)`);
      }
      continue;
    }

    await db.insert(schema.sources)
      .values({
        name: source.name,
        url: source.url,
        rssUrl: source.rssUrl,
        politicalLean: source.politicalLean,
        active: true,
      })
      .run();
    console.log(`  ✓ ${source.name}`);
  }

  console.log(`Done. ${SOURCES.length} sources configured.`);
}

seed().catch((e) => {
  console.error(`Seed failed: ${e.message || e}`);
  process.exit(1);
});
