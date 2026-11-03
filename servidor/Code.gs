/**
 * Servidor de la base del curso (Google Apps Script).
 *
 * Recibe los productos que se guardan desde la aplicación, los anota en una hoja de Google Sheets
 * y guarda las fotos en una carpeta de Google Drive. También entrega la lista para la página base.html.
 *
 * Instrucciones paso a paso: ver LEEME.md
 */

// Debe ser igual a CLAVE en config.js. Evita que cualquiera que encuentre la dirección escriba en la hoja.
const CLAVE = 'palma2026';

const NOMBRE_HOJA = 'Productos';
const NOMBRE_CARPETA = 'Detector de palma - fotos';
const ZONA_HORARIA = 'America/Lima';
const SEPARADOR = ' | ';
const VEREDICTOS = ['palma', 'duda', 'suave', 'libre', 'nodata'];
const TIPOS = ['alimento', 'cosmetico'];
const MAX_FOTO = 1500000; // caracteres de la foto en base64 (unos 1,1 MB)

const COLUMNAS = [
  'Fecha', 'Código', 'Nombre', 'Marca', 'Tipo', 'Veredicto', 'Ingredientes',
  'Con palma', 'Posible palma', 'Suele ser de palma', 'RSPO', 'Fuente',
  'Foto carátula', 'Foto ingredientes', 'Alumno', 'Veces'
];
const COL = {};
COLUMNAS.forEach(function (n, i) { COL[n] = i; });

function respuesta_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function obtenerHoja_() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = libro.getSheetByName(NOMBRE_HOJA);
  if (!hoja) hoja = libro.insertSheet(NOMBRE_HOJA);
  if (hoja.getLastRow() === 0) {
    hoja.getRange(1, 1, 1, COLUMNAS.length).setValues([COLUMNAS]).setFontWeight('bold');
    hoja.setFrozenRows(1);
    hoja.getRange('B:B').setNumberFormat('@'); // el código se guarda como texto
  }
  return hoja;
}

function obtenerCarpeta_() {
  const it = DriveApp.getFoldersByName(NOMBRE_CARPETA);
  return it.hasNext() ? it.next() : DriveApp.createFolder(NOMBRE_CARPETA);
}

function guardarFoto_(dataUrl, nombre) {
  if (!dataUrl) return '';
  const m = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+\/=]+)$/.exec(dataUrl);
  if (!m) return '';
  const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], nombre);
  const archivo = obtenerCarpeta_().createFile(blob);
  archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://drive.google.com/thumbnail?id=' + archivo.getId() + '&sz=w600';
}

function texto_(v, max) {
  return String(v === undefined || v === null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max);
}

function lista_(v) {
  if (!Array.isArray(v)) return '';
  return v.slice(0, 40).map(function (x) { return texto_(x, 120); }).filter(String).join(SEPARADOR);
}

// Evita que un texto que empieza con = + - @ se interprete como fórmula en la hoja
function seguro_(s) {
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

// Lee el texto de una foto con el OCR de Google Drive (mucho mejor que el del celular).
// Requiere activar el servicio avanzado "Drive API" en el editor de Apps Script (ver LEEME.md).
function leerTexto_(dataUrl) {
  const m = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+\/=]+)$/.exec(String(dataUrl || ''));
  if (!m || String(dataUrl).length > MAX_FOTO) return { ok: false, error: 'foto' };
  let id = null;
  try {
    const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], 'ocr.jpg');
    const f = Drive.Files.insert({ title: 'ocr-temporal', mimeType: m[1] }, blob, { ocr: true, ocrLanguage: 'es' });
    id = f.id;
    const texto = DocumentApp.openById(id).getBody().getText();
    return { ok: true, texto: texto };
  } catch (err) {
    return { ok: false, error: 'ocr: ' + String(err).slice(0, 100) };
  } finally {
    if (id) { try { Drive.Files.remove(id); } catch (x) { /* nada */ } }
  }
}

function sinCeros_(v) {
  return String(v).replace(/^0+/, '');
}

