/**
 * export-web.ts — Standalone export of SQLite data to static JSON for panorama-web
 *
 * Wrapper around src/lib/export.ts.
 * Usage: npm run export:web [-- --edition <id>]
 */

import "dotenv/config";
import { initDb } from "../src/lib/db.js";
import { exportEditionIndex } from "../src/lib/export.js";
import { getAllEditions } from "../src/lib/queries.js";

async function main() {
  await initDb();

  const args = process.argv.slice(2);
  let editionId: number | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--edition" && args[i + 1]) {
      editionId = parseInt(args[i + 1]);
      i++;
    }
  }

  if (!editionId) {
    // Default: latest published edition
    const editions = await getAllEditions();
    if (editions.length === 0) {
      console.log("No published editions found.");
      process.exit(1);
    }
    editionId = editions[0].id;
  }

  console.log(`Exporting edition #${editionId}...\n`);
  await exportEditionIndex(editionId);
  console.log("\nDone!");
}

main().catch((e) => {
  console.error(`Export failed: ${e.message || e}`);
  process.exit(1);
});
