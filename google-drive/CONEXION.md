# Conectar Drive y correo de Google

El destino ya está configurado en el script:

- Carpeta: `14jqeIfEswbnZCXhsIL0akEd5hPsXGPdt`.
- Avisos únicamente a `robfranco97@gmail.com`.

No se ha accedido a tu cuenta ni se ha confirmado el acceso a la carpeta. Estos pasos requieren que autorices el proyecto en Google. La carpeta debe mantenerse privada y la cuenta que ejecuta el script debe tener permiso para crear archivos dentro de ella.

## Pruebas locales sin reCAPTCHA

Esta es la opción temporal seleccionada en `cloud-config.js` con `testMode: true`. No necesita GitHub Pages ni registrar claves de reCAPTCHA.

1. En Google Apps Script, crear o abrir `Presupuestos NoStop`. Reemplazar todo `Código.gs` por el contenido actualizado de **Code.gs** junto a esta guía y guardar.
2. Seleccionar **configurarPruebas** y pulsar Ejecutar. Revisar y autorizar los permisos del proyecto. No ejecutar `configurar`, porque esa función corresponde al modo público con reCAPTCHA.
3. En el registro de ejecución aparece un **código de prueba**. Conservarlo para ingresarlo en el formulario local; no subirlo a GitHub ni colocarlo en cloud-config.js. El código vence a las 48 horas. Ejecutar de nuevo configurarPruebas genera uno nuevo y revoca el anterior.
4. Implementar como **Aplicación web**, ejecutar como **Yo** y acceso **Cualquier usuario**. Si ya existía una implementación, actualizarla con una versión nueva. Mantener privada la carpeta de Drive.
5. Copiar la URL terminada en **/exec** y ponerla en `appsScriptUrl` de cloud-config.js. Esa URL puede compartirse con el asistente para completar el archivo. Dejar `recaptchaSiteKey` vacío y `testMode: true`.
6. Ejecutar `npm start` en el proyecto y abrir `http://localhost:4173/`. Completar los datos y pegar el código del paso 3 en el campo **Código de prueba de Drive**, antes de pulsar Descargar PDF.
7. Comprobar que la página confirme la copia, que el archivo aparezca en Drive y que llegue el aviso a robfranco97@gmail.com.

El límite del modo de prueba es de 10 nuevos presupuestos por día, además de las cuotas de Google. Los reintentos del mismo envío no consumen otro cupo. Solo la URL /exec es pública; el código de prueba no se guarda en el navegador ni se comparte en el repositorio.

Para pasar al modo público, seguir las secciones siguientes, ejecutar **configurar** para revocar el código temporal y cambiar `testMode` a `false` en cloud-config.js. La configuración con reCAPTCHA requiere su clave pública y secreta.

## 1 Crear el proyecto

Abrí https://script.google.com/ con la cuenta que tiene acceso a la carpeta. Creá un proyecto llamado `Presupuestos NoStop`. Reemplazá todo el contenido del archivo `Código.gs` por el contenido completo de **Code.gs** que está junto a esta guía. Guardá el proyecto.

El archivo Code.gs ya incluye el tarifario, validación, ID de carpeta, envío de correo y reintentos. No hay que pegar Backend.gs por separado.

## 2 Proteger el formulario

Registrá una clave **reCAPTCHA v2 → Casilla “No soy un robot”** en https://www.google.com/recaptcha/admin/create con los dominios donde se abre la página. Para GitHub Pages, usá `marcosfranco09.github.io` sin protocolo ni ruta. Para pruebas locales se puede agregar `localhost`; abrí entonces el sitio con `http://localhost:4173`.

Se obtienen una clave del sitio (pública) y una clave secreta. En Apps Script → Configuración del proyecto → Propiedades de secuencia de comandos, agregá:

```text
RECAPTCHA_SECRET = tu clave secreta
```

La clave secreta nunca va en GitHub ni en cloud-config.js. La cuenta y condiciones de reCAPTCHA se administran en Google; verificá lo que muestra el panel al registrar la clave.

## 3 Autorizar y preparar

