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
