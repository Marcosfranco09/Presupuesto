(function(){
  const config=window.QUOTE_CLOUD||{};
  const drive=config.provider==='drive';
  const testing=drive&&config.testMode===true;
  let widgetId,token='';
  const configured=()=>drive?!!(config.appsScriptUrl&&(testing||config.recaptchaSiteKey)):!!(config.apiUrl&&config.turnstileSiteKey);
  function reset(){token='';const service=drive?window.grecaptcha:window.turnstile;if(widgetId!==undefined&&service)service.reset(widgetId);}
  async function send(quote,{bytes,filename}={}){
    if(!configured())throw new Error('La nube todavía no está conectada. Tu PDF puede descargarse igualmente.');
    const testToken=testing?document.getElementById('driveTestCode')?.value.trim():'';
    if(testing&&!testToken)throw new Error('Cerrá la vista previa e ingresá el código de prueba que aparece al ejecutar configurarPruebas en Google Apps Script.');
    if(!testing&&!token)throw new Error('Cerrá la vista previa, completá la verificación y volvé a pulsar Descargar PDF para enviar la copia.');
    if(drive){try{return await DriveClient.send({quote,bytes,filename,token,testMode:testing,testToken,url:config.appsScriptUrl});}finally{reset();}}
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),30000);
    try{
      const response=await fetch(config.apiUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({quote,token}),signal:controller.signal});
      const result=await response.json();
      if(!response.ok||!result.stored)throw new Error(result.error||'No se pudo confirmar el guardado en la nube.');
      return result;
    }finally{clearTimeout(timeout);reset();}
  }
  if(configured()&&testing){
    const label=document.createElement('label');label.className='field';label.textContent='Código de prueba de Drive';
    const input=document.createElement('input');input.type='password';input.id='driveTestCode';input.autocomplete='off';input.maxLength=100;input.placeholder='Código generado en Apps Script';label.append(input);document.getElementById('cloudChallenge').append(label);
    document.getElementById('cloudHelp').textContent='Prueba sin reCAPTCHA. El código vence a las 48 horas y no se guarda en el navegador.';
  }else if(configured()){
    const script=document.createElement('script');script.async=true;
    function mount(service,sitekey){widgetId=service.render('cloudChallenge',{sitekey,callback:value=>{token=value;},'expired-callback':()=>{token='';},'error-callback':()=>{token='';},...(drive?{}:{action:'quote'})});}
    if(drive){window.nostopRecaptchaReady=()=>mount(window.grecaptcha,config.recaptchaSiteKey);script.src='https://www.google.com/recaptcha/api.js?onload=nostopRecaptchaReady&render=explicit&hl=es';}
    else{script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.onload=()=>mount(window.turnstile,config.turnstileSiteKey);}
    script.onerror=()=>{document.getElementById('cloudHelp').textContent='No se pudo cargar la verificación para la nube. Podés descargar el PDF y reintentar luego.';};
    document.head.append(script);
  }
  window.QuoteCloud={configured,send};
})();
