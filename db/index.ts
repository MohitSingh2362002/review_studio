import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  let db = (globalThis as any).env?.DB;
  if (!db) {
    try {
      const { createRequire } = require('node:module');
      const cf = createRequire(import.meta.url)('cloudflare:workers');
      db = cf?.env?.DB;
    } catch {
      // not in cloudflare workers
    }
  }

  if (!db) {
    return null as any;
  }

  return drizzle(db, { schema });
}

