/**
 * editor.js — editor visual del JSON de pagadores.
 * No guarda nada en GitHub: solo genera el JSON para copiar/descargar.
 */
(function () {
  'use strict';

  var CC = window.CasaCampo;
  var DATA_URL = './data/pagadores.json';

  // ---------- Referencias DOM ----------
  var anunciosEl = document.getElementById('anuncios');

  var estadoCargaEl = document.getElementById('estado-carga');
  var btnRecargarEl = document.getElementById('btn-recargar');
  var inputArchivoEl = document.getElementById('input-archivo');
  var btnRestablecerEl = document.getElementById('btn-restablecer');
  var textareaPegadoEl = document.getElementById('textarea-pegado');
  var btnAplicarPegadoEl = document.getElementById('btn-aplicar-pegado');

  var panelErroresEl = document.getElementById('panel-errores-import');
  var listaErroresEl = document.getElementById('lista-errores-import');
  var btnCerrarErroresEl = document.getElementById('btn-cerrar-errores');

  var formEl = document.getElementById('form-participante');
  var formModoEl = document.getElementById('form-modo');
  var inputNombreEl = document.getElementById('input-nombre');
  var inputFotoEl = document.getElementById('input-foto');
  var previewFotoEl = document.getElementById('preview-foto');
  var inputFechaEl = document.getElementById('input-fecha');
  var posicionPreviewEl = document.getElementById('posicion-preview');
  var btnGuardarEl = document.getElementById('btn-guardar');
  var btnCancelarEdicionEl = document.getElementById('btn-cancelar-edicion');
  var btnLimpiarFormEl = document.getElementById('btn-limpiar-form');

  var btnOrdenarEl = document.getElementById('btn-ordenar');
  var estadoListaEl = document.getElementById('estado-lista');
  var listaRankingEl = document.getElementById('lista-ranking');

  var estadoExportEl = document.getElementById('estado-export');
  var salidaJsonEl = document.getElementById('salida-json');
  var btnCopiarEl = document.getElementById('btn-copiar');
  var btnDescargarEl = document.getElementById('btn-descargar');

  // ---------- Estado interno (nunca se exporta tal cual) ----------
  var state = {
    items: [],
    nextId: 1,
    editingId: null,
    erroresImportacion: [],
    ultimaCargaOrigen: null,
    ultimaCargaSnapshot: null,
    sucio: false
  };

  function generarId() {
    return state.nextId++;
  }

  function buscar(id) {
    return state.items.filter(function (x) { return x._id === id; })[0];
  }

  function clonarSnapshot(arr) {
    return JSON.parse(JSON.stringify(arr));
  }

  function marcarSucio(v) {
    state.sucio = v;
  }

  // ---------- Mensajes de estado ----------
  function setEstadoCarga(msg, tipo) {
    estadoCargaEl.textContent = msg || '';
    estadoCargaEl.className = 'estado' + (tipo ? ' estado--' + tipo : '');
  }

  function setEstadoLista(msg) {
    estadoListaEl.textContent = msg || '';
  }

  function anunciar(msg) {
    anunciosEl.textContent = '';
    window.setTimeout(function () { anunciosEl.textContent = msg; }, 30);
  }

  function mostrarConfirmacion(btn, mensaje) {
    var original = btn.getAttribute('data-texto-original') || btn.textContent;
    btn.setAttribute('data-texto-original', original);
    btn.textContent = mensaje;
    window.setTimeout(function () {
      btn.textContent = btn.getAttribute('data-texto-original');
    }, 2000);
  }

  // ---------- Validación de importación ----------
  function normalizarRegistro(raw, indice) {
    var errores = [];
    var obj = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : null;
    if (!obj) {
      errores.push({ indice: indice, campo: '(registro)', mensaje: 'Registro #' + (indice + 1) + ': no es un objeto JSON válido.' });
      obj = {};
    }

    var nombre = CC.normalizarNombre(obj.nombre);
    if (!nombre) {
      errores.push({ indice: indice, campo: 'nombre', mensaje: 'Registro #' + (indice + 1) + ': falta el nombre o está vacío.' });
    }

    var foto = (typeof obj.foto === 'string') ? obj.foto.trim() : '';
    if (obj.foto !== undefined && obj.foto !== null && typeof obj.foto !== 'string') {
      errores.push({ indice: indice, campo: 'foto', mensaje: 'Registro #' + (indice + 1) + ': la foto debe ser texto (ruta o URL).' });
    }
    if (!foto) foto = CC.DEFAULT_PHOTO;

    var fechaOriginal = (obj.fechaPago === undefined || obj.fechaPago === null) ? '' : String(obj.fechaPago);
    if (!CC.esFechaValida(fechaOriginal)) {
      errores.push({ indice: indice, campo: 'fechaPago', mensaje: 'Registro #' + (indice + 1) + ': la fecha de pago falta o no es válida.' });
    }

    return {
      item: { _id: generarId(), nombre: nombre, foto: foto, fechaPago: fechaOriginal },
      errores: errores
    };
  }

  function problemasDeItem(item) {
    var msgs = [];
    if (!item.nombre) msgs.push('Falta el nombre.');
    if (!CC.esFechaValida(item.fechaPago)) msgs.push('Fecha inválida.');
    return msgs;
  }

  function validarFoto(valor) {
    if (/^\s*(javascript|data|vbscript):/i.test(valor)) {
      return { ok: false, mensaje: 'Ese tipo de enlace no está permitido por seguridad.' };
    }
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(valor)) {
      if (!/^https?:\/\//i.test(valor)) {
        return { ok: false, mensaje: 'Las URL externas deben iniciar con http:// o https://' };
      }
      try {
        new URL(valor);
      } catch (err) {
        return { ok: false, mensaje: 'La URL no tiene un formato válido.' };
      }
    }
    return { ok: true };
  }

  // ---------- Carga / importación ----------
  function reemplazarItems(nuevosItems, erroresImport) {
    state.items = nuevosItems;
    state.erroresImportacion = erroresImport || [];
    state.editingId = null;
    actualizarVistaFormularioNuevo();
    renderErroresImportacion();
  }

  function procesarImportacion(dataArray, origen) {
    var errores = [];
    var items = dataArray.map(function (raw, i) {
      var r = normalizarRegistro(raw, i);
      errores = errores.concat(r.errores);
      return r.item;
    });
    reemplazarItems(items, errores);
    state.ultimaCargaOrigen = origen;
    state.ultimaCargaSnapshot = clonarSnapshot(dataArray);
    marcarSucio(origen !== 'auto');
    renderTodo();
  }

  function renderErroresImportacion() {
    var errores = state.erroresImportacion;
    listaErroresEl.innerHTML = '';
    if (!errores || errores.length === 0) {
      panelErroresEl.hidden = true;
      return;
    }
    panelErroresEl.hidden = false;
    errores.forEach(function (e) {
      var li = document.createElement('li');
      li.textContent = e.mensaje;
      listaErroresEl.appendChild(li);
    });
  }

  function cargarAutomatico() {
    setEstadoCarga('Cargando data/pagadores.json…', null);
    fetch(DATA_URL, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!Array.isArray(data)) throw new Error('La raíz del JSON debe ser un arreglo.');
        procesarImportacion(data, 'auto');
        setEstadoCarga('data/pagadores.json cargado (' + state.items.length + ' registro(s)).', 'exito');
        anunciar('Datos cargados automáticamente.');
      })
      .catch(function (err) {
        console.error('Error al cargar data/pagadores.json:', err);
        setEstadoCarga('No se pudo cargar data/pagadores.json automáticamente (esto es normal si abriste el archivo sin un servidor local). Usa "Importar archivo .json" o pega el JSON manualmente.', 'error');
      });
  }

  function intentarImportarTexto(texto, origen) {
    var data;
    try {
      data = JSON.parse(texto);
    } catch (err) {
      setEstadoCarga('El contenido no es JSON válido: ' + err.message, 'error');
      return;
    }
    if (!Array.isArray(data)) {
      setEstadoCarga('La raíz del JSON debe ser un arreglo "[ ... ]".', 'error');
      return;
    }
    procesarImportacion(data, origen);
    var etiqueta = origen === 'archivo' ? 'Archivo importado' : 'JSON pegado aplicado';
    var conProblemas = state.erroresImportacion.length;
    setEstadoCarga(
      etiqueta + ': ' + state.items.length + ' registro(s)' +
      (conProblemas ? ', ' + conProblemas + ' con problemas (revisa el panel de errores).' : '.'),
      conProblemas ? 'error' : 'exito'
    );
    anunciar(etiqueta + '.');
  }

  function manejarArchivo(file) {
    var reader = new FileReader();
    reader.onload = function () {
      intentarImportarTexto(String(reader.result), 'archivo');
    };
    reader.onerror = function () {
      setEstadoCarga('No se pudo leer el archivo seleccionado.', 'error');
    };
    reader.readAsText(file, 'utf-8');
  }

  function restablecer() {
    if (!state.ultimaCargaSnapshot) {
      setEstadoCarga('Todavía no hay datos cargados para restablecer.', 'error');
      return;
    }
    if (state.items.length && !window.confirm('¿Restablecer a los últimos datos cargados? Se perderán los cambios no exportados.')) {
      return;
    }
    procesarImportacion(clonarSnapshot(state.ultimaCargaSnapshot), state.ultimaCargaOrigen || 'auto');
    setEstadoCarga('Datos restablecidos a la última carga.', 'exito');
    anunciar('Datos restablecidos.');
  }

  // ---------- Formulario ----------
  function prefijarFechaActual() {
    inputFechaEl.value = CC.fechaISOADatetimeLocal(CC.ahoraEnLimaISO());
  }

  function actualizarPreviewFoto() {
    var valor = inputFotoEl.value.trim();
    previewFotoEl.src = CC.resolverFotoSrc(valor);
  }

  function actualizarFormPosicionPreview() {
    var valor = inputFechaEl.value;
    if (!valor) { posicionPreviewEl.textContent = ''; return; }
    var iso = CC.datetimeLocalALima(valor);
    if (!iso || !CC.esFechaValida(iso)) { posicionPreviewEl.textContent = ''; return; }
    var otros = state.items.filter(function (x) { return x._id !== state.editingId; });
    var simulado = otros.concat([{ _id: '__preview__', fechaPago: iso }]);
    var ordenado = CC.ordenarPagadores(simulado);
    var pos = -1;
    ordenado.forEach(function (x, i) { if (x._id === '__preview__') pos = i + 1; });
    posicionPreviewEl.textContent = pos > 0
      ? ('Con esta fecha quedaría en la posición #' + pos + ' de ' + ordenado.length + '.')
      : '';
  }

  function mostrarErrorCampo(campo, mensaje) {
    var el = document.getElementById('error-' + campo);
    if (el) el.textContent = mensaje;
    var input = campo === 'fecha' ? inputFechaEl : (campo === 'foto' ? inputFotoEl : inputNombreEl);
    if (input) input.setAttribute('aria-invalid', 'true');
  }

  function limpiarErroresCampo() {
    ['nombre', 'foto', 'fecha'].forEach(function (c) {
      var el = document.getElementById('error-' + c);
      if (el) el.textContent = '';
    });
    [inputNombreEl, inputFotoEl, inputFechaEl].forEach(function (i) { i.removeAttribute('aria-invalid'); });
  }

  function actualizarVistaFormularioNuevo() {
    formEl.reset();
    formModoEl.textContent = '2. Nuevo participante';
    btnCancelarEdicionEl.hidden = true;
    btnGuardarEl.textContent = 'Guardar participante';
    limpiarErroresCampo();
    prefijarFechaActual();
    actualizarPreviewFoto();
    actualizarFormPosicionPreview();
  }

  function cancelarEdicion() {
    state.editingId = null;
    actualizarVistaFormularioNuevo();
  }

  function iniciarEdicion(id) {
    var item = buscar(id);
    if (!item) return;
    state.editingId = id;
    inputNombreEl.value = item.nombre || '';
    inputFotoEl.value = item.foto || '';
    inputFechaEl.value = CC.fechaISOADatetimeLocal(item.fechaPago);
    actualizarPreviewFoto();
    limpiarErroresCampo();
    formModoEl.textContent = '2. Editar participante';
    btnCancelarEdicionEl.hidden = false;
    btnGuardarEl.textContent = 'Actualizar participante';
    actualizarFormPosicionPreview();
    inputNombreEl.focus();
    formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function manejarSubmit(e) {
    e.preventDefault();
    limpiarErroresCampo();
    var ok = true;

    var nombre = CC.normalizarNombre(inputNombreEl.value);
    if (!nombre) {
      mostrarErrorCampo('nombre', 'El nombre es obligatorio y no puede contener solo espacios.');
      ok = false;
    }

    var fotoRaw = inputFotoEl.value.trim();
    if (fotoRaw) {
      var validacionFoto = validarFoto(fotoRaw);
      if (!validacionFoto.ok) {
        mostrarErrorCampo('foto', validacionFoto.mensaje);
        ok = false;
      }
    }
    var foto = fotoRaw || CC.DEFAULT_PHOTO;

    var fechaValor = inputFechaEl.value;
    var fechaISO = '';
    if (!fechaValor) {
      mostrarErrorCampo('fecha', 'La fecha y hora de pago son obligatorias.');
      ok = false;
    } else {
      fechaISO = CC.datetimeLocalALima(fechaValor);
      if (!fechaISO || !CC.esFechaValida(fechaISO)) {
        mostrarErrorCampo('fecha', 'La fecha ingresada no es válida.');
        ok = false;
      }
    }

    if (!ok) {
      anunciar('Hay errores en el formulario. Revisa los campos marcados.');
      return;
    }

    if (state.editingId) {
      var item = buscar(state.editingId);
      item.nombre = nombre;
      item.foto = foto;
      item.fechaPago = fechaISO;
      anunciar('Participante actualizado.');
    } else {
      state.items.push({ _id: generarId(), nombre: nombre, foto: foto, fechaPago: fechaISO });
      anunciar('Participante creado.');
    }

    marcarSucio(true);
    cancelarEdicion();
    renderTodo();
  }

  // ---------- Acciones sobre el ranking ----------
  function duplicar(id) {
    var item = buscar(id);
    if (!item) return;
    var idx = state.items.indexOf(item);
    var copia = {
      _id: generarId(),
      nombre: item.nombre ? item.nombre + ' (copia)' : 'Copia',
      foto: item.foto,
      fechaPago: item.fechaPago
    };
    state.items.splice(idx + 1, 0, copia);
    marcarSucio(true);
    renderTodo();
    anunciar('Participante duplicado.');
  }

  function eliminar(id) {
    var item = buscar(id);
    if (!item) return;
    var nombreMostrar = item.nombre || 'este participante';
    if (!window.confirm('¿Eliminar a "' + nombreMostrar + '"? Esta acción no se puede deshacer aquí.')) return;
    state.items = state.items.filter(function (x) { return x._id !== id; });
    if (state.editingId === id) cancelarEdicion();
    marcarSucio(true);
    renderTodo();
    anunciar('Participante eliminado.');
  }

  function ordenarAhora() {
    var nuevoOrden = CC.ordenarPagadores(state.items);
    var cambio = nuevoOrden.some(function (x, i) { return state.items[i] !== x; });
    state.items = nuevoOrden;
    if (cambio) marcarSucio(true);
    renderTodo();
    anunciar('Participantes ordenados por fecha de pago.');
  }

  function manejarClickRanking(e) {
    var btn = e.target.closest('button[data-accion]');
    if (!btn) return;
    var id = Number(btn.getAttribute('data-id'));
    var accion = btn.getAttribute('data-accion');
    if (accion === 'editar') iniciarEdicion(id);
    else if (accion === 'duplicar') duplicar(id);
    else if (accion === 'eliminar') eliminar(id);
  }

  // ---------- Renderizado ----------
  function crearBotonAccion(accion, id, texto, claseExtra) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn--secundario' + (claseExtra ? ' ' + claseExtra : '');
    btn.setAttribute('data-accion', accion);
    btn.setAttribute('data-id', String(id));
    btn.textContent = texto;
    btn.setAttribute('aria-label', texto + ' participante');
    return btn;
  }

  function crearFilaRanking(item, rango) {
    var li = document.createElement('li');
    li.className = 'ranking-item';

    var rangoEl = document.createElement('span');
    rangoEl.className = 'ranking-item__rango';
    rangoEl.textContent = '#' + rango;
    rangoEl.setAttribute('aria-hidden', 'true');
    li.appendChild(rangoEl);

    var img = document.createElement('img');
    img.className = 'ranking-item__foto';
    img.src = CC.resolverFotoSrc(item.foto);
    img.alt = 'Foto de ' + (item.nombre || 'participante sin nombre');
    img.addEventListener('error', function onErr() {
      if (img.src.indexOf(CC.DEFAULT_PHOTO) === -1) { img.src = CC.DEFAULT_PHOTO; }
      else { img.removeEventListener('error', onErr); }
    });
    li.appendChild(img);

    var info = document.createElement('div');
    info.className = 'ranking-item__info';

    var nombreEl = document.createElement('p');
    nombreEl.className = 'ranking-item__nombre';
    nombreEl.textContent = 'Posición #' + rango + ' — ' + (item.nombre || '(sin nombre)');
    info.appendChild(nombreEl);

    var valida = CC.esFechaValida(item.fechaPago);
    var fechaEl = document.createElement('p');
    fechaEl.className = 'ranking-item__fecha';
    fechaEl.textContent = valida ? CC.formatearFechaLima(item.fechaPago) : '⚠ Fecha por corregir';
    info.appendChild(fechaEl);

    var problemas = problemasDeItem(item);
    if (problemas.length) {
      var badge = document.createElement('p');
      badge.className = 'ranking-item__badge';
      badge.textContent = '⚠ ' + problemas.join(' ');
      info.appendChild(badge);
    }

    li.appendChild(info);

    var acciones = document.createElement('div');
    acciones.className = 'ranking-item__acciones';
    acciones.appendChild(crearBotonAccion('editar', item._id, 'Editar', ''));
    acciones.appendChild(crearBotonAccion('duplicar', item._id, 'Duplicar', ''));
    acciones.appendChild(crearBotonAccion('eliminar', item._id, 'Eliminar', 'btn--peligro'));
    li.appendChild(acciones);

    return li;
  }

  function renderRanking() {
    var ordenados = CC.ordenarPagadores(state.items);
    listaRankingEl.innerHTML = '';
    if (ordenados.length === 0) {
      var li = document.createElement('li');
      li.className = 'lista-vacia';
      li.textContent = 'No hay participantes todavía. Usa el formulario para crear el primero.';
      listaRankingEl.appendChild(li);
      setEstadoLista('');
      return;
    }
    ordenados.forEach(function (item, i) {
      listaRankingEl.appendChild(crearFilaRanking(item, i + 1));
    });
    setEstadoLista(ordenados.length + ' participante(s).');
  }

  function renderJSON() {
    var ordenados = CC.ordenarPagadores(state.items);
    var exportable = ordenados.map(function (x) {
      return { nombre: x.nombre, foto: x.foto, fechaPago: x.fechaPago };
    });
    salidaJsonEl.value = JSON.stringify(exportable, null, 2);
    if (state.sucio) {
      estadoExportEl.textContent = 'Cambios pendientes de copiar o descargar.';
      estadoExportEl.className = 'estado-export estado-export--pendiente';
    } else {
      estadoExportEl.textContent = 'Sin cambios pendientes.';
      estadoExportEl.className = 'estado-export estado-export--ok';
    }
  }

  function renderTodo() {
    renderRanking();
    renderJSON();
    actualizarFormPosicionPreview();
  }

  // ---------- Copiar / descargar ----------
  function copiarJSON() {
    var texto = salidaJsonEl.value;

    function marcarExito() {
      marcarSucio(false);
      renderJSON();
      mostrarConfirmacion(btnCopiarEl, 'Copiado ✓');
      anunciar('JSON copiado al portapapeles.');
    }

    function marcarFallo() {
      salidaJsonEl.focus();
      salidaJsonEl.select();
      anunciar('No se pudo copiar automáticamente. El texto quedó seleccionado para copiarlo manualmente.');
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(marcarExito, marcarFallo);
    } else {
      try {
        salidaJsonEl.focus();
        salidaJsonEl.select();
        var ok = document.execCommand('copy');
        if (ok) marcarExito(); else marcarFallo();
      } catch (err) {
        marcarFallo();
      }
    }
  }

  function descargarJSON() {
    var texto = salidaJsonEl.value;
    var blob = new Blob([texto], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'pagadores.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);

    marcarSucio(false);
    renderJSON();
    mostrarConfirmacion(btnDescargarEl, 'Descargado ✓');
    anunciar('Descarga de pagadores.json iniciada.');
  }

  // ---------- Inicialización ----------
  function init() {
    actualizarVistaFormularioNuevo();
    renderTodo();
    cargarAutomatico();

    formEl.addEventListener('submit', manejarSubmit);
    inputFotoEl.addEventListener('input', actualizarPreviewFoto);
    inputFechaEl.addEventListener('input', actualizarFormPosicionPreview);
    btnCancelarEdicionEl.addEventListener('click', cancelarEdicion);
    btnLimpiarFormEl.addEventListener('click', cancelarEdicion);

    btnRecargarEl.addEventListener('click', cargarAutomatico);
    inputArchivoEl.addEventListener('change', function () {
      if (this.files && this.files[0]) manejarArchivo(this.files[0]);
      this.value = '';
    });
    btnAplicarPegadoEl.addEventListener('click', function () {
      var texto = textareaPegadoEl.value.trim();
      if (!texto) {
        setEstadoCarga('Pega contenido JSON antes de aplicar.', 'error');
        return;
      }
      intentarImportarTexto(texto, 'pegado');
    });
    btnCerrarErroresEl.addEventListener('click', function () {
      state.erroresImportacion = [];
      renderErroresImportacion();
    });
    btnRestablecerEl.addEventListener('click', restablecer);

    btnOrdenarEl.addEventListener('click', ordenarAhora);
    listaRankingEl.addEventListener('click', manejarClickRanking);

    btnCopiarEl.addEventListener('click', copiarJSON);
    btnDescargarEl.addEventListener('click', descargarJSON);

    window.addEventListener('beforeunload', function (e) {
      if (state.sucio) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
