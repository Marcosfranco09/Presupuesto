const $ = id => document.getElementById(id);
const money = value => 'Gs. '+new Intl.NumberFormat('es-PY').format(value);
const conditions='Tarifario 2026 v4. Precios sin IVA, sujetos a negociación, confirmación de fecha y disponibilidad. Reserva con 50% de seña; saldo hasta el día del evento. Las horas se cuentan desde la llegada del equipo. Si aumenta el rango final de invitados, se ajusta la tarifa. Bodas, XV años y coberturas de más de 4 horas requieren propuesta específica. Productos y traslados se confirman según especificaciones.';
let quoteId='';
function choices(container,items){for(const item of items){const label=document.createElement('label');label.className='service';const check=document.createElement('input');check.type='checkbox';check.value=item.id;const span=document.createElement('span');const strong=document.createElement('strong');strong.textContent=item.name;const small=document.createElement('small');small.textContent=item.hint||money(item.price);span.append(strong,small);label.append(check,span);container.append(label);}}
choices($('extras'),Tariff.extras);choices($('products'),Tariff.products);
function checked(id){return [...$(id).querySelectorAll('input:checked')].map(e=>e.value);}
function readInput(){return {type:$('eventType').value,guests:Number($('guests').value),photo:$('photo').checked,video:$('video').checked,photoHours:Number($('photoHours').value),videoHours:Number($('videoHours').value),extras:checked('extras'),products:checked('products'),reels:Number($('reels').value)};}
function renderRows(container,lines){container.replaceChildren();for(const line of lines){const row=document.createElement('div');row.className='line-item';const label=document.createElement('span');label.textContent=line.name+(line.hint?' — '+line.hint:'');const price=document.createElement('span');price.textContent=line.price===null?'A cotizar':money(line.price);row.append(label,price);container.append(row);}}
function breakdown(result){const lines=[...result.lines,{name:'Subtotal conocido, sin IVA',price:result.subtotal}];if(result.discount)lines.push({name:`Descuento por combinación (${result.rate*100}%)`,price:-result.discount});return lines;}
function update(){
  for(const id of ['photo','video'])$(''+id+'Hours').disabled=!$(id).checked;
  for(const extra of Tariff.extras){const check=$('extras').querySelector(`input[value="${extra.id}"]`);check.disabled=!!extra.requires&&!$(extra.requires).checked;if(check.disabled)check.checked=false;}
  const result=Tariff.calculate(readInput());
  $('status').textContent='';$('projectName').textContent=$('project').value.trim()||$('eventType').value;
  if(result.error){$('rows').replaceChildren();$('total').textContent='—';$('quoteState').textContent=result.error;$('deposit').textContent='';return;}
  renderRows($('rows'),breakdown(result));
  $('totalLabel').textContent=result.pending?'Importe parcial conocido, sin IVA':'Total estimado, sin IVA';
  $('total').textContent=result.lines.length?money(result.total):'—';
  $('quoteState').textContent=result.pending?'Requiere cotización personalizada. Los conceptos a cotizar no están incluidos en el importe parcial.':result.lines.length?'Presupuesto calculado, sujeto a confirmación.':'Elegí al menos un servicio.';
  $('deposit').textContent=result.pending?'Seña pendiente del presupuesto completo.':result.lines.length?'Seña estimada (50%, sin IVA): '+money(result.deposit):'';
  $('extraRate').textContent='Hora excedida de cobertura: '+money(result.extraHour)+' por servicio. Las fracciones de hora requieren confirmación.';
}
$('quoteForm').addEventListener('input',update);$('quoteForm').addEventListener('change',update);
function openPreview(){
  if(!$('quoteForm').reportValidity())return false;
  const result=Tariff.calculate(readInput());
  if(result.error||!result.lines.length){$('status').textContent=result.error||'Elegí al menos un servicio.';return false;}
  quoteId||='NS-'+crypto.randomUUID().slice(0,8).toUpperCase();
  $('docMeta').textContent=quoteId+' · '+new Date().toLocaleDateString('es-PY');$('docTitle').textContent=$('projectName').textContent;
  $('docClient').textContent=[$('name').value,$('email').value,$('company').value].filter(Boolean).join(' · ');
  $('docEvent').textContent=`${$('eventType').value} · ${$('eventDate').value} · ${$('location').value} · ${$('guests').value} invitados`;
  renderRows($('documentRows'),breakdown(result));
  $('docTotal').textContent=$('totalLabel').textContent+': '+money(result.total);
  $('docNotes').textContent=[$('quoteState').textContent,$('deposit').textContent,$('extraRate').textContent,$('notes').value].filter(Boolean).join('\n\n');
  $('document').showModal();return result;
}
$('preview').addEventListener('click',openPreview);$('closePreview').addEventListener('click',()=>$('document').close());$('print').addEventListener('click',()=>window.print());
$('quoteForm').addEventListener('submit',event=>{event.preventDefault();const result=openPreview();if(!result)return;const quote={id:quoteId,createdAt:new Date().toISOString(),tariffVersion:'2026-v4',client:{name:$('name').value,email:$('email').value,company:$('company').value},event:{...readInput(),date:$('eventDate').value,location:$('location').value,name:$('project').value,notes:$('notes').value},result,conditions};try{localStorage.setItem('nostop-last-quote',JSON.stringify(quote));$('status').textContent='Guardado en este navegador. No se envió a la nube.';}catch{$('status').textContent='No se pudo guardar en el navegador. Podés guardar el PDF.';}window.print();});
$('docConditions').textContent=conditions;
update();
