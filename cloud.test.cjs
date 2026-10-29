const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {PDFDocument}=require('pdf-lib');
const Pdf=require('./quote-pdf.js');
const {validate}=require('./quote-validation.cjs');
const logo=fs.readFileSync(path.join(__dirname,'assets/logo.png'));
function fixture(){return {submissionId:'8b1c03da-dccf-41ea-bb2b-f75c96b5cc21',id:'NS-TEST1234',createdAt:'2026-10-29T15:00:00Z',client:{name:'María González',email:'demo@example.com',company:'Empresa de prueba'},event:{type:'Evento corporativo',date:'2026-12-15',guests:150,location:'Asunción, salón de prueba',name:'Evento de ejemplo',notes:'Detalles de prueba. '.repeat(25),photo:true,video:true,photoHours:5,videoHours:6,reels:3,extras:['vertical','drive','urgent','stories','raw','interviews'],products:['prints','enlargements','album','book','travel']}};}
class Bucket{
  objects=new Map();
  revision=0;
  async put(key,value,options={}){const old=this.objects.get(key);if(options.onlyIf?.etagDoesNotMatch==='*'&&old)return null;if(options.onlyIf?.etagMatches&&old?.etag!==options.onlyIf.etagMatches)return null;this.objects.set(key,{value,options,etag:String(++this.revision)});return {key};}
  async get(key){const item=this.objects.get(key);return item?{etag:item.etag,json:async()=>JSON.parse(item.value)}:null;}
  async head(key){return this.objects.has(key)?{key}:null;}
  async delete(key){this.objects.delete(key);}
  async list({prefix}){return {objects:[...this.objects.keys()].filter(key=>key.startsWith(prefix)).map(key=>({key}))};}
}
function environment(){return {QUOTES:new Bucket(),RESEND_API_KEY:'test-only',TURNSTILE_SECRET_KEY:'test-only',MAIL_FROM:'NoStop <test@example.com>',NOTIFY_TO:'robfranco97@gmail.com',ALLOWED_ORIGINS:'https://marcosfranco09.github.io',ASSETS:{fetch:async()=>new Response(logo)}};}
function request(quote=fixture(),origin='https://marcosfranco09.github.io'){return new Request('https://test.example/api/quotes',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({quote,token:'test-token'})});}
function providers({failMail=false,invalidHuman=false}={}){const mail=[];return {mail,fetch:async(url,options)=>{
  if(String(url).includes('siteverify'))return Response.json({success:!invalidHuman,action:'quote',hostname:'marcosfranco09.github.io'});
  assert.equal(url,'https://api.resend.com/emails');mail.push(JSON.parse(options.body));
  return failMail?new Response('unavailable',{status:503}):Response.json({id:'test-mail-id'});
}};}
test('PDF has one A4 page with every product; file name uses client name',async()=>{
  const quote=validate(fixture());const bytes=await Pdf.create(quote,quote.result,logo);
  const pdf=await PDFDocument.load(bytes);assert.equal(pdf.getPageCount(),1);
  assert.ok(Math.abs(pdf.getPage(0).getSize().width-595.28)<.01);
  assert.equal(Pdf.filename(quote),'Presupuesto_Maria_Gonzalez_NS-TEST1234.pdf');
  fs.mkdirSync('tmp',{recursive:true});fs.writeFileSync('tmp/cloud-pdf-example.pdf',bytes);
});
test('server ignores supplied totals and rejects invalid selections',()=>{
  const input=fixture();input.result={total:1};assert.notEqual(validate(input).result.total,1);
  input.event.extras.push('made-up');assert.throws(()=>validate(input));
});
test('cloud stores a private PDF and sends mail only to owner, without duplicates',async()=>{
  const {handle}=await import('./worker.mjs');const env=environment(),remote=providers();
  const response=await handle(request(),env,remote.fetch);assert.equal(response.status,200);assert.equal((await response.json()).notification,'sent');
  const repeat=await handle(request(),env,remote.fetch);assert.equal(repeat.status,200);
  assert.equal([...env.QUOTES.objects.keys()].filter(key=>key.endsWith('.pdf')).length,1);
  assert.equal(remote.mail.length,1);assert.deepEqual(remote.mail[0].to,['robfranco97@gmail.com']);
  assert.ok(remote.mail[0].text.includes('Precio final APROXIMADO'));
  assert.ok(!('cc' in remote.mail[0]));assert.ok(!('bcc' in remote.mail[0]));
  const changed=fixture();changed.client.name='Otra persona';assert.equal((await handle(request(changed),env,remote.fetch)).status,409);
});
test('mail failure keeps durable pending notification and retry does not duplicate PDF',async()=>{
  const {handle}=await import('./worker.mjs');const env=environment();
  const first=await handle(request(),env,providers({failMail:true}).fetch);
  assert.equal((await first.json()).notification,'pending');assert.ok(await env.QUOTES.head('pending/'+fixture().submissionId+'.json'));
  const retry=await handle(request(),env,providers().fetch);assert.equal((await retry.json()).notification,'sent');
  assert.equal(await env.QUOTES.head('pending/'+fixture().submissionId+'.json'),null);
  assert.equal([...env.QUOTES.objects.keys()].filter(key=>key.endsWith('.pdf')).length,1);
});
test('origin, human verification, config and storage failures cannot report success',async()=>{
  const {handle}=await import('./worker.mjs');
  assert.equal((await handle(request(fixture(),'https://untrusted.example'),environment(),providers().fetch)).status,403);
  assert.equal((await handle(request(),environment(),providers({invalidHuman:true}).fetch)).status,400);
  const missing=environment();delete missing.RESEND_API_KEY;
  assert.equal((await handle(request(),missing,providers().fetch)).status,503);
  const broken=environment();const original=broken.QUOTES.put.bind(broken.QUOTES);
  broken.QUOTES.put=async(key,...args)=>{if(key.endsWith('.pdf'))throw new Error('test storage failure');return original(key,...args);};
  assert.equal((await handle(request(),broken,providers().fetch)).status,503);
  assert.equal(await broken.QUOTES.head('requests/'+fixture().submissionId+'.json'),null);
});
test('scheduled retry sends queued mail only to owner and clears the outbox',async()=>{
  const worker=(await import('./worker.mjs')).default;const {handle}=await import('./worker.mjs');const env=environment();
  await handle(request(),env,providers({failMail:true}).fetch);
  const mock=providers(),original=global.fetch;
  try{
    global.fetch=mock.fetch;let completion;
    await worker.scheduled({},env,{waitUntil:promise=>{completion=promise;}});await completion;
    assert.deepEqual(mock.mail[0].to,['robfranco97@gmail.com']);
    assert.equal((await env.QUOTES.list({prefix:'pending/'})).objects.length,0);
  }finally{global.fetch=original;}
});
