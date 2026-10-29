(function(root){
  const lib=typeof module!=='undefined'?require('pdf-lib'):root.PDFLib;
  const pricing=typeof module!=='undefined'?require('./pricing.js'):root.Tariff;
  const conditions='Precios sin IVA, sujetos a negociación, fecha y disponibilidad. Reserva con 50% de seña; saldo hasta el día del evento. Las horas se cuentan desde la llegada del equipo. Si aumenta el rango final de invitados, se ajusta la tarifa. Desde la quinta hora se suma la tarifa adicional del rango para cada cobertura. Bodas y XV años requieren propuesta específica. Productos y traslados se confirman según especificaciones.';
  const discountRule='Cada cobertura, adicional y pack de Reels cuenta como un servicio. Productos, traslados y entrega urgente quedan excluidos del conteo y del descuento. Regla de conteo pendiente de confirmación.';
  const money=value=>'Gs. '+new Intl.NumberFormat('es-PY').format(value);
  function filename(quote){
    const name=quote.client.name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,80)||'Cliente';
    return `Presupuesto_${name}_${quote.id}.pdf`;
  }
  async function create(quote,result,logoBytes){
    const {PDFDocument,StandardFonts,rgb}=lib;
    const pdf=await PDFDocument.create();
    pdf.setTitle('Presupuesto '+quote.client.name);pdf.setAuthor('NoStop');
    pdf.setCreationDate(new Date(quote.createdAt));pdf.setModificationDate(new Date(quote.createdAt));
    const regular=await pdf.embedFont(StandardFonts.Helvetica);
    const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
    function safe(value){return [...String(value??'')].map(char=>{try{regular.encodeText(char);return char;}catch{return '?';}}).join('');}
    function wrap(value,size,width,font=regular){
      const words=safe(value).replace(/\s+/g,' ').trim().split(' ');const lines=[];let line='';
      for(const word of words){
        if(font.widthOfTextAtSize((line?line+' ':'')+word,size)<=width){line+=(line?' ':'')+word;continue;}
        if(line){lines.push(line);line='';}
        for(const char of word){if(font.widthOfTextAtSize(line+char,size)>width){lines.push(line);line='';}line+=char;}
      }
      if(line)lines.push(line);return lines;
    }
    const page=pdf.addPage([595.28,841.89]);const margin=42,width=511.28;
    const ink=rgb(.141,.243,.282),muted=rgb(.39,.46,.49),lineColor=rgb(.86,.9,.91);
    if(logoBytes){const logo=await pdf.embedPng(logoBytes);page.drawImage(logo,{x:margin-7,y:841.89-126,width:160,height:160*logo.height/logo.width});}
    else page.drawText('NO STOP',{x:margin,y:780,size:18,font:bold,color:ink});
    page.drawText(safe(quote.id+' · '+new Date(quote.createdAt).toLocaleDateString('es-PY',{timeZone:'America/Asuncion'})),{x:350,y:780,size:8,font:regular,color:muted});
    const rows=[...result.lines,{name:'Subtotal, sin IVA',price:result.subtotal}];
    if(result.discount)rows.push({name:`Descuento por combinación (${result.rate*100}%)`,price:-result.discount});
    function plan(size,gap){
      const ops=[];let y=0;
      function paragraph(value,font=regular,fontSize=size,color=muted,after=gap){
        for(const text of wrap(value,fontSize,width,font)){ops.push({kind:'text',text,x:0,y,font,size:fontSize,color});y+=fontSize*1.35;}y+=after;
      }
      paragraph('PROPUESTA INICIAL · TARIFARIO 2026',regular,8);
      paragraph(quote.event.name||quote.event.type,bold,size*2,ink,gap+3);
      paragraph([quote.client.name,quote.client.email,quote.client.company].filter(Boolean).join(' · '));
      paragraph(`${quote.event.type} · ${quote.event.date} · ${quote.event.location} · ${quote.event.guests} invitados`);
      y+=gap;ops.push({kind:'rule',y});y+=gap+size;
      for(const row of rows){
        const lines=wrap(row.name+(row.hint?' — '+row.hint:''),size,width-112);
        lines.forEach((text,i)=>ops.push({kind:'text',text,x:0,y:y+i*size*1.35,font:regular,size,color:ink}));
        const amount=row.price===null?'A cotizar':money(row.price);
        ops.push({kind:'text',text:amount,x:width-bold.widthOfTextAtSize(amount,size),y,font:bold,size,color:ink});
        y+=Math.max(1,lines.length)*size*1.35+gap;
      }
      ops.push({kind:'rule',y});y+=gap+size;
      paragraph(pricing.totalLabel(result)+': '+money(result.total),bold,size*1.4,ink,gap+3);
      if(result.approximate)paragraph('Se incluyen los precios iniciales de los productos “desde”. El precio final puede variar según las especificaciones.');
      paragraph(result.pending?'Los conceptos sin precio definido siguen a cotizar y no se incluyen en el importe mostrado. Seña pendiente del presupuesto completo.':'Seña estimada (50%, sin IVA): '+money(result.deposit),bold,size,ink);
      if(quote.event.notes)paragraph('Notas: '+quote.event.notes);
      paragraph(conditions,regular,size*.87);
      paragraph(discountRule,regular,size*.87);
      return {ops,height:y};
    }
    let layout;
    for(const [size,gap]of [[10,8],[9.5,6],[9,4],[8.5,3]]){layout=plan(size,gap);if(layout.height<=670)break;}
    const scale=Math.min(1,670/layout.height);const top=739;
    for(const op of layout.ops){
      if(op.kind==='rule')page.drawLine({start:{x:margin,y:top-op.y*scale},end:{x:margin+width*scale,y:top-op.y*scale},thickness:.5,color:lineColor});
      else page.drawText(op.text,{x:margin+op.x*scale,y:top-op.y*scale-op.size*scale,size:op.size*scale,font:op.font,color:op.color});
    }
    page.drawText('NoStop · Presupuesto inicial sujeto a confirmación',{x:margin,y:28,size:7,font:regular,color:muted});
    return pdf.save();
  }
  const api={create,filename,conditions};
  if(typeof module!=='undefined')module.exports=api;else root.QuotePdf=api;
})(globalThis);
