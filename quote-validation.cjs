const Pricing=require('./pricing.js');
function validate(payload){
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
module.exports={validate};
