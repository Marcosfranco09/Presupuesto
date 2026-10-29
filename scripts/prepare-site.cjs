const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = ['index.html','app.js','pricing.js','tariff-ui.js','quote-pdf.js','drive-client.js','cloud-client.js','cloud-config.js','assets/logo.png','assets/astronauta.png','assets/vendor/pdf-lib.min.js','assets/vendor/pdf-lib-LICENSE.md'];
for (const file of files) {
  const destination = path.join(root, 'dist', file);
  fs.mkdirSync(path.dirname(destination), {recursive:true});
  fs.copyFileSync(path.join(root,file),destination);
}
console.log('Static site prepared in dist/.');
