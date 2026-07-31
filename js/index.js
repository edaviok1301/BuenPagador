/**
 * index.js — página pública del ranking.
 * Carga data/pagadores.json, valida, ordena por fechaPago y renderiza
 * el resumen, el bloque principal (ganador + 2º/3º) y el resto de la lista.
 */
(function () {
  'use strict';

  var CC = window.CasaCampo;
  var DATA_URL = './data/pagadores.json';
  var NOMBRE_FALLBACK = 'Participante sin nombre';

  var resumenEl = document.getElementById('ranking-summary');
  var estadoEl = document.getElementById('estado');
  var estadoVacioEl = document.getElementById('estado-vacio');
  var topRankingEl = document.getElementById('top-ranking');
  var remainingRankingEl = document.getElementById('remaining-ranking');
  var listaRestoEl = document.getElementById('lista-resto');

  var MEDALLAS = {
    1: '🏆 1.er lugar',
    2: '🥈 2.º lugar',
    3: '🥉 3.er lugar'
  };

  var ACENTO_RANGO = { 2: 'plata', 3: 'bronce' };

  function setEstado(mensaje, tipo) {
    if (!mensaje) {
      estadoEl.hidden = true;
      estadoEl.textContent = '';
      estadoEl.className = 'estado';
      return;
    }
    estadoEl.hidden = false;
    estadoEl.textContent = mensaje;
    estadoEl.className = 'estado' + (tipo ? ' estado--' + tipo : '');
  }

  function nombreMostrado(persona) {
    return CC.normalizarNombre(persona && persona.nombre) || NOMBRE_FALLBACK;
  }

  /** Avatar por defecto: SVG en línea (reactivo al tema vía variables CSS), no un archivo estático. */
  function crearAvatarPlaceholder(nombre, claseFoto) {
    var span = document.createElement('span');
    span.className = claseFoto + ' avatar-placeholder';
    span.setAttribute('role', 'img');
    span.setAttribute('aria-label', 'Foto de ' + nombre);
    span.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<circle cx="12" cy="8" r="4"></circle>' +
      '<path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7"></path>' +
      '</svg>';
    return span;
  }

  function crearFoto(persona, claseFoto) {
    var nombre = nombreMostrado(persona);
    var fotoValor = persona && persona.foto;
    if (!CC.esFotoSegura(fotoValor)) {
      return crearAvatarPlaceholder(nombre, claseFoto);
    }
    var img = document.createElement('img');
    img.src = fotoValor.trim();
    img.alt = 'Foto de ' + nombre;
    img.loading = 'lazy';
    img.className = claseFoto;
    img.addEventListener('error', function onError() {
      img.replaceWith(crearAvatarPlaceholder(nombre, claseFoto));
    }, { once: true });
    return img;
  }

  /** Crea el nodo de fecha: <time> semántico si es válida, texto plano si no. */
  function crearNodoFecha(persona, claseBase) {
    var valida = CC.esFechaValida(persona.fechaPago);
    if (!valida) {
      console.warn('Registro con fechaPago inválida:', persona);
    }
    var nodo = document.createElement(valida ? 'time' : 'p');
    nodo.className = claseBase + (valida ? '' : ' ' + claseBase + '--invalida');
    if (valida) {
      nodo.setAttribute('datetime', persona.fechaPago);
    }
    nodo.textContent = valida
      ? CC.formatearFechaCorta(persona.fechaPago)
      : 'Fecha pendiente de corrección';
    return nodo;
  }

  function crearTarjetaGanador(persona) {
    var art = document.createElement('article');
    art.className = 'first-place tarjeta-principal';

    var encabezado = document.createElement('div');
    encabezado.className = 'tarjeta-principal__encabezado';

    var medalla = document.createElement('p');
    medalla.className = 'tarjeta-principal__medalla';
    medalla.textContent = MEDALLAS[1];
    encabezado.appendChild(medalla);

    var numero = document.createElement('span');
    numero.className = 'tarjeta-principal__numero';
    numero.textContent = '01';
    numero.setAttribute('aria-hidden', 'true');
    encabezado.appendChild(numero);

    art.appendChild(encabezado);

    var cuerpo = document.createElement('div');
    cuerpo.className = 'tarjeta-principal__cuerpo';

    var fotoWrap = document.createElement('div');
    fotoWrap.className = 'tarjeta-principal__foto-wrap';
    fotoWrap.appendChild(crearFoto(persona, 'tarjeta-principal__foto'));
    cuerpo.appendChild(fotoWrap);

    var nombre = document.createElement('h3');
    nombre.className = 'tarjeta-principal__nombre';
    nombre.textContent = nombreMostrado(persona);
    cuerpo.appendChild(nombre);

    var estado = document.createElement('p');
    estado.className = 'tarjeta-principal__estado';
    estado.textContent = 'Primer pago confirmado';
    cuerpo.appendChild(estado);

    var pie = document.createElement('div');
    pie.className = 'tarjeta-principal__pie';
    pie.appendChild(crearNodoFecha(persona, 'tarjeta-principal__fecha'));

    var check = document.createElement('span');
    check.className = 'tarjeta-principal__check';
    check.textContent = '✓';
    check.setAttribute('aria-hidden', 'true');
    pie.appendChild(check);

    cuerpo.appendChild(pie);
    art.appendChild(cuerpo);

    return art;
  }

  function crearTarjetaSecundaria(persona, rango) {
    var clasePosicion = rango === 2 ? 'second-place' : 'third-place';
    var art = document.createElement('article');
    art.className = clasePosicion + ' tarjeta-secundaria tarjeta-secundaria--' + ACENTO_RANGO[rango];

    art.appendChild(crearFoto(persona, 'tarjeta-secundaria__foto'));

    var info = document.createElement('div');
    info.className = 'tarjeta-secundaria__info';

    var medalla = document.createElement('p');
    medalla.className = 'tarjeta-secundaria__medalla';
    medalla.textContent = String(rango).padStart(2, '0') + ' · ' + MEDALLAS[rango];
    info.appendChild(medalla);

    var nombre = document.createElement('p');
    nombre.className = 'tarjeta-secundaria__nombre';
    nombre.textContent = nombreMostrado(persona);
    info.appendChild(nombre);

    info.appendChild(crearNodoFecha(persona, 'tarjeta-secundaria__fecha'));

    art.appendChild(info);
    return art;
  }

  function crearTarjetaResto(persona, rango) {
    var div = document.createElement('div');
    div.className = 'tarjeta';

    var rangoEl = document.createElement('span');
    rangoEl.className = 'tarjeta__rango';
    rangoEl.textContent = '#' + rango;
    rangoEl.setAttribute('aria-hidden', 'true');
    div.appendChild(rangoEl);

    div.appendChild(crearFoto(persona, 'tarjeta__foto'));

    var info = document.createElement('div');
    info.className = 'tarjeta__info';

    var nombre = document.createElement('p');
    nombre.className = 'tarjeta__nombre';
    nombre.textContent = 'Posición #' + rango + ' — ' + nombreMostrado(persona);
    info.appendChild(nombre);

    info.appendChild(crearNodoFecha(persona, 'tarjeta__fecha'));

    div.appendChild(info);
    return div;
  }

  function renderResumen(registros) {
    if (registros.length === 0) {
      resumenEl.hidden = true;
      return;
    }
    var plural = registros.length === 1 ? '' : 's';
    var texto = registros.length + ' pago' + plural + ' confirmado' + plural;

    var validos = registros.filter(function (p) { return CC.esFechaValida(p.fechaPago); });
    if (validos.length > 0) {
      var masReciente = validos.reduce(function (max, p) {
        return new Date(p.fechaPago) > new Date(max.fechaPago) ? p : max;
      });
      texto += ' · Último pago: ' + CC.formatearFechaCorta(masReciente.fechaPago);
    }

    resumenEl.textContent = texto;
    resumenEl.hidden = false;
  }

  function renderTopRanking(podio) {
    topRankingEl.innerHTML = '';
    topRankingEl.className = 'top-ranking top-ranking--' + podio.length;
    if (podio.length === 0) {
      topRankingEl.hidden = true;
      return;
    }
    topRankingEl.hidden = false;
    topRankingEl.appendChild(crearTarjetaGanador(podio[0]));
    if (podio[1]) topRankingEl.appendChild(crearTarjetaSecundaria(podio[1], 2));
    if (podio[2]) topRankingEl.appendChild(crearTarjetaSecundaria(podio[2], 3));
  }

  function renderResto(resto, inicioRango) {
    listaRestoEl.innerHTML = '';
    if (resto.length === 0) {
      remainingRankingEl.hidden = true;
      return;
    }
    remainingRankingEl.hidden = false;
    resto.forEach(function (persona, i) {
      listaRestoEl.appendChild(crearTarjetaResto(persona, inicioRango + i));
    });
  }

  function render(data) {
    var registros = (data || []).filter(CC.esRegistroValido);
    var ordenados = CC.ordenarPagadores(registros);

    // El bloque principal solo admite fechas válidas: una fecha inválida
    // nunca ocupa un puesto, aunque haya menos de 3 participantes en total.
    var candidatosPodio = ordenados.slice(0, 3);
    var podio = candidatosPodio.filter(function (p) { return CC.esFechaValida(p.fechaPago); });
    var resto = ordenados.slice(podio.length);

    estadoVacioEl.hidden = registros.length !== 0;
    setEstado(null);
    renderResumen(registros);

    renderTopRanking(podio);
    renderResto(resto, podio.length + 1);
  }

  function init() {
    if (window.CasaCampoTema) {
      window.CasaCampoTema.inicializarBotonTema(document.getElementById('theme-toggle'));
    }

    setEstado('Cargando ranking…', 'info');
    estadoVacioEl.hidden = true;
    topRankingEl.hidden = true;
    remainingRankingEl.hidden = true;
    resumenEl.hidden = true;

    fetch(DATA_URL, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!Array.isArray(data)) throw new Error('El archivo no contiene un arreglo JSON.');
        render(data);
      })
      .catch(function (err) {
        console.error('Error al cargar data/pagadores.json:', err);
        setEstado('No se pudo cargar el ranking. Verifica que data/pagadores.json exista y sea un JSON válido.', 'error');
        estadoVacioEl.hidden = true;
        resumenEl.hidden = true;
        renderTopRanking([]);
        renderResto([], 1);
      });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
