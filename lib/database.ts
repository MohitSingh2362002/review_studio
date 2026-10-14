import { Client } from './reviews';

const DEMO_CLIENTS: Record<string, any> = {
  '9421a1cf-46c1-428d-b7e2-99721b57355e': {
    id: '9421a1cf-46c1-428d-b7e2-99721b57355e',
    owner: 'default',
    name: 'Veduio',
    niche: 'Software',
    city: 'Delhi',
    url: 'https://g.page/r/CXRWKlK8gD9xEBM/review?utm_source=gbp&utm_medium=reviews&utm_campaign=qr',
    services: 'Saas Software, LMS Software, CRM Software',
    keywords: 'Software, Delhi',
    description: 'Leading software development and SaaS solutions',
    address: 'Delhi, India',
    phone: '',
    whatsapp: '',
    website: '',
    image: '',
    active: 1,
    created: new Date().toISOString()
  },
  'ca0233a1-a704-42af-947c-c69c1b434f5f': {
    id: 'ca0233a1-a704-42af-947c-c69c1b434f5f',
    owner: 'default',
    name: 'Acme Dental',
    niche: 'Dentistry',
    city: 'San Francisco',
    url: 'https://g.page/r/test/review',
    services: 'Teeth Whitening, Dental Implants',
    keywords: 'Dentist, San Francisco',
    description: 'Dental care for the whole family',
    address: 'San Francisco, CA',
    phone: '',
    whatsapp: '',
    website: '',
    image: '',
    active: 1,
    created: new Date().toISOString()
  }
};

const inMemoryClients: Record<string, any> = { ...DEMO_CLIENTS };

function getNativeD1(): any {
  if (typeof globalThis !== 'undefined' && (globalThis as any).env?.DB) {
    return (globalThis as any).env.DB;
  }
  try {
    const { createRequire } = require('node:module');
    const cf = createRequire(import.meta.url)('cloudflare:workers');
    if (cf?.env?.DB) return cf.env.DB;
  } catch {
    // not in cloudflare workers
  }
  return null;
}

// Fallback D1 implementation for Vercel/Node environment
class FallbackD1 {
  prepare(sql: string) {
    let boundParams: any[] = [];
    return {
      bind(...params: any[]) {
        boundParams = params;
        return this;
      },
      async first<T = any>(): Promise<T | null> {
        const lower = sql.toLowerCase();
        if (lower.includes('from clients')) {
          const id = boundParams[0];
          const client = inMemoryClients[id] || Object.values(inMemoryClients).find((c: any) => c.id === id);
          if (client) return client as T;
          if (!id && Object.values(inMemoryClients).length > 0) {
            return Object.values(inMemoryClients)[0] as T;
          }
          return null;
        }
        if (lower.includes('count(*)')) {
          return { count: Object.keys(inMemoryClients).length } as T;
        }
        return null;
      },
      async all<T = any>(): Promise<{ results: T[] }> {
        const lower = sql.toLowerCase();
        if (lower.includes('from clients')) {
          return { results: Object.values(inMemoryClients) as T[] };
        }
        return { results: [] };
      },
      async run(): Promise<{ meta: { changes: number } }> {
        const lower = sql.toLowerCase();
        if (lower.startsWith('insert into clients')) {
          const [id, owner, name, niche, city, url, services, keywords, description, address, phone, whatsapp, website, image, active, created] = boundParams;
          inMemoryClients[id] = { id, owner, name, niche, city, url, services, keywords, description, address, phone, whatsapp, website, image, active: active ?? 1, created: created || new Date().toISOString() };
          return { meta: { changes: 1 } };
        }
        return { meta: { changes: 1 } };
      }
    };
  }
  async batch(statements: any[]) {
    for (const stmt of statements) {
      if (typeof stmt?.run === 'function') await stmt.run();
    }
    return [];
  }
}

const fallbackInstance = new FallbackD1();

export function database(): D1Database {
  const native = getNativeD1();
  if (native) return native as D1Database;
  return fallbackInstance as unknown as D1Database;
}

