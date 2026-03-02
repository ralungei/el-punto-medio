import { inArray } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

const BATCH_SIZE = 500;

/**
 * inArray but batched to avoid D1's 999 SQL variable limit.
 * Returns all rows matching any of the ids across multiple queries.
 */
export async function batchSelect<T>(
  queryFn: (condition: ReturnType<typeof inArray>) => Promise<T[]>,
  column: SQLiteColumn,
  ids: (string | number)[]
): Promise<T[]> {
  if (ids.length === 0) return [];
  if (ids.length <= BATCH_SIZE) return queryFn(inArray(column, ids));

  const results: T[] = [];
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const chunk = ids.slice(i, i + BATCH_SIZE);
    const rows = await queryFn(inArray(column, chunk));
    results.push(...rows);
  }
  return results;
}

/**
 * Simple concurrency pool: runs up to `concurrency` tasks in parallel.
 * When one finishes, the next queued task starts.
 * Returns results in the same order as the input tasks.
 */
export async function runConcurrent<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const i = nextIndex++;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    () => worker()
  );

  await Promise.all(workers);
  return results;
}
