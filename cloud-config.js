// Public configuration only. Never put a secret key in this file.
window.QUOTE_CLOUD = {
  provider: 'drive',
  testMode: true, // Temporary test code instead of reCAPTCHA; expires in Apps Script.
  // Public URL from Apps Script deployment, ending in /exec.
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbxSZ9vsps83tb76yxGTx3ZeF_104Xd9It3ym08j1sCDriRaBTDDA-tEjWdv9nQgTxQ/exec',
  recaptchaSiteKey: '', // Public reCAPTCHA v2 Checkbox key. Never put its secret here.
  // Optional previous provider: 'cloudflare'.
  apiUrl: '', // Example: https://presupuesto-nostop.YOUR-SUBDOMAIN.workers.dev/api/quotes
  turnstileSiteKey: '' // Public site key. The secret stays in the Worker.
};
