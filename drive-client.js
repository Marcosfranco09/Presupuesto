(function(root){
  function isGoogleOrigin(origin){
    try{const url=new URL(origin);return url.protocol==='https:'&&(url.hostname==='script.google.com'||url.hostname==='script.googleusercontent.com'||url.hostname.endsWith('.script.googleusercontent.com')||url.hostname.endsWith('-script.googleusercontent.com'));}catch{return false;}
  }
  function isReply(event,requestId,quoteId){return isGoogleOrigin(event.origin)&&event.data?.type==='nostop-drive-result'&&event.data.requestId===requestId&&event.data.quoteId===quoteId;}
  function toBase64(bytes){let result='';for(let i=0;i<bytes.length;i+=16384)result+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(result);}
  function send({quote,bytes,filename,token,testMode=false,testToken='',url}){
    if(!/^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(url))return Promise.reject(new Error('La URL de Apps Script debe terminar en /exec.'));
    if(!bytes?.length)return Promise.reject(new Error('No se pudo preparar la copia del PDF para Drive.'));
    const requestId=crypto.randomUUID();
    return new Promise((resolve,reject)=>{
      const frame=document.createElement('iframe');frame.name='nostop-drive-'+requestId;frame.hidden=true;frame.setAttribute('aria-hidden','true');
      const form=document.createElement('form');form.method='POST';form.action=url;form.target=frame.name;form.hidden=true;
      const input=document.createElement('textarea');input.name='payload';input.value=JSON.stringify({requestId,parentOrigin:location.origin,quote,pdfBase64:toBase64(bytes),filename,token,testMode,testToken});form.append(input);
      function cleanup(){clearTimeout(timeout);removeEventListener('message',receive);form.remove();frame.remove();}
      function receive(event){
        if(!isReply(event,requestId,quote.id))return;
        cleanup();
        if(event.data.stored===true)resolve({stored:true,notification:event.data.notification});
        else reject(new Error(event.data.error||'No se pudo confirmar el guardado en Drive.'));
      }
      const timeout=setTimeout(()=>{cleanup();reject(new Error('No pudimos confirmar la copia en Drive. Conservá el PDF y reintentá; una espera agotada no confirma el guardado.'));},90000);
      addEventListener('message',receive);document.body.append(frame,form);form.submit();
    });
  }
  const api={send,isGoogleOrigin,isReply};if(typeof module!=='undefined')module.exports=api;else root.DriveClient=api;
})(globalThis);
