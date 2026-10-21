const catalog = [
  {id:'web',name:'Diseño y desarrollo web',description:'Una web que habla de tu marca.',price:2500000},
  {id:'brand',name:'Identidad de marca',description:'Una identidad que deja huella.',price:1500000},
  {id:'social',name:'Contenido para redes',description:'Ideas que conectan con tu audiencia.',price:850000},
  {id:'strategy',name:'Estrategia digital',description:'Un plan para tu próximo paso.',price:1200000}
];
const $ = id => document.getElementById(id);
const money = value => 'Gs. ' + new Intl.NumberFormat('es-PY').format(value);
let quoteId = '';
catalog.forEach((service, index) => {
  const label = document.createElement('label');
  label.className = 'service';
  label.innerHTML = `<input type="checkbox" value="${service.id}" ${index===0?'checked':''}><span><strong>${service.name}</strong><small>${service.description}</small><span class="price">${money(service.price)}</span></span>`;
  $('services').append(label);
});
const selected = () => catalog.filter(service => document.querySelector(`input[value="${service.id}"]`).checked);
function renderRows(container, items) {
  container.replaceChildren();
  if (!items.length) {const p = document.createElement('p');p.className='sub';p.textContent='Elegí al menos un servicio para empezar.';container.append(p);}
  items.forEach(item => {const row=document.createElement('div');row.className='line-item';const name=document.createElement('span');name.textContent=item.name;const price=document.createElement('span');price.textContent=money(item.price);row.append(name,price);container.append(row);});
}
function update() {renderRows($('rows'),selected());$('total').textContent=money(selected().reduce((sum,item)=>sum+item.price,0));$('projectName').textContent=$('project').value.trim()||'Tu próximo gran proyecto';$('status').textContent='';}
$('quoteForm').addEventListener('input',update);
function openPreview() {
  if(!selected().length){$('status').textContent='Seleccioná al menos un servicio.';return false;}
  quoteId ||= 'DEMO-'+Date.now().toString(36).toUpperCase();
  $('docMeta').textContent=quoteId+' · '+new Date().toLocaleDateString('es-PY');
  $('docTitle').textContent=$('projectName').textContent;
  $('docClient').textContent=[$('name').value||'Cliente de ejemplo',$('company').value,$('email').value].filter(Boolean).join(' · ');
  renderRows($('documentRows'),selected());$('docTotal').textContent='Total estimado: '+$('total').textContent;$('docNotes').textContent=$('notes').value;
  $('document').showModal();return true;
}
$('preview').addEventListener('click',openPreview);
$('closePreview').addEventListener('click',()=>$('document').close());
$('print').addEventListener('click',()=>window.print());
$('quoteForm').addEventListener('submit',event=>{
  event.preventDefault();
  if(!openPreview())return;
  const quote={id:quoteId,date:new Date().toISOString(),name:$('name').value,email:$('email').value,company:$('company').value,project:$('project').value,notes:$('notes').value,services:selected(),total:selected().reduce((sum,item)=>sum+item.price,0)};
  try {localStorage.setItem('nostop-demo-last-quote',JSON.stringify(quote));$('status').textContent='Copia guardada en este navegador. No se envió a la nube.';} catch {$('status').textContent='El navegador no permitió guardar la copia local. Podés exportar el PDF igualmente.';}
  window.print();
});
update();

// Keep the hero's layout intact; a decorative copy travels behind the quote.
const astronautSlot = document.querySelector('.astronaut');
const astronautSource = astronautSlot.querySelector('img');
const summaryCard = document.querySelector('.summary');
const traveler = astronautSource.cloneNode();
traveler.className = 'astronaut-traveler';
traveler.setAttribute('aria-hidden', 'true');
document.body.append(traveler);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let origin;
let scrollFrame = 0;
function measureAstronaut() {
  const rect = astronautSource.getBoundingClientRect();
  origin = {x: rect.left + rect.width / 2, y: rect.top + scrollY + rect.height / 2, width: rect.width};
  positionAstronaut();
}
function positionAstronaut() {
  scrollFrame = 0;
  if (!origin) return;
  const card = summaryCard.getBoundingClientRect();
  const targetX = card.left + card.width / 2;
  const targetY = card.top + card.height / 2;
  // The astronaut descends slightly in the viewport until the card catches it.
  const floatingY = origin.y + scrollY * .12;
  const y = Math.min(floatingY, targetY);
  const distance = Math.max(1, targetY + scrollY - origin.y);
  const progress = Math.max(0, Math.min(1, scrollY * 1.12 / distance));
  const ease = progress * progress * (3 - 2 * progress);
  const destinationWidth = Math.min(420, card.width * .95);
  const width = origin.width + (destinationWidth - origin.width) * ease;
  const height = width * 638 / 800;
  const x = origin.x + (targetX - origin.x) * ease;
  const entry = Math.max(0, Math.min(1, (y + height * .42 - card.top) / Math.max(1, card.height / 2 + height * .42)));
  traveler.hidden = reducedMotion.matches;
  astronautSlot.classList.toggle('scroll-active', !reducedMotion.matches);
  traveler.style.width = `${width}px`;
  traveler.style.transform = `translate3d(${x - width / 2}px, ${y - height / 2}px, 0)`;
  traveler.style.filter = `blur(${entry * 3.5}px)`;
  traveler.style.opacity = String(1 - entry * .3);
}
function requestAstronautFrame() {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(positionAstronaut);
}
addEventListener('scroll', requestAstronautFrame, {passive:true});
addEventListener('resize', measureAstronaut);
reducedMotion.addEventListener('change', measureAstronaut);
new ResizeObserver(measureAstronaut).observe(summaryCard);
astronautSource.addEventListener('load', measureAstronaut);
measureAstronaut();
