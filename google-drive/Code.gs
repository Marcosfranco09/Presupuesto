// AUTO-GENERATED: npm run prepare:drive
var Tariff=(function(){
  const tiers = [
    {max:60,label:'Hasta 60 invitados',prices:[2000000,2500000,3000000],extra:500000},
    {max:100,label:'61–100 invitados',prices:[2450000,3050000,3650000],extra:600000},
    {max:200,label:'101–200 invitados',prices:[2950000,3700000,4400000],extra:700000},
    {max:400,label:'201–400 invitados',prices:[3550000,4450000,5350000],extra:900000},
    {max:Infinity,label:'Más de 400 invitados',prices:[4350000,5400000,6500000],extra:1100000}
  ];
  const extras = [
    {id:'drive',name:'Cobertura en tiempo real (entrega de fotografías al instante durante el evento)',price:900000,requires:'photo'},
    {id:'vertical',name:'Video resumen vertical para redes',price:500000,requires:'video'},
    {id:'urgent',name:'Entrega prioritaria de selección (24 h)',price:400000,requires:'photo',excluded:true},
    {id:'stories',name:'Cobertura de Stories durante el evento',price:400000},
    {id:'raw',name:'Grabación vertical sin edición',price:400000},
    {id:'interviews',name:'Notas y entrevistas con participantes',price:400000}
  ];
  const products = [
    {id:'prints',name:'Fotografías impresas',hint:'Según tamaño y cantidad'},
    {id:'enlargements',name:'Ampliaciones fotográficas',hint:'Según medida'},
    {id:'album',name:'Álbum fotográfico personalizado',hint:'Desde Gs. 500.000',price:500000,approximate:true},
    {id:'book',name:'Fotolibro premium',hint:'Desde Gs. 900.000',price:900000,approximate:true},
    {id:'travel',name:'Traslado del equipo',hint:'Según ubicación y recorrido'}
  ];
  function calculate(input) {
    const guests=Number(input.guests);
    if(!Number.isInteger(guests)||guests<1) return {error:'Ingresá una cantidad válida de invitados.'};
    const tier=tiers.find(t=>guests<=t.max);
    const special=['Boda','XV años'].includes(input.type);
    const lines=[];
    for(const id of ['photo','video']) if(input[id]) {
      const hours=Number(input[id+'Hours']);
      if(!Number.isInteger(hours)||hours<2||hours>24)return {error:'La cobertura debe durar entre 2 y 24 horas enteras.'};
      const extraHours=Math.max(0,hours-4);
      const price=hours<=4?tier.prices[hours-2]:tier.prices[2]+extraHours*tier.extra;
      const hourDetail=extraHours?` · 4 h + ${extraHours} h adicional(es) a Gs. ${new Intl.NumberFormat('es-PY').format(tier.extra)}/h`:'';
      lines.push({id,name:(id==='photo'?'Cobertura fotográfica':'Cobertura de video')+` · ${hours} h`,price:special?null:price,hint:special?'Propuesta específica según cronograma':tier.label+hourDetail});
    }
    for(const extra of extras) if(input.extras.includes(extra.id)&&(!extra.requires||input[extra.requires]))lines.push({...extra});
    if(input.reels>0) {
      if(![1,2,3].includes(Number(input.reels)))return {error:'Seleccioná un pack de Reels válido.'};
      lines.push({id:'reels',name:input.reels+' Reel(s) editado(s)',price:[650000,900000,1300000][input.reels-1]});
    }
    for(const product of products)if(input.products.includes(product.id))lines.push({...product,price:product.price??null,excluded:true});
    const count=lines.filter(l=>!l.excluded).length;
    const rate=count>=3?.1:count===2?.05:0;
    const subtotal=lines.reduce((sum,l)=>sum+(l.price??0),0);
    const eligible=lines.filter(l=>!l.excluded).reduce((sum,l)=>sum+(l.price??0),0);
    const discount=Math.round(eligible*rate);
    const pending=special||lines.some(l=>l.price===null);
    const approximate=lines.some(l=>l.approximate);
    return {lines,tier:tier.label,extraHour:tier.extra,subtotal,discount,rate,total:subtotal-discount,deposit:pending?null:Math.round((subtotal-discount)/2),pending,approximate,special,count};
  }
  function totalLabel(result){return result.approximate?'Precio final APROXIMADO, sin IVA':result.pending?'Importe parcial conocido, sin IVA':'Total estimado, sin IVA';}

return {calculate:calculate,extras:extras,products:products,totalLabel:totalLabel};
})();

