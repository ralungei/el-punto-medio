/**
 * D1 HTTP Adapter — Implements D1Database interface using the Cloudflare REST API.
 * Allows the pipeline to write to D1 from outside Workers (e.g. GitHub Actions).
 */

const CF_API = "https://api.cloudflare.com/client/v4/accounts";

interface D1Meta {
  duration: number;
  changes: number;
  last_row_id: number;
  changed_db: boolean;
  rows_read: number;
  rows_written: number;
}

interface D1ResultSet {
  results: Record<string, unknown>[];
  success: boolean;
  meta: D1Meta;
}

export function createD1HttpAdapter(
  accountId: string,
  databaseId: string,
  token: string
) {
  const url = `${CF_API}/${accountId}/d1/database/${databaseId}/query`;

  async function execute(
    sql: string,
    params: unknown[] = []
  ): Promise<D1ResultSet> {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
    });

    const data = (await res.json()) as {
      result: D1ResultSet[];
      success: boolean;
      errors: { message: string }[];
    };

    if (!data.success) {
      throw new Error(
        `D1 error: ${data.errors?.[0]?.message || "unknown"}`
      );
    }

    return data.result[0];
  }

  function createStatement(sql: string) {
    let boundParams: unknown[] = [];

    const stmt = {
      bind(...params: unknown[]) {
        boundParams = params;
        return stmt;
      },

      async all() {
        const result = await execute(sql, boundParams);
        return {
          results: result.results || [],
          success: true,
          meta: result.meta,
        };
      },

      async first(colName?: string) {
        const result = await execute(sql, boundParams);
        const row = result.results?.[0] || null;
        if (colName && row) return (row as Record<string, unknown>)[colName];
        return row;
      },

      async run() {
        const result = await execute(sql, boundParams);
        return {
          results: result.results || [],
          success: true,
          meta: result.meta,
        };
      },

      async raw() {
        const result = await execute(sql, boundParams);
        return (result.results || []).map((row) => Object.values(row));
      },
    };

    return stmt;
  }

  return {
    prepare(sql: string) {
      return createStatement(sql);
    },

    async batch(statements: ReturnType<typeof createStatement>[]) {
      const results = [];
      for (const stmt of statements) {
        results.push(await stmt.all());
      }
      return results;
    },

    async exec(sql: string) {
      return execute(sql);
    },
  };
}
