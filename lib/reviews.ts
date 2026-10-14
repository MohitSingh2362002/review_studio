export type Client={id:string;name:string;niche:string;city:string;url:string;services:string;keywords:string;active:number;created:string;description?:string;address?:string;phone?:string;whatsapp?:string;website?:string;image?:string;google_account?:string|null;google_location?:string|null;synced_at?:string|null;review_data?:string;sync_warnings?:string};
export function googleUrl(value:string){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&['g.page','maps.app.goo.gl','search.google.com','maps.google.com','www.google.com','google.com'].includes(u.hostname)?u.href:null;}catch{return null;}}
export function splitEntries(value:unknown):string[]{const seen=new Set<string>();return String(value??'').split(/[,\n\r]+/).map(s=>s.trim()).filter(s=>{const key=s.toLocaleLowerCase();if(!s||seen.has(key))return false;seen.add(key);return true;});}
export function validateClient(raw:any){
 const keywords=splitEntries(raw.keywords),services=splitEntries(raw.services);
 if(keywords.length>50)throw Error('Add up to 50 unique keywords per business.');
 if(keywords.some(s=>s.length>100))throw Error('Keep each keyword under 101 characters.');
 if(services.length>50||services.some(s=>s.length>120))throw Error('Add up to 50 services or products, each up to 120 characters.');
 const c={name:String(raw.name||'').trim(),niche:String(raw.niche||'').trim(),city:String(raw.city||'').trim(),url:googleUrl(String(raw.url||'').trim()),services:services.join(', '),keywords:keywords.join('\n')};
 if(!c.name||!c.niche||!c.url)throw Error('Business name, niche and a valid HTTPS Google review link are required.');
 if(c.name.length>120||c.niche.length>100||c.city.length>100||c.url.length>2048)throw Error('One or more fields are too long.');
 return c;
}

export function safeWebsite(value:unknown){const s=String(value||'').trim();if(!s)return '';try{const u=new URL(s);if(u.protocol==='https:'&&!u.username&&!u.password&&s.length<=2048)return u.href;}catch{}throw Error('Use a valid HTTPS website URL.');}
export function safeImage(value:unknown){const s=String(value||'').trim();if(!s||/^\/api\/images\/[a-f0-9-]{36}$/.test(s))return s;return safeWebsite(s);}
export function profileFields(raw:any){const p={description:String(raw.description||'').trim(),address:String(raw.address||'').trim(),phone:String(raw.phone||'').trim(),whatsapp:String(raw.whatsapp||'').trim(),website:safeWebsite(raw.website),image:safeImage(raw.image)};if(p.description.length>2000||p.address.length>1000||p.phone.length>40||p.whatsapp.length>200)throw Error('Profile details are too long.');if(p.whatsapp&&!/^\+?[\d ()-]{6,30}$/.test(p.whatsapp)&&!/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(p.whatsapp))throw Error('Enter a WhatsApp number or a wa.me link.');return p;}
