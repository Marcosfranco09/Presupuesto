const $ = id => document.getElementById(id);
const money = value => 'Gs. '+new Intl.NumberFormat('es-PY').format(value);
const conditions='Tarifario 2026 v4. Precios sin IVA, sujetos a negociación, confirmación de fecha y disponibilidad. Reserva con 50% de seña; saldo hasta el día del evento. Las horas se cuentan desde la llegada del equipo. Si aumenta el rango final de invitados, se ajusta la tarifa. Desde la quinta hora se suma la tarifa por hora adicional del rango, para cada cobertura. Bodas y XV años requieren propuesta específica. Productos y traslados se confirman según especificaciones.';
let quoteId='';
function choices(container,items){for(const item of items){const label=document.createElement('label');label.className='service';const check=document.createElement('input');check.type='checkbox';check.value=item.id;const span=document.createElement('span');const strong=document.createElement('strong');strong.textContent=item.name;const small=document.createElement('small');small.textContent=item.hint||money(item.price);span.append(strong,small);label.append(check,span);container.append(label);}}
choices($('extras'),Tariff.extras);choices($('products'),Tariff.products);
function checked(id){return [...$(id).querySelectorAll('input:checked')].map(e=>e.value);}
function readInput(){return {type:$('eventType').value,guests:Number($('guests').value),photo:$('photo').checked,video:$('video').checked,photoHours:Number($('photoHours').value),videoHours:Number($('videoHours').value),extras:checked('extras'),products:checked('products'),reels:Number(checked('reels')[0]||0)};}
function renderRows(container,lines){container.replaceChildren();for(const line of lines){const row=document.createElement('div');row.className='line-item';const label=document.createElement('span');label.textContent=line.name+(line.hint?' — '+line.hint:'');const price=document.createElement('span');price.textContent=line.price===null?'A cotizar':money(line.price);row.append(label,price);container.append(row);}}
function breakdown(result){const lines=[...result.lines,{name:'Subtotal, sin IVA',price:result.subtotal}];if(result.discount)lines.push({name:`Descuento por combinación (${result.rate*100}%)`,price:-result.discount});return lines;}
function update(){
  for(const id of ['photo','video']){
    const slider=$(id+'Hours');
    slider.disabled=!$(id).checked;
    $(id+'HoursValue').textContent=slider.value+' h';
    slider.setAttribute('aria-valuetext',slider.value+' horas');
  }
  for(const extra of Tariff.extras){const check=$('extras').querySelector(`input[value="${extra.id}"]`);check.disabled=!!extra.requires&&!$(extra.requires).checked;if(check.disabled)check.checked=false;}
  const result=Tariff.calculate(readInput());
  $('status').textContent='';$('projectName').textContent=$('project').value.trim()||$('eventType').value;
  if(result.error){$('rows').replaceChildren();$('total').textContent='—';$('quoteState').textContent=result.error;$('deposit').textContent='';return;}
  renderRows($('rows'),result.lines.length ? breakdown(result) : []);
  $('totalLabel').textContent=Tariff.totalLabel(result);
  $('total').textContent=result.lines.length?money(result.total):'—';
  const approximation=result.approximate?'Se incluyen los precios iniciales de los productos “desde”. El precio final puede variar según las especificaciones. ':'';
  $('quoteState').textContent=approximation+(result.pending?'Los conceptos sin precio definido siguen a cotizar y no están incluidos en el importe mostrado.':result.lines.length?'Presupuesto calculado, sujeto a confirmación.':'Elegí al menos un servicio.');
  $('deposit').textContent=result.pending?'Seña pendiente del presupuesto completo.':result.lines.length?'Seña estimada (50%, sin IVA): '+money(result.deposit):'';
  $('extraRate').textContent='Desde la quinta hora: '+money(result.extraHour)+' por hora adicional, para cada cobertura. Las fracciones de hora requieren confirmación.';
}
$('reels').addEventListener('input',event=>{
  if(event.target.matches('input:checked')){
    $('reels').querySelectorAll('input').forEach(input=>{if(input!==event.target)input.checked=false;});
  }
});
$('quoteForm').addEventListener('input',update);$('quoteForm').addEventListener('change',update);
function validResult(){
  const phone=$('whatsapp').value.trim(),digits=phone.replace(/\D/g,'');
  $('whatsapp').setCustomValidity(phone&&(!/^\+?[\d\s().-]+$/.test(phone)||digits.length<7||digits.length>15)?'Ingresá un WhatsApp válido, con código de país y entre 7 y 15 dígitos.':'');
  if(!$('quoteForm').reportValidity())return false;
  const result=Tariff.calculate(readInput());
  if(result.error||!result.lines.length){$('status').textContent=result.error||'Elegí al menos un servicio.';return false;}
  return result;
}
function openPreview(){
  const result=validResult();if(!result)return false;
  quoteId||='NS-'+crypto.randomUUID().slice(0,8).toUpperCase();
  $('docMeta').textContent=quoteId+' · '+new Date().toLocaleDateString('es-PY');$('docTitle').textContent=$('projectName').textContent;
  $('docClient').textContent=[$('name').value,$('email').value,$('company').value].filter(Boolean).join(' · ');
  $('docWhatsapp').textContent=$('whatsapp').value.trim()?'WhatsApp: '+$('whatsapp').value.trim():'';
  $('docEvent').textContent=`${$('eventType').value} · ${$('eventDate').value} · ${$('location').value} · ${$('guests').value} invitados`;
  renderRows($('documentRows'),breakdown(result));
  $('docTotal').textContent=$('totalLabel').textContent+': '+money(result.total);
  $('docNotes').textContent=[$('quoteState').textContent,$('deposit').textContent,$('extraRate').textContent,$('notes').value.replace(/\s+/g,' ').trim()].filter(Boolean).join('\n\n');
  if(!$('document').open)$('document').showModal();fitQuoteToPage();return result;
}
// Measure the same print layout used by the browser, at the usable A4 width.
// Compact spacing first, then type. Scaling is a final safeguard, never clipping.
function fitQuoteToPage(){
  const sheet=document.querySelector('#document .quote-sheet');
  if(!sheet)return;
  const measure=sheet.cloneNode(true);
  measure.classList.add('print-layout','print-measure');
  measure.style.setProperty('display','block','important');
  measure.style.setProperty('--print-scale','1');
  document.body.append(measure);
  const maxHeight=271*96/25.4; // A4 minus 12 mm margins and 2 mm rounding reserve.
  let density=0;
  for(;density<3;density++){
    measure.dataset.density=String(density);
    if(measure.getBoundingClientRect().height<=maxHeight)break;
  }
  measure.dataset.density=String(density);
  const height=measure.getBoundingClientRect().height;
  sheet.dataset.density=String(density);
  sheet.style.setProperty('--print-scale',String(Math.min(1,maxHeight/Math.max(1,height))));
  measure.remove();
}
addEventListener('beforeprint',fitQuoteToPage);
$('preview').addEventListener('click',openPreview);
$('closePreview').addEventListener('click',()=>$('document').close());
const previewDialog=$('document');
function outsidePreview(event){const rect=previewDialog.getBoundingClientRect();return event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom;}
let backdropPress=false;
previewDialog.addEventListener('pointerdown',event=>{backdropPress=event.target===previewDialog&&outsidePreview(event);});
previewDialog.addEventListener('click',event=>{if(backdropPress&&event.target===previewDialog&&outsidePreview(event))previewDialog.close();backdropPress=false;});
previewDialog.addEventListener('close',()=>{backdropPress=false;});
let snapshot,fingerprint='',downloadUrl,pdfBytes,cloudConfirmation;
let saving=false;
function setSaveStatus(message,state='info'){$('status').textContent=message;$('status').dataset.state=state;}
function downloadPdf(quote){
  // This transient anchor is never shown as an additional download control.
  const link=document.createElement('a');link.href=downloadUrl;link.download=QuotePdf.filename(quote);link.hidden=true;
  document.body.append(link);link.click();link.remove();
}
async function saveQuote(event){
  event.preventDefault();if(saving)return;
  const result=validResult();if(!result)return;
  quoteId||='NS-'+crypto.randomUUID().slice(0,8).toUpperCase();
  const data={client:{name:$('name').value.trim(),email:$('email').value.trim(),whatsapp:$('whatsapp').value.trim(),company:$('company').value.trim()},event:{...readInput(),date:$('eventDate').value,location:$('location').value.trim(),name:$('project').value.trim(),notes:$('notes').value.trim()},result};
  const current=JSON.stringify(data);
  if(!snapshot||current!==fingerprint){
    if(snapshot)quoteId='NS-'+crypto.randomUUID().slice(0,8).toUpperCase();
    snapshot={...data,submissionId:crypto.randomUUID(),id:quoteId,createdAt:new Date().toISOString(),tariffVersion:'2026-v4'};
    fingerprint=current;
    pdfBytes=null;cloudConfirmation=null;
  }
  const quote=snapshot;
  const connected=QuoteCloud.configured();
  if(connected&&!cloudConfirmation){
    try{QuoteCloud.requireReady();}catch(error){setSaveStatus(error.message,'error');if(error.fieldId)$(error.fieldId)?.focus();return;}
  }
  const button=$('downloadPdf');
  saving=true;button.disabled=true;$('preview').disabled=true;$('quoteForm').setAttribute('aria-busy','true');
  button.textContent='Preparando PDF…';
  setSaveStatus('Preparando tu PDF…');
  let downloaded=false;
  try{
    if(!pdfBytes){
      const logoResponse=await fetch('assets/logo.png');if(!logoResponse.ok)throw new Error('No se pudo cargar el logo. Volvé a intentar.');
      pdfBytes=await QuotePdf.create(quote,result,await logoResponse.arrayBuffer());
      if(downloadUrl)URL.revokeObjectURL(downloadUrl);
      downloadUrl=URL.createObjectURL(new Blob([pdfBytes],{type:'application/pdf'}));
    }
    downloadPdf(quote);downloaded=true;
    if(!connected){
      setSaveStatus('Descarga iniciada. Drive y los avisos por correo todavía no están conectados. Si no se descargó el PDF, pulsá nuevamente el mismo botón.');
      return;
    }
    button.textContent='Enviando copia…';setSaveStatus('Descarga iniciada. Guardando la copia y enviando el aviso…');
    cloudConfirmation||=await QuoteCloud.send(quote,{bytes:pdfBytes,filename:QuotePdf.filename(quote)});
    setSaveStatus(cloudConfirmation.notification==='sent'?'Descarga iniciada. Copia guardada en la nube y aviso enviado al presupuestador.':'Descarga iniciada. Copia guardada en la nube; el aviso por correo está pendiente y se reintentará automáticamente.','success');
  }catch(error){setSaveStatus((downloaded?'Descarga iniciada, pero no se pudo confirmar el envío. ':'No se pudo preparar el PDF. ')+(error.name==='AbortError'?'Se agotó el tiempo de espera.':error.message)+' Pulsá nuevamente Descargar PDF para reintentar.','error');}
  finally{saving=false;button.disabled=false;button.textContent='Descargar PDF';$('preview').disabled=false;$('quoteForm').removeAttribute('aria-busy');}
}
$('quoteForm').addEventListener('submit',saveQuote);
$('docConditions').textContent=conditions;
update();
