# Conectar la base del curso (una sola vez, unos 10 minutos)

La aplicación vive en GitHub Pages, que no puede guardar datos. Para que los productos escaneados
queden compartidos entre toda la clase usamos una **hoja de Google Sheets** de tu cuenta y un
pequeño script que la maneja. Es gratis.

## Pasos

1. Entra a <https://sheets.google.com> con tu cuenta de Google y crea una **hoja en blanco**.
   Ponle de nombre **Base del curso - palma**.
2. En el menú: **Extensiones → Apps Script**.
3. Borra lo que aparece y **pega todo el contenido del archivo `Code.gs`** (está en esta carpeta).
4. Arriba, en la lista de funciones, elige **configurar** y toca **Ejecutar**.
   Google pedirá permisos (hoja y Drive): *Revisar permisos → tu cuenta → Avanzado → Ir a (proyecto) → Permitir*.
   Es normal que diga "app no verificada": el script es tuyo.
5. Toca **Implementar → Nueva implementación**.
   - Tipo: **Aplicación web**.
   - Ejecutar como: **Yo**.
   - Quién tiene acceso: **Cualquier persona**.
   - **Implementar** y copia la **URL de la aplicación web** (termina en `/exec`).
6. **Pásame esa URL** y yo la pongo en `config.js` y subo el cambio. (O pégala tú en `BASE_URL` de `config.js`.)

## Cómo se usa

- Escanea un producto. Toca **💾 Guardar en la base del curso**.
- Toma la foto de la **carátula** y la de los **ingredientes** (la app lee el texto sola; corrige si hay errores).
- Toca **Guardar**. Queda en la hoja y las fotos en una carpeta de tu Drive llamada *Detector de palma - fotos*.
- Quien escanee el mismo código después verá el resultado al instante, con la etiqueta "de la base del curso".
- **base.html** muestra todos los productos con contadores y filtros (con palma, posible, sin palma, sin datos).
  Es la página para mostrar en el colegio.

## Cosas a saber

- La **clave** de `config.js` y la de `Code.gs` (`palma2026`) deben ser iguales. Cámbiala en los dos si quieres.
  No es una contraseña fuerte: solo evita escrituras por accidente.
- Si cambias `Code.gs` después, hay que **Implementar → Administrar implementaciones → editar → Nueva versión**.
  Si haces una "Nueva implementación" la URL cambia.
- Las fotos quedan visibles para quien tenga el enlace (así se pueden mostrar en `base.html`). No fotografíen personas.
- Para borrar un producto, borra su fila en la hoja.
- **Open Food Facts**: subir productos allí exige una cuenta propia, así que la app no lo hace sola.
  El botón **🌍 Completar en Open Food Facts** abre su formulario con el código ya puesto. Lo que se suba allí
  aparece después en la app sin hacer nada más (las fotos allí son de licencia abierta CC BY-SA).
