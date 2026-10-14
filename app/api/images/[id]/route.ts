function getBucket() {
  if (typeof globalThis !== 'undefined' && (globalThis as any).env?.BUCKET) {
    return (globalThis as any).env.BUCKET;
  }
  try {
    const { createRequire } = require('node:module');
    const cf = createRequire(import.meta.url)('cloudflare:workers');
    return cf?.env?.BUCKET;
  } catch {
    return null;
  }
}

export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;if(!/^[a-f0-9-]{36}$/.test(id))return new Response('Not found',{status:404});try{const bucket=getBucket();if(!bucket)return new Response('Not found',{status:404});const obj=await bucket.get(id);if(!obj)return new Response('Not found',{status:404});return new Response(obj.body,{headers:{'Content-Type':obj.httpMetadata?.contentType||'application/octet-stream','Cache-Control':'public,max-age=86400','X-Content-Type-Options':'nosniff'}});}catch{return new Response('Image unavailable',{status:503});}}

