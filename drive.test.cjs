const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
const DriveClient=require('./drive-client.js');
const Pdf=require('./quote-pdf.js');
const Pricing=require('./pricing.js');
function fixture(){return {submissionId:'8b1c03da-dccf-41ea-bb2b-f75c96b5cc21',id:'NS-TEST1234',createdAt:'2026-10-29T15:00:00Z',client:{name:'María González',email:'demo@example.com',whatsapp:'+595 981 123 456',company:''},event:{type:'Evento corporativo',date:'2026-12-15',guests:60,location:'Asunción',name:'Prueba',notes:'',photo:true,video:false,photoHours:5,videoHours:2,reels:0,extras:[],products:['album']}};}
function iterator(items){let index=0;return {hasNext:()=>index<items.length,next:()=>items[index++]};}
class File{
  constructor(name,data,mime='application/pdf'){this.name=name;this.data=data;this.mime=mime;this.id=crypto.randomUUID();this.access='private';}
  getBlob(){return blob(this.data,this.mime,this.name);}
  getId(){return this.id;}
  getName(){return this.name;}
  getUrl(){return 'https://drive.google.com/file/d/'+this.id+'/view';}
  getSharingAccess(){return this.access;}
  setContent(content){this.data=content;return this;}
}
function blob(data,mime,name){const bytes=typeof data==='string'?Buffer.from(data):Buffer.from(data);return {name,mime,getDataAsString:()=>bytes.toString('utf8'),getBytes:()=>[...bytes]};}
function environment(){
  const files=[],mails=[],properties=new Map(),triggers=[];let failStorage=false,failMail=false,validHuman=true,captchaCalls=0,hasCaptchaSecret=true;
  const folder={getSharingAccess:()=> 'private',getName:()=> 'Presupuestos NoStop',getFoldersByName:()=>iterator([records]),createFolder:()=>records,getFilesByName:name=>iterator(files.filter(f=>f.name===name&&f.mime==='application/pdf')),createFile(input){if(failStorage)throw new Error('Storage failed');const file=new File(input.name,input.getBytes());files.push(file);return file;}};
  const records={getFilesByName:name=>iterator(files.filter(f=>f.name===name&&f.mime==='application/json')),getFiles:()=>iterator(files.filter(f=>f.mime==='application/json')),createFile(name,content,mime){const file=new File(name,content,mime);files.push(file);return file;}};
  const lock={tryLock:()=>true,releaseLock:()=>{}};
  const context=vm.createContext({console:{log(){},warn(){}},Intl,Date,Uint8Array,
    DriveApp:{Access:{PRIVATE:'private'},getFolderById:id=>{assert.equal(id,'14jqeIfEswbnZCXhsIL0akEd5hPsXGPdt');return folder;},getFileById:id=>{const file=files.find(f=>f.id===id);if(!file)throw new Error('Missing file');return file;}},
    MailApp:{getRemainingDailyQuota:()=>50,sendEmail:mail=>{if(failMail)throw new Error('Mail failed');mails.push(mail);}},
    PropertiesService:{getScriptProperties:()=>({getProperty:key=>key==='RECAPTCHA_SECRET'?(hasCaptchaSecret?'test-secret':null):properties.get(key),setProperty:(key,value)=>properties.set(key,value),deleteProperty:key=>properties.delete(key)})},
    Utilities:{getUuid:()=>crypto.randomUUID(),DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,value)=>[...crypto.createHash('sha256').update(typeof value==='string'?value:Buffer.from(value)).digest()],base64Encode:value=>Buffer.from(value).toString('base64'),base64Decode:value=>[...Buffer.from(value,'base64')],newBlob:blob,formatDate:()=> '2026-10-29'},
    UrlFetchApp:{fetch:url=>{captchaCalls++;assert.equal(url,'https://www.google.com/recaptcha/api/siteverify');return {getContentText:()=>JSON.stringify({success:validHuman,hostname:'marcosfranco09.github.io'})};}},
    LockService:{getScriptLock:()=>lock},
    HtmlService:{XFrameOptionsMode:{ALLOWALL:'allowall'},createHtmlOutput:html=>({html,setXFrameOptionsMode(){return this;}})},
    ScriptApp:{getProjectTriggers:()=>triggers,newTrigger:name=>({timeBased(){return this;},everyMinutes(){return this;},create(){triggers.push({getHandlerFunction:()=>name});}})}
  });
  vm.runInContext(fs.readFileSync('google-drive/Code.gs','utf8'),context);
  return {context,files,mails,triggers,properties,captchaCalls:()=>captchaCalls,noCaptcha:()=>{hasCaptchaSecret=false;},failStorage:()=>{failStorage=true;},fixStorage:()=>{failStorage=false;},failMail:()=>{failMail=true;},fixMail:()=>{failMail=false;},invalidHuman:()=>{validHuman=false;}};
}
async function payload(){const quote=fixture();const bytes=await Pdf.create(quote,Pricing.calculate(quote.event));return {requestId:crypto.randomUUID(),parentOrigin:'https://marcosfranco09.github.io',quote,token:'test-token',pdfBase64:Buffer.from(bytes).toString('base64')};}
function post(env,data){return env.context.doPost({parameter:{payload:JSON.stringify(data)}}).html;}
test('Drive stores the exact downloaded PDF and sends only one owner notification on retry',async()=>{
  const env=environment(),data=await payload();
  assert.ok(post(env,data).includes('"stored":true'));
  assert.ok(post(env,data).includes('"notification":"sent"'));
  const pdfs=env.files.filter(file=>file.mime==='application/pdf');assert.equal(pdfs.length,1);
  assert.equal(pdfs[0].name,'Presupuesto_Maria_Gonzalez_NS-TEST1234.pdf');
  assert.deepEqual(Buffer.from(pdfs[0].getBlob().getBytes()),Buffer.from(data.pdfBase64,'base64'));
  assert.equal(env.mails.length,1);assert.equal(env.mails[0].to,'robfranco97@gmail.com');
  assert.ok(env.mails[0].body.includes('https://drive.google.com/file/d/'));
  assert.ok(env.mails[0].body.includes('Precio final APROXIMADO'));
  assert.ok(env.mails[0].body.includes('WhatsApp: +595 981 123 456'));
  assert.ok(!post(env,data).includes('https://drive.google.com/file/d/'));
});
test('Drive rejects invalid origins, captcha, data and changed payloads with same id',async()=>{
  const data=await payload(),env=environment();
  assert.ok(post(env,{...data,parentOrigin:'https://evil.example'}).includes('no permitidos'));
  env.invalidHuman();assert.ok(post(env,data).includes('"stored":false'));assert.equal(env.files.length,0);
  const valid=environment();assert.ok(post(valid,{...data,pdfBase64:Buffer.from('not a PDF').toString('base64')}).includes('"stored":false'));
  assert.ok(post(valid,data).includes('"stored":true'));
  const changed=structuredClone(data);changed.quote.client.name='Otra persona';
  assert.ok(post(valid,changed).includes('"stored":false'));
});
test('Drive reports storage failure honestly and retries pending mail without another PDF',async()=>{
  const env=environment(),data=await payload();env.failStorage();
  assert.ok(post(env,data).includes('"stored":false'));
  env.fixStorage();env.failMail();
  assert.ok(post(env,data).includes('"notification":"pending"'));
  env.fixMail();env.context.reintentarAvisos();
  assert.equal(env.mails.length,1);assert.equal(env.files.filter(file=>file.mime==='application/pdf').length,1);
});
test('Drive recalculates amounts and setup creates one retry trigger',async()=>{
  const env=environment(),data=await payload();data.quote.result={total:1};post(env,data);
  const record=JSON.parse(env.files.find(file=>file.mime==='application/json').data);
  assert.equal(record.quote.result.total,4000000);
  assert.equal(record.quote.client.whatsapp,'+595 981 123 456');
  env.context.configurar();env.context.configurar();assert.equal(env.triggers.length,1);
});
test('browser confirmation requires a Google origin and matching request identifiers',()=>{
  const event={origin:'https://script.googleusercontent.com',data:{type:'nostop-drive-result',requestId:'nonce',quoteId:'NS-12345678',stored:true}};
  assert.equal(DriveClient.isReply(event,'nonce','NS-12345678'),true);
  assert.equal(DriveClient.isReply({...event,origin:'https://evil.example'},'nonce','NS-12345678'),false);
  assert.equal(DriveClient.isReply(event,'wrong','NS-12345678'),false);
  assert.equal(DriveClient.isGoogleOrigin('https://script.google.com.evil.example'),false);
  assert.equal(DriveClient.isGoogleOrigin('https://n-example-script.googleusercontent.com'),true);
});
test('regenerating the same quote preserves identical PDF bytes for Drive retries',async()=>{
  const quote=fixture(),result=Pricing.calculate(quote.event);
  const first=await Pdf.create(quote,result),second=await Pdf.create(quote,result);
  assert.deepEqual(Buffer.from(first),Buffer.from(second));
});
test('temporary Drive mode works from localhost without captcha and rejects wrong or expired codes',async()=>{
  const env=environment(),data=await payload();env.noCaptcha();env.context.configurarPruebas();
  const testToken=env.properties.get('TEST_TOKEN');assert.equal(testToken.length,64);
  data.parentOrigin='http://localhost:4173';data.testMode=true;data.token='';data.testToken='wrong';
  assert.ok(post(env,data).includes('"stored":false'));assert.equal(env.mails.length,0);
  data.testToken=testToken;
  assert.ok(post(env,data).includes('"stored":true'));assert.equal(env.captchaCalls(),0);assert.equal(env.mails.length,1);
  env.properties.set('TEST_UNTIL',String(Date.now()-1000));
  assert.ok(post(env,data).includes('"stored":false'));
  env.context.configurarPruebas();assert.notEqual(env.properties.get('TEST_TOKEN'),testToken);
  assert.ok(post(env,data).includes('"stored":false'));
});
test('test mode is capped at ten new submissions and production setup revokes test codes',async()=>{
  const env=environment();env.context.configurarPruebas();
  for(let i=0;i<11;i++){
    const data=await payload();data.quote.submissionId=crypto.randomUUID();data.quote.id='NS-TEST'+String(i).padStart(4,'0');
    data.testMode=true;data.testToken=env.properties.get('TEST_TOKEN');
    assert.ok(post(env,data).includes(i<10?'"stored":true':'"stored":false'));
  }
  env.context.configurar();assert.equal(env.properties.has('TEST_TOKEN'),false);assert.equal(env.properties.has('TEST_UNTIL'),false);
});
test('browser test mode loads no captcha script and passes the entered code only with the upload',async()=>{
  const elements={cloudChallenge:{append(){}},cloudHelp:{textContent:''}},created=[];
  const document={getElementById:id=>elements[id],createElement:tag=>{created.push(tag);return {value:'',append(input){elements[input.id]=input;}};}};
  let uploaded;
  const window={QUOTE_CLOUD:{provider:'drive',testMode:true,appsScriptUrl:'https://script.google.com/macros/s/EXAMPLE/exec'}};
  const context=vm.createContext({window,document,DriveClient:{send:async input=>{uploaded=input;return {stored:true};}}});
  vm.runInContext(fs.readFileSync('cloud-client.js','utf8'),context);
  assert.equal(window.QuoteCloud.configured(),true);assert.ok(!created.includes('script'));
  assert.throws(()=>window.QuoteCloud.requireReady(),/Ingresá el código de prueba/);
  assert.equal(elements.driveTestCode.type,'password');elements.driveTestCode.value='test-only-code';
  await window.QuoteCloud.send({id:'NS-TEST1234'},{bytes:new Uint8Array([1]),filename:'test.pdf'});
  assert.equal(uploaded.testMode,true);assert.equal(uploaded.testToken,'test-only-code');assert.equal(uploaded.token,'');
});