function doPost(e) {
  const candado = LockService.getScriptLock();
  try {
    candado.waitLock(20000);
    const d = JSON.parse(e.postData.contents);

    if (CLAVE && d.clave !== CLAVE) return respuesta_({ ok: false, error: 'clave' });
    if (d.accion === 'ocr') return respuesta_(leerTexto_(d.foto));

    const codigo = texto_(d.codigo, 20);
    if (!/^\d{8,14}$/.test(codigo)) return respuesta_({ ok: false, error: 'codigo' });
    const nombre = texto_(d.nombre, 120).trim();
    if (nombre.length < 2) return respuesta_({ ok: false, error: 'nombre' });
    const veredicto = VEREDICTOS.indexOf(d.veredicto) >= 0 ? d.veredicto : 'nodata';
    const tipo = TIPOS.indexOf(d.tipo) >= 0 ? d.tipo : 'alimento';
    const fotoFrente = d.fotoFrente && String(d.fotoFrente).length <= MAX_FOTO ? d.fotoFrente : '';
    const fotoIng = d.fotoIngredientes && String(d.fotoIngredientes).length <= MAX_FOTO ? d.fotoIngredientes : '';

    const hoja = obtenerHoja_();
    const datos = hoja.getDataRange().getValues();
    let fila = -1;
    for (let i = 1; i < datos.length; i++) {
      if (sinCeros_(datos[i][COL['Código']]) === sinCeros_(codigo)) { fila = i + 1; break; }
    }
    const previa = fila > 0 ? datos[fila - 1] : null;

    const urlFrente = fotoFrente ? guardarFoto_(fotoFrente, codigo + '_caratula.jpg') : (previa ? previa[COL['Foto carátula']] : '');
    const urlIng = fotoIng ? guardarFoto_(fotoIng, codigo + '_ingredientes.jpg') : (previa ? previa[COL['Foto ingredientes']] : '');

    const registro = [];
    registro[COL['Fecha']] = new Date();
    registro[COL['Código']] = codigo;
    registro[COL['Nombre']] = seguro_(nombre);
    registro[COL['Marca']] = seguro_(texto_(d.marca, 80).trim());
    registro[COL['Tipo']] = tipo;
    registro[COL['Veredicto']] = veredicto;
    registro[COL['Ingredientes']] = seguro_(texto_(d.ingredientes, 4000));
    registro[COL['Con palma']] = seguro_(lista_(d.palma));
    registro[COL['Posible palma']] = seguro_(lista_(d.duda));
    registro[COL['Suele ser de palma']] = seguro_(lista_(d.suave));
    registro[COL['RSPO']] = d.rspo ? 'sí' : '';
    registro[COL['Fuente']] = seguro_(texto_(d.fuente, 60));
    registro[COL['Foto carátula']] = urlFrente || '';
    registro[COL['Foto ingredientes']] = urlIng || '';
    registro[COL['Alumno']] = seguro_(texto_(d.alumno, 40).trim());
    registro[COL['Veces']] = previa ? (Number(previa[COL['Veces']]) || 1) + 1 : 1;

    if (fila < 0) fila = hoja.getLastRow() + 1;
    hoja.getRange(fila, COL['Código'] + 1).setNumberFormat('@'); // texto, para no perder ceros iniciales
    hoja.getRange(fila, 1, 1, COLUMNAS.length).setValues([registro]);
    return respuesta_({ ok: true, actualizado: !!previa });
  } catch (err) {
    return respuesta_({ ok: false, error: 'servidor: ' + String(err).slice(0, 120) });
  } finally {
    try { candado.releaseLock(); } catch (x) { /* nada */ }
  }
}

function aLista_(s) {
  return s ? String(s).split(SEPARADOR).filter(String) : [];
}

function doGet(e) {
  try {
    const datos = obtenerHoja_().getDataRange().getValues();
    const productos = [];
    for (let i = 1; i < datos.length; i++) {
      const f = datos[i];
      if (!f[COL['Código']]) continue;
      const fecha = f[COL['Fecha']];
      productos.push({
        fecha: fecha instanceof Date ? Utilities.formatDate(fecha, ZONA_HORARIA, "yyyy-MM-dd'T'HH:mm") : String(fecha),
        codigo: String(f[COL['Código']]),
        nombre: String(f[COL['Nombre']]),
        marca: String(f[COL['Marca']]),
        tipo: String(f[COL['Tipo']]),
        veredicto: String(f[COL['Veredicto']]),
        ingredientes: String(f[COL['Ingredientes']]),
        palma: aLista_(f[COL['Con palma']]),
        duda: aLista_(f[COL['Posible palma']]),
        suave: aLista_(f[COL['Suele ser de palma']]),
        rspo: f[COL['RSPO']] === 'sí',
        fuente: String(f[COL['Fuente']]),
        fotoFrente: String(f[COL['Foto carátula']]),
        fotoIngredientes: String(f[COL['Foto ingredientes']]),
        alumno: String(f[COL['Alumno']]),
        veces: Number(f[COL['Veces']]) || 1
      });
    }
    return respuesta_({ ok: true, productos: productos });
  } catch (err) {
    return respuesta_({ ok: false, error: 'servidor: ' + String(err).slice(0, 120) });
  }
}

// Ejecutar una vez a mano desde el editor para crear la hoja y la carpeta, y autorizar los permisos.
function configurar() {
  obtenerHoja_();
  obtenerCarpeta_();
}
