import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let pool: any;
let db: any;

function createMockQueryBuilder(resolvedValue: any = []): any {
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (val: any) => void) => resolve(resolvedValue);
      }
      if (prop === "catch") {
        return () => Promise.resolve(resolvedValue);
      }
      return (..._args: any[]) => {
        return new Proxy(() => {}, handler);
      };
    },
    apply(_target, _thisArg, _argArray) {
      return new Proxy(() => {}, handler);
    },
  };
  return new Proxy(() => {}, handler);
}

if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
  } catch (err) {
    console.warn("[AI Studio] Error initializing database pool, using mock:", err);
  }
}

if (!db) {
  console.warn("[AI Studio] DATABASE_URL not set — database mock active");
  pool = {
    query: async () => ({ rows: [] }),
    connect: async () => ({ query: async () => ({ rows: [] }), release: () => {} }),
    end: async () => {},
  };
  const noOp = {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    create: async (d: any) => d?.data ?? {},
    update: async (d: any) => d?.data ?? {},
    delete: async () => ({}),
  };
  db = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "query") {
          return new Proxy({}, { get: () => noOp });
        }
        return (..._args: any[]) => createMockQueryBuilder([]);
      },
    },
  );
}

export { pool, db };
export * from "./schema";
