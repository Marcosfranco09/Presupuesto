# Presupuestador NoStop

Formulario estático con tarifario 2026 v4, PDF A4 de una página y conexión a Google Drive mediante Apps Script. El sitio puede seguir en GitHub Pages. La integración anterior con Cloudflare queda disponible como alternativa.

## Estado actual

- PDF descargable directamente, con nombre del cliente e identificador: `Presupuesto_Maria_Gonzalez_NS-12345678.pdf`.
- Google Drive preparado con la carpeta `14jqeIfEswbnZCXhsIL0akEd5hPsXGPdt`. Falta autorizar y publicar el proyecto de Apps Script.
- Avisos con MailApp de Google, únicamente a **robfranco97@gmail.com**. No se ha enviado un correo real ni accedido a la cuenta de Google.
- Mientras `appsScriptUrl` y `recaptchaSiteKey` de `cloud-config.js` estén vacíos, el PDF funciona y la interfaz avisa que la nube no está conectada.
- Todos los servicios comienzan desmarcados. Desde la quinta hora se suma la tarifa adicional de cada rango. Bodas y XV años requieren propuesta específica.
- Álbum (desde Gs. 500.000) y fotolibro (desde Gs. 900.000) se incluyen con su precio inicial, sin descuento sobre esos productos. El resumen, PDF y aviso muestran «Precio final APROXIMADO». Impresiones, ampliaciones y traslados sin tarifa definida siguen a cotizar y se advierte que no están incluidos.

## Probar localmente

```sh
npm ci
npm start
```

Abrir `http://127.0.0.1:4173/`. Las pruebas usan almacenamiento y correo simulados:

```sh
npm test
```

## Activar Google Drive y correo

Seguir **[google-drive/CONEXION.md](google-drive/CONEXION.md)**. El archivo completo para pegar en Google Apps Script es **google-drive/Code.gs**. Incluye el ID de la carpeta indicada y el destinatario del aviso. Se genera con `npm run prepare:drive` desde el tarifario y validador actuales, más `google-drive/Backend.gs`.

Para las pruebas está seleccionado `testMode: true`: ejecutar `configurarPruebas` en Apps Script genera un código temporal de 48 horas, con límite de 10 nuevos presupuestos diarios. Se puede probar desde `http://localhost:4173/` sin reCAPTCHA ni GitHub Pages. El código se ingresa en el formulario y no se guarda en el repositorio.

El modo público usa reCAPTCHA v2 de Google (`testMode: false` y función `configurar`). Esta opción no necesita Cloudflare ni Resend. Mantener privada la carpeta. El acceso público de la implementación corresponde al receptor validado del formulario y no al contenido de Drive.

Las pruebas de Drive usan servicios simulados. La autorización de la cuenta, la publicación y la prueba real de guardado/correo siguen pendientes.

## Alternativa con Cloudflare y Resend

Necesita una cuenta de Cloudflare con R2, un remitente autorizado en Resend y una clave pública/privada de Turnstile para proteger el formulario público. Confirmar los costos y condiciones de los proveedores en sus paneles antes de activar servicios.

1. Iniciar sesión en Cloudflare con `npx wrangler login`.
2. Crear un bucket **privado**: `npx wrangler r2 bucket create nostop-presupuestos`. Mantener desactivados el acceso público y los dominios públicos del bucket.
3. Configurar un remitente permitido en Resend. Poner su dirección en `vars.MAIL_FROM` de `wrangler.jsonc`. El destinatario ya está configurado; el cliente nunca es destinatario.
4. Guardar secretos solo en el Worker con `npx wrangler secret put RESEND_API_KEY` y `npx wrangler secret put TURNSTILE_SECRET_KEY`. Nunca pegarlos en el código ni en `cloud-config.js`.
5. En Turnstile, permitir el hostname de la página (por ejemplo `marcosfranco09.github.io`) y, si se sirve desde el Worker, también su hostname.
6. Ejecutar `npm run deploy`. El despliegue requiere completar primero la configuración y el acceso a las cuentas. El repositorio por sí solo no activa estos servicios.
7. En `cloud-config.js`, cambiar `provider` a `'cloudflare'`, poner la URL desplegada terminada en `/api/quotes` y la **clave pública** de Turnstile. Subir ese archivo a GitHub Pages o desplegar de nuevo si se usa el sitio del Worker.
8. Revisar `ALLOWED_ORIGINS` en `wrangler.jsonc`: incluir los orígenes exactos, separados por comas, sin rutas ni barra final. Está preparado para `https://marcosfranco09.github.io`; corregir si la página real tiene otro dominio.
9. Guardar un presupuesto de prueba y confirmar: descarga del archivo, PDF en R2 y correo en la bandeja de `robfranco97@gmail.com`.

Los PDFs se consultan desde Cloudflare → R2 → `nostop-presupuestos` → `presupuestos/`. El correo indica la ruta privada del archivo. No se generan enlaces públicos con datos de clientes.

## Guardado y reintentos

Hay un único botón principal «Descargar PDF»: genera el archivo, inicia la descarga, guarda la copia en la nube y solicita el aviso al presupuestador. Si el navegador necesita un segundo toque, se pulsa el mismo botón; un presupuesto ya confirmado se vuelve a descargar sin enviar otro aviso. El resultado del guardado y correo se muestra junto al botón. El navegador controla la ubicación final del archivo; el sitio no puede comprobar que el usuario lo haya guardado físicamente.

La vista previa solo permite revisar el presupuesto. No descarga ni envía; se cierra con la equis, con Escape o al pulsar fuera del cuadro.

Cada envío tiene un identificador; repetir un envío idéntico conserva el mismo archivo. Cambiar los datos crea otro identificador. En Drive se guarda la copia PDF que descarga el cliente y un registro con importes recalculados desde el tarifario. En Cloudflare el Worker valida los datos, recalcula el tarifario y genera su propia copia del PDF.

Si el correo falla después de guardar el PDF, queda una notificación pendiente en el almacenamiento del proveedor. Una tarea programada la reintenta cada diez minutos. Los reintentos normales no duplican avisos; las limitaciones particulares de MailApp están documentadas en CONEXION.md. La confirmación de correo significa aceptación por el proveedor, no garantía de entrega a la bandeja.

No se guarda el formulario en `localStorage`. Una recarga pierde el envío pendiente del navegador; conservar el PDF descargado si falla la conexión.

## Fuentes técnicas

- [API de R2 para Workers](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)
- [Envío de correo con Resend](https://resend.com/docs/api-reference/emails/send-email)
- [PDF-LIB](https://pdf-lib.js.org/)
