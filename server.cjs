const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const routes={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/pricing.js':'pricing.js','/tariff-ui.js':'tariff-ui.js','/assets/logo.png':'assets/logo.png','/assets/astronauta.png':'assets/astronauta.png'};
http.createServer((req,res)=>{const file=routes[new URL(req.url,'http://localhost').pathname];if(!file){res.writeHead(404);res.end('Not found');return;}res.setHeader('Content-Type',file.endsWith('.png')?'image/png':file.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8');fs.createReadStream(path.join(__dirname,file)).pipe(res);}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