En el editor, seleccioná la función **configurar** y pulsá **Ejecutar**. Revisá y autorizá los permisos de tu propio proyecto: Drive, envío de correo, verificación del formulario y tarea de reintentos.

Esto comprueba la carpeta, crea una subcarpeta privada de registros e instala un reintento de correos cada diez minutos. No manda un correo de prueba. No cambies el acceso de la carpeta a público.

## 4 Publicar el receptor

En Apps Script → Implementar → Nueva implementación:

1. Tipo: **Aplicación web**.
2. Ejecutar como: **Yo**, la cuenta que tiene acceso a la carpeta.
3. Quién tiene acceso: **Cualquier usuario**, incluidos visitantes sin sesión. Esta opción publica el receptor del formulario, no los archivos de Drive. El script exige verificación y valida los envíos.
4. Implementar y copiar la URL terminada en **/exec**. No usar la URL de pruebas terminada en /dev.

Algunas cuentas administradas restringen aplicaciones web anónimas. Si la opción no aparece, revisá la política de la cuenta; no hagas pública la carpeta como solución.

## 5 Conectar la web

En `cloud-config.js` completá únicamente los campos públicos:

```js
window.QUOTE_CLOUD = {
  provider: 'drive',
  testMode: false,
  appsScriptUrl: 'https://script.google.com/macros/s/TU_IMPLEMENTACION/exec',
  recaptchaSiteKey: 'TU_CLAVE_PUBLICA'
};
```

Pasale al asistente la URL /exec y la clave pública si querés que actualice la configuración. No compartas la clave secreta. Después hay que subir los archivos actualizados a GitHub Pages, incluido drive-client.js.

`ALLOWED_ORIGINS` de Code.gs incluye `https://marcosfranco09.github.io`, `http://127.0.0.1:4173` y `http://localhost:4173`. Si usás otro dominio, agregarlo con protocolo y puerto si corresponde, sin ruta ni barra final.

## 6 Comprobar

1. Abrí el formulario y completá datos de prueba.
2. Completá la verificación antes de pulsar Descargar PDF.
3. Confirmá que el PDF se descarga con el nombre del cliente.
4. Confirmá que la página indica que se guardó la copia en la nube.
5. Buscá el mismo PDF dentro de la carpeta indicada.
6. Revisá el correo de robfranco97@gmail.com, incluida la carpeta de spam. El aviso contiene el enlace privado al archivo.

El cliente no necesita una cuenta de Google. Los archivos no se comparten públicamente. El acceso al enlace del aviso depende de los permisos privados de Drive.

## Alcance y reintentos

Se guarda la misma copia PDF que descarga el cliente. El script conserva también un registro con importes recalculados desde el tarifario; no confía en los totales que envía el navegador. El PDF recibido es un archivo del visitante; el registro y el aviso son la referencia recalculada del servidor.

Los reintentos normales del mismo envío no crean otro PDF ni mandan otro aviso. Si el correo falla, queda pendiente y se reintenta mediante la tarea instalada. MailApp no ofrece claves de idempotencia: una interrupción exactamente después de enviar y antes de registrar el resultado puede duplicar un aviso. Las cuotas de Google pueden retrasar avisos o impedir nuevos envíos.

El script tiene un límite propio de 50 nuevos presupuestos por día en modo público y 10 en modo de prueba, adicional a las cuotas de la cuenta. Puede ajustarse en Backend.gs y regenerar Code.gs si aumenta el uso.

La página confirma el guardado mediante una respuesta del script correlacionada al envío. No se usa una solicitud `no-cors` que declare éxito sin poder leer la respuesta. La confirmación entre GitHub Pages y Google debe verificarse en la prueba real de publicación; si el navegador o la cuenta impiden la respuesta, se muestra un error o tiempo de espera, nunca éxito supuesto.

Al modificar el tarifario ejecutá `npm run prepare:drive`, copiá de nuevo Code.gs al proyecto y actualizá la implementación con una nueva versión.

## Referencias

- https://developers.google.com/apps-script/guides/web
- https://developers.google.com/apps-script/reference/drive/folder
- https://developers.google.com/apps-script/reference/mail/mail-app
- https://developers.google.com/recaptcha/docs/verify
