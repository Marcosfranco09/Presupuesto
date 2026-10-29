const assert=require('node:assert/strict');
const {calculate,totalLabel}=require('./pricing.js');
const base={type:'Evento corporativo',guests:150,photo:true,video:true,photoHours:3,videoHours:3,extras:[],products:[],reels:0};
assert.equal(calculate(base).total,7030000);
assert.equal(calculate({...base,reels:2}).total,7470000);
for(const [guests,price] of [[1,2000000],[30,2000000],[60,2000000],[61,2450000],[100,2450000],[101,2950000],[200,2950000],[201,3550000],[400,3550000],[401,4350000]])assert.equal(calculate({...base,guests,video:false,photoHours:2}).total,price);
const urgent=calculate({...base,extras:['urgent']});assert.equal(urgent.total,7430000);assert.equal(urgent.rate,.05);
assert.equal(calculate({...base,type:'Boda'}).deposit,null);
assert.equal(calculate({...base,photoHours:5}).pending,false);
// Each tier uses its exact 4-hour price plus its own extra-hour rate.
for(const [guests,fourHours,extra] of [[60,3000000,500000],[100,3650000,600000],[200,4400000,700000],[400,5350000,900000],[401,6500000,1100000]]){
  for(const hours of [4,5,6,24]){
    const photo=calculate({...base,guests,video:false,photoHours:hours});
    const video=calculate({...base,guests,photo:false,videoHours:hours});
    assert.equal(photo.total,fourHours+(hours-4)*extra);
    assert.equal(video.total,photo.total);
    assert.equal(photo.pending,false);
    assert.equal(photo.deposit,photo.total/2);
  }
}
assert.equal(calculate({...base,guests:60,photoHours:5,videoHours:6}).total,7125000);
assert.equal(calculate({...base,type:'Boda',photoHours:5}).lines[0].price,null);
assert.ok(calculate({...base,photoHours:25}).error);
const album=calculate({...base,products:['album']});
assert.equal(album.total,7530000);
assert.equal(album.deposit,3765000);
assert.equal(album.discount,370000);
assert.equal(album.pending,false);
assert.equal(album.approximate,true);
assert.equal(totalLabel(album),'Precio final APROXIMADO, sin IVA');
assert.equal(calculate({...base,products:['book']}).total,7930000);
assert.equal(calculate({...base,products:['album','book']}).total,8430000);
assert.equal(calculate({...base,products:['album','prints']}).deposit,null);
assert.equal(calculate({...base,products:['album','prints']}).total,7530000);
assert.equal(calculate({...base,products:['prints']}).approximate,false);
assert.equal(calculate({...base,products:['prints']}).lines.at(-1).price,null);
assert.equal(calculate({...base,video:false,extras:['vertical']}).lines.length,1);
assert.ok(calculate({...base,guests:0}).error);
assert.ok(calculate({...base,photoHours:2.5}).error);
console.log('Pricing: examples, tier boundaries, exclusions, dependencies and custom quotes passed.');