var Pricing=Tariff;
function validateGoogleQuote_(payload){
  const fail=message=>{throw new Error(message);};
  const text=(value,label,max,required=true)=>{
    if(typeof value!=='string'||value.length>max||(required&&!value.trim()))fail('Campo inválido: '+label);
    return value.trim();
  };
  if(!payload||typeof payload!=='object')fail('Solicitud inválida.');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.submissionId||''))fail('Identificador inválido.');
  if(!/^NS-[A-Z0-9-]{8,40}$/.test(payload.id||''))fail('Número de presupuesto inválido.');
  if(!Number.isFinite(Date.parse(payload.createdAt)))fail('Fecha inválida.');
  const source=payload.client||{},event=payload.event||{};
  const client={name:text(source.name,'nombre',100),email:text(source.email,'correo',254),whatsapp:text(source.whatsapp??'','WhatsApp',32,false),company:text(source.company??'','empresa',100,false)};
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email))fail('Correo inválido.');
  if(client.whatsapp&&(!/^\+?[\d\s().-]+$/.test(client.whatsapp)||client.whatsapp.replace(/\D/g,'').length<7||client.whatsapp.replace(/\D/g,'').length>15))fail('Campo inválido: WhatsApp. Usá entre 7 y 15 dígitos, con código de país.');
  if(!['Evento corporativo','Cumpleaños','Boda','XV años','Otro evento'].includes(event.type))fail('Tipo de evento inválido.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(event.date||'')||!Number.isFinite(Date.parse(event.date+'T12:00:00Z'))||new Date(event.date+'T12:00:00Z').toISOString().slice(0,10)!==event.date)fail('Fecha del evento inválida.');
  if(!Number.isInteger(event.guests)||event.guests<1||event.guests>1000000)fail('Invitados inválidos.');
  if(typeof event.photo!=='boolean'||typeof event.video!=='boolean')fail('Cobertura inválida.');
  for(const id of ['photo','video'])if(!Number.isInteger(event[id+'Hours'])||event[id+'Hours']<2||event[id+'Hours']>24)fail('Horas inválidas.');
  if(!Number.isInteger(event.reels)||event.reels<0||event.reels>3)fail('Pack de Reels inválido.');
  for(const [field,allowed]of [['extras',Pricing.extras],['products',Pricing.products]]){
    if(!Array.isArray(event[field])||event[field].length>allowed.length||new Set(event[field]).size!==event[field].length||event[field].some(id=>!allowed.some(item=>item.id===id)))fail('Selección inválida: '+field);
  }
  const normalized={type:event.type,date:event.date,guests:event.guests,photo:event.photo,video:event.video,photoHours:event.photoHours,videoHours:event.videoHours,reels:event.reels,extras:[...event.extras],products:[...event.products],name:text(event.name??'','proyecto',120,false),location:text(event.location,'ubicación',250),notes:text(event.notes??'','notas',600,false)};
  const result=Pricing.calculate(normalized);if(result.error||!result.lines.length)fail(result.error||'Seleccioná un servicio.');
  return {submissionId:payload.submissionId,id:payload.id,createdAt:new Date(payload.createdAt).toISOString(),tariffVersion:'2026-v4',client,event:normalized,result};
}


// Source for the generated Code.gs. Do not paste this file alone.
var DRIVE_FOLDER_ID = '14jqeIfEswbnZCXhsIL0akEd5hPsXGPdt';
var NOTIFY_TO = 'robfranco97@gmail.com';
var ALLOWED_ORIGINS = ['https://marcosfranco09.github.io', 'http://127.0.0.1:4173', 'http://localhost:4173'];
var MAX_PDF_BYTES = 1500000;

