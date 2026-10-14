import {getChatGPTUser} from '@/app/chatgpt-auth';
import {database} from '@/lib/database';

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

export async function POST(req:Request){const u=await getChatGPTUser();if(!u)return Response.json({error:'Please sign in.'},{status:401});if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Invalid origin.'},{status:403});try{if(Number(req.headers.get('content-length')||0)>5500000)throw Error('Use an image smaller than 5 MB.');const f=(await req.formData()).get('image');if(!(f instanceof File)||f.size>5000000)throw Error('Use a PNG, JPG or WebP smaller than 5 MB.');const b=new Uint8Array(await f.arrayBuffer());let mime='';if(b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71)mime='image/png';else if(b[0]===255&&b[1]===216&&b[2]===255)mime='image/jpeg';else if(new TextDecoder().decode(b.slice(0,4))==='RIFF'&&new TextDecoder().decode(b.slice(8,12))==='WEBP')mime='image/webp';if(!mime)throw Error('Only PNG, JPG and WebP images are supported.');const id=crypto.randomUUID();const bucket=getBucket();if(bucket){await bucket.put(id,b,{httpMetadata:{contentType:mime}});}try{await database().prepare('INSERT INTO uploads(id,owner,mime,created) VALUES (?,?,?,?)').bind(id,u.userId,mime,new Date().toISOString()).run();}catch(e){if(bucket)await bucket.delete(id);throw e;}return Response.json({url:`/api/images/${id}`});}catch(e){return Response.json({error:e instanceof Error?e.message:'Could not upload image.'},{status:400});}}

