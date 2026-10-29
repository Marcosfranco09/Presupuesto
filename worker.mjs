import Pdf from './quote-pdf.js';
import Validation from './quote-validation.cjs';
import Pricing from './pricing.js';

const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...headers}});
const keyFor=id=>'requests/'+id+'.json';
async function read(bucket,key){const object=await bucket.get(key);return object?object.json():null;}
async function notify(env,job,fetcher=fetch){
  const marker='notified/'+job.quote.submissionId+'.json';
  if(await env.QUOTES.head(marker))return true;
  const result=job.quote.result;
  const response=await fetcher('https://api.resend.com/emails',{
    method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'quote/'+job.quote.submissionId},
    body:JSON.stringify({from:env.MAIL_FROM,to:[env.NOTIFY_TO],subject:'Nuevo presupuesto: '+job.quote.client.name,
      text:[`Hay un nuevo presupuesto de ${job.quote.client.name}.`,`Número: ${job.quote.id}`,`Evento: ${job.quote.event.type} · ${job.quote.event.date}`,`${Pricing.totalLabel(result)}: Gs. ${new Intl.NumberFormat('es-PY').format(result.total)}`,result.pending?'Hay conceptos a cotizar que no están incluidos en el importe mostrado.':'',`Archivo: ${job.filename}`,`Ubicación privada en R2: ${job.pdfKey}`,'Consultá el PDF en tu cuenta de Cloudflare → R2 → nostop-presupuestos.','El cliente no recibió este correo.'].filter(Boolean).join('\n')})
  });
  if(!response.ok)throw new Error('MAIL_PROVIDER_FAILED');
  const confirmation=await response.json();
  if(!confirmation.id)throw new Error('MAIL_PROVIDER_FAILED');
  await env.QUOTES.put(marker,JSON.stringify({providerId:confirmation.id,acceptedAt:new Date().toISOString()}));
  return true;
}
export async function handle(request,env,fetcher=fetch){
  const url=new URL(request.url);
  if(url.pathname!=='/api/quotes')return env.ASSETS?env.ASSETS.fetch(request):json({error:'No encontrado.'},404);
  const origin=request.headers.get('Origin');
  const allowed=new Set([url.origin,...(env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean)]);
  if(!origin||!allowed.has(origin))return json({error:'Origen no permitido.'},403);
  const cors={'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'};
  const reply=(data,status=200)=>json(data,status,cors);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(request.method!=='POST')return reply({error:'Método no permitido.'},405);
  if(!env.QUOTES||!env.RESEND_API_KEY||!env.MAIL_FROM||!env.NOTIFY_TO||!env.TURNSTILE_SECRET_KEY)return reply({error:'El guardado en la nube todavía no está configurado.'},503);
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return reply({error:'Formato inválido.'},415);
  if(Number(request.headers.get('Content-Length'))>16000)return reply({error:'Solicitud demasiado grande.'},413);
  let payload,quote;
  try{const text=await request.text();if(new TextEncoder().encode(text).length>16000)return reply({error:'Solicitud demasiado grande.'},413);payload=JSON.parse(text);quote=Validation.validate(payload.quote);}catch{return reply({error:'Revisá los datos del presupuesto.'},400);}
  if(typeof payload.token!=='string'||!payload.token||payload.token.length>2048)return reply({error:'Completá la verificación antes de enviar.'},400);
  let human;
  try{
    const verified=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:payload.token,remoteip:request.headers.get('CF-Connecting-IP')||''})});
    human=await verified.json();
  }catch{return reply({error:'No se pudo verificar el envío. Reintentá.'},502);}
  if(!human.success||human.action!=='quote'||human.hostname!==new URL(origin).hostname)return reply({error:'Verificación vencida o inválida. Volvé a intentarlo.'},400);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(quote)));
  const hash=[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
  const id=quote.submissionId;
  const pdfKey=`presupuestos/${quote.createdAt.slice(0,10)}/${id}/${Pdf.filename(quote)}`;
  const job={quote,hash,pdfKey,filename:Pdf.filename(quote),claimedAt:new Date().toISOString()};
  let ownsClaim=false;
  try{
    const claimed=await env.QUOTES.put(keyFor(id),JSON.stringify(job),{onlyIf:{etagDoesNotMatch:'*'},httpMetadata:{contentType:'application/json'}});
    ownsClaim=!!claimed;
    if(!ownsClaim){
      const locked=await env.QUOTES.get(keyFor(id));
      const existing=locked?await locked.json():null;
      if(!existing||existing.hash!==hash)return reply({error:'Este identificador ya pertenece a otro presupuesto.'},409);
      if(!await env.QUOTES.head(pdfKey)){
        // Recover an interrupted upload after its short lease, using a compare-
        // and-swap so simultaneous retries cannot overwrite each other's claim.
        if(Date.now()-Date.parse(existing.claimedAt||job.claimedAt)<5*60*1000)return reply({error:'El presupuesto se está procesando. Reintentá en unos segundos.'},409);
        ownsClaim=!!await env.QUOTES.put(keyFor(id),JSON.stringify(job),{onlyIf:{etagMatches:locked.etag},httpMetadata:{contentType:'application/json'}});
        if(!ownsClaim)return reply({error:'Otro reintento está procesando el presupuesto.'},409);
      }
    }
    if(ownsClaim){
      const logoResponse=await env.ASSETS.fetch(new Request(url.origin+'/assets/logo.png'));
      if(!logoResponse.ok)throw new Error('LOGO_MISSING');
      const bytes=await Pdf.create(quote,quote.result,await logoResponse.arrayBuffer());
      await env.QUOTES.put(pdfKey,bytes,{httpMetadata:{contentType:'application/pdf',contentDisposition:`attachment; filename="${job.filename}"`}});
    }
    const pendingKey='pending/'+id+'.json';
    // Persist the notification before acknowledging cloud storage, so the cron
    // can retry even if the mail provider is temporarily unavailable.
    await env.QUOTES.put(pendingKey,JSON.stringify(job),{httpMetadata:{contentType:'application/json'}});
    let notification='pending';
    try{await notify(env,job,fetcher);notification='sent';await env.QUOTES.delete(pendingKey);}catch{/* Cron retries without claiming mail delivery. */}
    return reply({stored:true,id:quote.id,filename:job.filename,notification});
  }catch{
    // Release failed claims only if no PDF was persisted. Never erase a saved PDF.
    if(ownsClaim){try{if(!await env.QUOTES.head(pdfKey))await env.QUOTES.delete(keyFor(id));}catch{}}
    return reply({error:'No pudimos confirmar el guardado en la nube. Conservá el PDF y reintentá.'},503);
  }
}
export default {
  fetch:(request,env)=>handle(request,env),
  async scheduled(_event,env,context){
    context.waitUntil((async()=>{
      const batch=await env.QUOTES.list({prefix:'pending/',limit:50});
      for(const object of batch.objects){
        try{const job=await read(env.QUOTES,object.key);if(job){await notify(env,job);await env.QUOTES.delete(object.key);}}catch{/* Keep the durable pending job for the next run. */}
      }
    })());
  }
};