function configurar() {
  var properties=PropertiesService.getScriptProperties();
  if(!properties.getProperty('RECAPTCHA_SECRET'))throw new Error('Agregá RECAPTCHA_SECRET en Configuración del proyecto → Propiedades de secuencia de comandos.');
  prepareFolder_();
  properties.deleteProperty('TEST_TOKEN');properties.deleteProperty('TEST_UNTIL');
  console.log('Modo público con reCAPTCHA preparado. Modo de prueba desactivado.');
}
function configurarPruebas(){
  prepareFolder_();
  var properties=PropertiesService.getScriptProperties();
  var code=(Utilities.getUuid()+Utilities.getUuid()).replace(/-/g,'');
  var expires=Date.now()+48*60*60*1000;
  properties.setProperty('TEST_TOKEN',code);properties.setProperty('TEST_UNTIL',String(expires));
  console.log('Código de prueba (solo para ingresar en tu formulario): '+code);
  console.log('Vence: '+new Date(expires).toISOString()+'. Cada ejecución genera un código nuevo.');
}
function prepareFolder_(){
  var folder=DriveApp.getFolderById(DRIVE_FOLDER_ID);
  privateDestination_(folder);
  var name=folder.getName();
  MailApp.getRemainingDailyQuota();
  recordsFolder_(folder);
  var exists=ScriptApp.getProjectTriggers().some(function(trigger){return trigger.getHandlerFunction()==='reintentarAvisos';});
  if(!exists)ScriptApp.newTrigger('reintentarAvisos').timeBased().everyMinutes(10).create();
  console.log('Carpeta configurada: '+name+'. Avisos solo a '+NOTIFY_TO+'. No se envió un correo de prueba.');
}
function recordsFolder_(folder) {
  var folders=folder.getFoldersByName('Registros del presupuestador');
  return folders.hasNext()?folders.next():folder.createFolder('Registros del presupuestador');
}
function digest_(value){return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,value));}
function readRecord_(folder,name){var files=folder.getFilesByName(name);return files.hasNext()?files.next():null;}
function privateDestination_(file){
  if(file.getSharingAccess()!==DriveApp.Access.PRIVATE)throw new Error('La carpeta de destino debe ser privada.');
}
function notify_(record,recordFile){
  if(record.notification==='sent')return 'sent';
  if(MailApp.getRemainingDailyQuota()<1)return 'pending';
  var result=record.quote.result;
  var pdf=DriveApp.getFileById(record.fileId);privateDestination_(pdf);
  var body=[
    'Hay un nuevo presupuesto de '+record.quote.client.name+'.',
    'Número: '+record.quote.id,
    'WhatsApp: '+(record.quote.client.whatsapp||'No informado'),
    'Evento: '+record.quote.event.type+' · '+record.quote.event.date,
    Tariff.totalLabel(result)+': Gs. '+new Intl.NumberFormat('es-PY').format(result.total),
    result.pending?'Hay conceptos sin precio definido que no se incluyen en el importe mostrado.':'',
    'Archivo: '+record.filename,
    'Abrir en tu Drive (requiere acceso a tu cuenta): '+pdf.getUrl()
  ].filter(Boolean).join('\n');
  MailApp.sendEmail({to:NOTIFY_TO,subject:'Nuevo presupuesto: '+record.quote.client.name,body:body,name:'Presupuestos NoStop'});
  record.notification='sent';record.notifiedAt=new Date().toISOString();
  recordFile.setContent(JSON.stringify(record));
  return 'sent';
}
function processQuote_(payload){
  var properties=PropertiesService.getScriptProperties();
  if(payload.testMode===true){
    var until=Number(properties.getProperty('TEST_UNTIL'));
    var testCode=properties.getProperty('TEST_TOKEN');
    if(!until||Date.now()>=until||!testCode)throw new Error('El modo de prueba venció o no está configurado. Ejecutá configurarPruebas nuevamente.');
    if(typeof payload.testToken!=='string'||payload.testToken!==testCode)throw new Error('El código de prueba es incorrecto. Revisalo en Apps Script.');
  }else{
    var secret=properties.getProperty('RECAPTCHA_SECRET');
    if(!secret)throw new Error('La conexión a Drive todavía no está configurada.');
    if(typeof payload.token!=='string'||!payload.token||payload.token.length>4096)throw new Error('Completá la verificación antes de descargar.');
    var verified=UrlFetchApp.fetch('https://www.google.com/recaptcha/api/siteverify',{method:'post',payload:{secret:secret,response:payload.token},muteHttpExceptions:true});
    var verification=JSON.parse(verified.getContentText());
    var expectedHost=payload.parentOrigin.replace(/^https?:\/\//,'').replace(/:\d+$/,'');
    if(!verification.success||verification.hostname!==expectedHost)throw new Error('La verificación venció. Completala de nuevo y reintentá.');
  }
  var quote=validateGoogleQuote_(payload.quote);
  if(typeof payload.pdfBase64!=='string'||payload.pdfBase64.length>MAX_PDF_BYTES*1.34||!/^[A-Za-z0-9+/]+={0,2}$/.test(payload.pdfBase64))throw new Error('El PDF no tiene un formato válido.');
  var bytes=Utilities.base64Decode(payload.pdfBase64);
  if(bytes.length<8||bytes.length>MAX_PDF_BYTES||Utilities.newBlob(bytes.slice(0,5)).getDataAsString()!=='%PDF-')throw new Error('El archivo debe ser un PDF válido.');
  var safeName=quote.client.name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,80)||'Cliente';
  var filename='Presupuesto_'+safeName+'_'+quote.id+'.pdf';
  var hash=digest_(JSON.stringify(quote));var pdfHash=digest_(bytes);
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))throw new Error('Hay otro presupuesto en proceso. Reintentá en unos segundos.');
  try{
    var folder=DriveApp.getFolderById(DRIVE_FOLDER_ID);privateDestination_(folder);
    var records=recordsFolder_(folder);var recordFile=readRecord_(records,quote.submissionId+'.json');
    var record=recordFile?JSON.parse(recordFile.getBlob().getDataAsString()):null;
    if(record&&(record.hash!==hash||record.pdfHash!==pdfHash))throw new Error('Este identificador pertenece a otro presupuesto.');
    if(!record){
      var properties=PropertiesService.getScriptProperties();var today=Utilities.formatDate(new Date(),'America/Asuncion','yyyy-MM-dd');
      var daily=JSON.parse(properties.getProperty('DAILY_UPLOADS')||'{}');
      if(daily.day===today&&daily.count>=(payload.testMode===true?10:50))throw new Error('Se alcanzó el límite diario de recepción. Intentá nuevamente mañana.');
      properties.setProperty('DAILY_UPLOADS',JSON.stringify({day:today,count:daily.day===today?daily.count+1:1}));
      record={quote:quote,hash:hash,pdfHash:pdfHash,filename:filename,fileId:null,notification:'pending'};
      recordFile=records.createFile(quote.submissionId+'.json',JSON.stringify(record),'application/json');
    }
    if(!record.fileId){
      var files=folder.getFilesByName(filename);var pdf=null;
      while(files.hasNext()){
        var candidate=files.next();
        if(digest_(candidate.getBlob().getBytes())===pdfHash){pdf=candidate;break;}
      }
      if(!pdf)pdf=folder.createFile(Utilities.newBlob(bytes,'application/pdf',filename));
      privateDestination_(pdf);record.fileId=pdf.getId();recordFile.setContent(JSON.stringify(record));
    }else{privateDestination_(DriveApp.getFileById(record.fileId));}
    var notification='pending';
    try{notification=notify_(record,recordFile);}catch(error){console.warn('Aviso pendiente: '+quote.id);}
    return {stored:true,notification:notification};
  }finally{lock.releaseLock();}
}
function doPost(e){
  var payload;
  try{
    if(!e||!e.parameter||typeof e.parameter.payload!=='string'||e.parameter.payload.length>2200000)throw new Error('Solicitud inválida.');
    payload=JSON.parse(e.parameter.payload);
  }catch(error){return HtmlService.createHtmlOutput('Solicitud inválida.');}
  if(ALLOWED_ORIGINS.indexOf(payload.parentOrigin)<0||!/^[0-9a-f-]{36}$/i.test(payload.requestId||'')||!/^NS-[A-Z0-9-]{8,40}$/.test(payload.quote&&payload.quote.id||''))return HtmlService.createHtmlOutput('Origen o solicitud no permitidos.');
  var result;
  try{result=processQuote_(payload);}catch(error){
    var known=/^(Completá|La verificación|La conexión|El modo|El código|El PDF|El archivo|La carpeta|Este identificador|Hay otro|Se alcanzó|Campo inválido|Correo inválido|Seleccioná|Fecha|Invitados|Horas|Cobertura|Pack|Selección|Tipo de evento)/;
    result={stored:false,error:known.test(error.message)?error.message:'No se pudo confirmar la copia en Drive. Conservá el PDF y reintentá.'};
  }
  // Return only a confirmation correlated to this request, never a private URL.
  var message=Object.assign({type:'nostop-drive-result',requestId:payload.requestId,quoteId:payload.quote.id},result);
  var serialized=JSON.stringify(message).replace(/</g,'\\u003c');
  var target=JSON.stringify(payload.parentOrigin).replace(/</g,'\\u003c');
  return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><script>window.top.postMessage('+serialized+','+target+');</script>').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function doGet(){return HtmlService.createHtmlOutput('Conexión de presupuestos NoStop. Enviá las solicitudes desde el formulario.');}
function reintentarAvisos(){
  var lock=LockService.getScriptLock();if(!lock.tryLock(1000))return;
  try{
    var files=recordsFolder_(DriveApp.getFolderById(DRIVE_FOLDER_ID)).getFiles();
    while(files.hasNext()&&MailApp.getRemainingDailyQuota()>0){
      var recordFile=files.next();
      try{var record=JSON.parse(recordFile.getBlob().getDataAsString());if(record.fileId&&record.notification!=='sent')notify_(record,recordFile);}catch(error){console.warn('Aviso pendiente; se conserva el registro.');}
    }
  }finally{lock.releaseLock();}
}
