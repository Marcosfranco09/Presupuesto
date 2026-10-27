(function (root) {
  const tiers = [
    {max:60,label:'Hasta 60 invitados',prices:[2000000,2500000,3000000],extra:500000},
    {max:100,label:'61–100 invitados',prices:[2450000,3050000,3650000],extra:600000},
    {max:200,label:'101–200 invitados',prices:[2950000,3700000,4400000],extra:700000},
    {max:400,label:'201–400 invitados',prices:[3550000,4450000,5350000],extra:900000},
    {max:Infinity,label:'Más de 400 invitados',prices:[4350000,5400000,6500000],extra:1100000}
  ];
  const extras = [
    {id:'vertical',name:'Video resumen vertical para redes',price:500000,requires:'video'},
    {id:'drive',name:'Selección, edición y publicación de fotos en Drive durante el evento',price:900000,requires:'photo'},
    {id:'urgent',name:'Entrega prioritaria de selección (24 h)',price:400000,requires:'photo',excluded:true},
    {id:'stories',name:'Cobertura de Stories durante el evento',price:400000},
    {id:'raw',name:'Grabación vertical sin edición',price:400000},
    {id:'interviews',name:'Notas y entrevistas con participantes',price:400000}
  ];
  const products = [
    {id:'prints',name:'Fotografías impresas',hint:'Según tamaño y cantidad'},
    {id:'enlargements',name:'Ampliaciones fotográficas',hint:'Según medida'},
    {id:'album',name:'Álbum fotográfico personalizado',hint:'Desde Gs. 500.000'},
    {id:'book',name:'Fotolibro premium',hint:'Desde Gs. 900.000'},
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
      lines.push({id,name:(id==='photo'?'Cobertura fotográfica':'Cobertura de video')+` · ${hours} h`,price:special||hours>4?null:tier.prices[hours-2],hint:special||hours>4?'Propuesta específica según cronograma':tier.label});
    }
    for(const extra of extras) if(input.extras.includes(extra.id)&&(!extra.requires||input[extra.requires]))lines.push({...extra});
    if(input.reels>0) {
      if(![1,2,3].includes(Number(input.reels)))return {error:'Seleccioná un pack de Reels válido.'};
      lines.push({id:'reels',name:input.reels+' Reel(s) editado(s)',price:[650000,900000,1300000][input.reels-1]});
    }
    for(const product of products)if(input.products.includes(product.id))lines.push({...product,price:null,excluded:true});
    const count=lines.filter(l=>!l.excluded).length;
    const rate=count>=3?.1:count===2?.05:0;
    const subtotal=lines.reduce((sum,l)=>sum+(l.price??0),0);
    const eligible=lines.filter(l=>!l.excluded).reduce((sum,l)=>sum+(l.price??0),0);
    const discount=Math.round(eligible*rate);
    const pending=special||lines.some(l=>l.price===null);
    return {lines,tier:tier.label,extraHour:tier.extra,subtotal,discount,rate,total:subtotal-discount,deposit:pending?null:Math.round((subtotal-discount)/2),pending,special,count};
  }
  const api={calculate,extras,products};
  if(typeof module!=='undefined')module.exports=api;else root.Tariff=api;
})(globalThis);
