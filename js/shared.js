/**
 * Lógica compartida entre index.html (ranking público) y editor.html (editor visual).
 * Sin dependencias externas. Se carga como script clásico y expone window.CasaCampo.
 */
(function (global) {
  'use strict';

  var LIMA_OFFSET = '-05:00';
  var LIMA_TIMEZONE = 'America/Lima';
  var DEFAULT_PHOTO = 'photo/default.webp';

  /** Determina si un valor de fechaPago es una fecha válida y parseable. */
  function esFechaValida(fechaPago) {
    if (typeof fechaPago !== 'string' || fechaPago.trim() === '') return false;
    var t = new Date(fechaPago).getTime();
    return !Number.isNaN(t);
  }

  /** Determina si un registro tiene la forma mínima esperada (objeto con nombre). */
  function esRegistroValido(registro) {
    return !!registro && typeof registro === 'object' && !Array.isArray(registro);
  }

  /**
   * Ordena pagadores de forma ascendente por fechaPago (más antiguo primero).
   * Estable: en empates exactos o registros con fecha inválida conserva el orden original.
   * Los registros con fecha inválida se colocan siempre al final.
   */
  function ordenarPagadores(lista) {
    var indexados = (lista || []).map(function (p, i) {
      return { p: p, i: i, valida: esRegistroValido(p) && esFechaValida(p.fechaPago) };
    });
    indexados.sort(function (a, b) {
      if (a.valida && b.valida) {
        var diff = new Date(a.p.fechaPago) - new Date(b.p.fechaPago);
        if (diff !== 0) return diff;
        return a.i - b.i;
      }
      if (a.valida && !b.valida) return -1;
      if (!a.valida && b.valida) return 1;
      return a.i - b.i;
    });
    return indexados.map(function (x) { return x.p; });
  }

  /** Formatea fechaPago en español, zona horaria America/Lima. */
  function formatearFechaLima(fechaPago) {
    if (!esFechaValida(fechaPago)) return 'Fecha por corregir';
    var fecha = new Date(fechaPago);
    try {
      var fmtFecha = new Intl.DateTimeFormat('es-PE', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: LIMA_TIMEZONE
      });
      var fmtHora = new Intl.DateTimeFormat('es-PE', {
        hour: 'numeric', minute: '2-digit', hour12: true, timeZone: LIMA_TIMEZONE
      });
      return fmtFecha.format(fecha) + ', ' + fmtHora.format(fecha);
    } catch (err) {
      return fecha.toLocaleString('es-PE');
    }
  }

  var MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  /** Formatea fechaPago de forma compacta ("30 jul 2026 · 6:12 p. m."), zona horaria America/Lima. */
  function formatearFechaCorta(fechaPago) {
    if (!esFechaValida(fechaPago)) return 'Fecha pendiente de corrección';
    var fecha = new Date(fechaPago);
    try {
      var fmt = new Intl.DateTimeFormat('es-PE', {
        day: 'numeric', month: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
        timeZone: LIMA_TIMEZONE
      });
      var partes = {};
      fmt.formatToParts(fecha).forEach(function (p) { partes[p.type] = p.value; });
      var mes = MESES_CORTOS[Number(partes.month) - 1] || partes.month;
      return partes.day + ' ' + mes + ' ' + partes.year + ' · ' +
        partes.hour + ':' + partes.minute + ' ' + partes.dayPeriod;
    } catch (err) {
      return formatearFechaLima(fechaPago);
    }
  }

  /**
   * Convierte un valor de <input type="datetime-local"> (hora local del navegador,
   * interpretada como hora de Lima) al formato ISO 8601 con offset -05:00 explícito.
   * Evita toISOString() porque este convierte a UTC y agrega "Z".
   */
  function datetimeLocalALima(valor) {
    if (!valor) return '';
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(valor);
    if (!m) return '';
    var segundos = m[6] || '00';
    return m[1] + '-' + m[2] + '-' + m[3] + 'T' + m[4] + ':' + m[5] + ':' + segundos + LIMA_OFFSET;
  }

  /** Convierte un fechaPago ISO (con cualquier offset) a valor para <input type="datetime-local">. */
  function fechaISOADatetimeLocal(fechaPago) {
    if (!esFechaValida(fechaPago)) return '';
    var m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}):(\d{2})(?:[.,]\d+)?(Z|[+-]\d{2}:\d{2})$/.exec(fechaPago.trim());
    if (m) {
      return m[1] + 'T' + m[2] + ':' + m[3];
    }
    var fecha = new Date(fechaPago);
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return fecha.getFullYear() + '-' + pad(fecha.getMonth() + 1) + '-' + pad(fecha.getDate()) +
      'T' + pad(fecha.getHours()) + ':' + pad(fecha.getMinutes()) + ':' + pad(fecha.getSeconds());
  }

  /** Devuelve la fecha y hora actuales de Lima en formato ISO con offset -05:00. */
  function ahoraEnLimaISO() {
    var ahoraUTC = Date.now();
    var limaMs = ahoraUTC - 5 * 60 * 60 * 1000;
    var d = new Date(limaMs);
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) +
      'T' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + LIMA_OFFSET;
  }

  /** Verifica si un string de foto es seguro de usar como src (esquema no peligroso). */
  function esFotoSegura(foto) {
    if (typeof foto !== 'string') return false;
    var valor = foto.trim();
    if (valor === '') return false;
    var esquemaPeligroso = /^\s*(javascript|data|vbscript):/i;
    if (esquemaPeligroso.test(valor)) return false;
    return true;
  }

  /** Resuelve la URL final a usar para una foto, aplicando el valor por defecto si hace falta. */
  function resolverFotoSrc(foto) {
    if (esFotoSegura(foto)) return foto.trim();
    return DEFAULT_PHOTO;
  }

  /** Limpia espacios de un nombre y valida que no quede vacío. */
  function normalizarNombre(nombre) {
    return typeof nombre === 'string' ? nombre.trim().replace(/\s+/g, ' ') : '';
  }

  global.CasaCampo = {
    LIMA_OFFSET: LIMA_OFFSET,
    LIMA_TIMEZONE: LIMA_TIMEZONE,
    DEFAULT_PHOTO: DEFAULT_PHOTO,
    esFechaValida: esFechaValida,
    esRegistroValido: esRegistroValido,
    ordenarPagadores: ordenarPagadores,
    formatearFechaLima: formatearFechaLima,
    formatearFechaCorta: formatearFechaCorta,
    datetimeLocalALima: datetimeLocalALima,
    fechaISOADatetimeLocal: fechaISOADatetimeLocal,
    ahoraEnLimaISO: ahoraEnLimaISO,
    esFotoSegura: esFotoSegura,
    resolverFotoSrc: resolverFotoSrc,
    normalizarNombre: normalizarNombre
  };
})(window);
