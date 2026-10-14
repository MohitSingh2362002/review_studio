import {database} from '@/lib/database';

import {Client,splitEntries} from '@/lib/reviews';
import {groundedKeywords,parseSuggestions,reviewInstructions,templateSuggestions} from '@/lib/suggestions';
export async function POST(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Invalid origin.'},{status:403});
 try{
  const body=await req.text();if(body.length>14000)return Response.json({error:'Please shorten your experience.'},{status:400});
  let p:any;try{p=JSON.parse(body);}catch{return Response.json({error:'Invalid request.'},{status:400});}
  if(typeof p.id!=='string'||typeof p.experience!=='string'||p.experience.trim().length<15||p.experience.length>2000||typeof p.service!=='string'||!p.service.trim()||p.service.length>120||!Number.isInteger(p.rating)||p.rating<1||p.rating>5||p.confirm!==true)return Response.json({error:'Select a service or product, choose your rating and describe your own experience (15–2,000 characters).'},{status:400});
  const db=database();const c=await db.prepare('SELECT id,name,niche,city,url,services,keywords,active FROM clients WHERE id=? AND active=1').bind(p.id).first<Client>();
  if(!c)return Response.json({error:'Review page unavailable.'},{status:404});
  const service=p.service.trim(),experience=p.experience.trim();
  const eligibleKeywords=groundedKeywords(c.keywords,service,experience,c.city);
  const fallback=(notice?:string)=>Response.json({mode:'template',suggestions:templateSuggestions(c.name,service,experience,p.rating,eligibleKeywords),notice:notice||'AI writing is not connected. These five templates keep your own words.'});
  const apiKey=process.env.OPENAI_API_KEY || (globalThis as any).env?.OPENAI_API_KEY;if(!apiKey)return fallback();
  const day=new Date().toISOString().slice(0,10),ip=req.headers.get('cf-connecting-ip')||'anonymous';
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip+'|'+day));
  const ipkey=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
  const results=await db.batch([db.prepare('INSERT INTO draft_limits(id,count) VALUES (?,1) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count').bind('ip:'+day+':'+ipkey),db.prepare('INSERT INTO draft_limits(id,count) VALUES (?,1) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count').bind('client:'+day+':'+c.id)]);
  if(Number((results[0].results[0] as any).count)>30||Number((results[1].results[0] as any).count)>250)return fallback('The AI limit has been reached for today. Here are five templates using your own words.');
  try{
   const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(25000),body:JSON.stringify({model:process.env.OPENAI_MODEL||(globalThis as any).env?.OPENAI_MODEL||'gpt-4.1-mini',store:false,max_output_tokens:1800,instructions:reviewInstructions,input:JSON.stringify({business:c.name,niche:c.niche,service,rating:p.rating,experience,eligibleKeywords})})});

   if(!response.ok)throw Error('Provider unavailable');
   const data=await response.json() as any;if(data.status==='incomplete')throw Error('Incomplete output');
   const text=data.output?.flatMap((x:any)=>x.content||[]).filter((x:any)=>x.type==='output_text').map((x:any)=>x.text).join('\n');
   const suggestions=parseSuggestions(text||'');
   // Reject manager-only keyword claims that were not grounded in customer input.
   const unsupported=splitEntries(c.keywords).filter(k=>!eligibleKeywords.includes(k)&&!`${c.name} ${service} ${experience}`.toLocaleLowerCase().includes(k.toLocaleLowerCase()));
   if(suggestions.some(s=>unsupported.some(k=>s.text.toLocaleLowerCase().includes(k.toLocaleLowerCase()))))throw Error('Ungrounded keyword');
   return Response.json({mode:'ai',suggestions});
  }catch{return fallback('AI writing is temporarily unavailable. These five templates keep your own words.');}
 }catch(e){console.error('Suggestions failed',e instanceof Error?e.name:'error');return Response.json({error:'Could not prepare suggestions. Your experience is still here. Please try again.'},{status:503});}
}
