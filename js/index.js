/**
 * index.js — página pública del ranking.
 * Carga data/pagadores.json, valida, ordena por fechaPago y renderiza podio + lista.
 */
(function () {
  'use strict';

  var CC = window.CasaCampo;
  var DATA_URL = './data/pagadores.json';

  var estadoEl = document.getElementById('estado');
  var podioEl = document.getElementById('podio');
  var seccionRestoEl = document.getElementById('seccion-resto');
  var listaRestoEl = document.getElementById('lista-resto');

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

  function crearImagen(persona) {
    var img = document.createElement('img');
    img.src = CC.resolverFotoSrc(persona && persona.foto);
    img.alt = 'Foto de ' + (CC.normalizarNombre(persona && persona.nombre) || 'participante');
    img.loading = 'lazy';
    img.addEventListener('error', function onError() {
      if (img.src.indexOf(CC.DEFAULT_PHOTO) === -1) {
        img.src = CC.DEFAULT_PHOTO;
      } else {
        img.removeEventListener('error', onError);
      }
    });
    return img;
  }

  var MEDALLAS = {
    1: { texto: '🏆 1er lugar' },
    2: { texto: '🥈 2do lugar' },
    3: { texto: '🥉 3er lugar' }
  };

  function crearPuestoPodio(persona, rango) {
    var art = document.createElement('article');
    art.className = 'puesto';
    art.setAttribute('data-rank', String(rango));

    var medalla = document.createElement('p');
    medalla.className = 'puesto__medalla';
    medalla.textContent = MEDALLAS[rango].texto;
    art.appendChild(medalla);

    var fotoWrap = document.createElement('div');
    fotoWrap.className = 'puesto__foto-wrap';
    var img = crearImagen(persona);
    img.className = 'puesto__foto';
    fotoWrap.appendChild(img);
    art.appendChild(fotoWrap);

    var nombre = document.createElement('h3');
    nombre.className = 'puesto__nombre';
    nombre.textContent = CC.normalizarNombre(persona.nombre) || '(sin nombre)';
    art.appendChild(nombre);

    var valida = CC.esFechaValida(persona.fechaPago);
    var fecha = document.createElement('p');
    fecha.className = 'puesto__fecha' + (valida ? '' : ' puesto__fecha--invalida');
    fecha.textContent = valida
      ? CC.formatearFechaLima(persona.fechaPago)
      : '⚠ Fecha por corregir';
    art.appendChild(fecha);

    return art;
  }

  function crearTarjetaResto(persona, rango) {
    var li = document.createElement('div');
    li.className = 'tarjeta';

    var rangoEl = document.createElement('span');
    rangoEl.className = 'tarjeta__rango';
    rangoEl.textContent = '#' + rango;
    rangoEl.setAttribute('aria-hidden', 'true');
    li.appendChild(rangoEl);

    var img = crearImagen(persona);
    img.className = 'tarjeta__foto';
    li.appendChild(img);

    var info = document.createElement('div');
    info.className = 'tarjeta__info';

    var nombre = document.createElement('p');
    nombre.className = 'tarjeta__nombre';
    nombre.textContent = 'Posición #' + rango + ' — ' + (CC.normalizarNombre(persona.nombre) || '(sin nombre)');
    info.appendChild(nombre);

    var valida = CC.esFechaValida(persona.fechaPago);
    var fecha = document.createElement('p');
    fecha.className = 'tarjeta__fecha' + (valida ? '' : ' tarjeta__fecha--invalida');
    fecha.textContent = valida
      ? CC.formatearFechaLima(persona.fechaPago)
      : '⚠ Fecha por corregir';
    info.appendChild(fecha);

    li.appendChild(info);
    return li;
  }

  function renderPodio(top3) {
    podioEl.innerHTML = '';
    top3.forEach(function (persona, i) {
      podioEl.appendChild(crearPuestoPodio(persona, i + 1));
    });
    podioEl.hidden = top3.length === 0;
  }

  function renderResto(resto) {
    listaRestoEl.innerHTML = '';
    if (resto.length === 0) {
      seccionRestoEl.hidden = true;
      return;
    }
    seccionRestoEl.hidden = false;
    resto.forEach(function (persona, i) {
      listaRestoEl.appendChild(crearTarjetaResto(persona, i + 4));
    });
  }

  function render(data) {
    var registros = (data || []).filter(CC.esRegistroValido);
    var ordenados = CC.ordenarPagadores(registros);

    if (ordenados.length === 0) {
      setEstado('Todavía no hay pagadores registrados. ¡Sé el primero en aparecer aquí!', 'vacio');
    } else {
      setEstado(null);
    }

    renderPodio(ordenados.slice(0, 3));
    renderResto(ordenados.slice(3));
  }

  function init() {
    setEstado('Cargando ranking…', 'info');
    podioEl.hidden = true;
    seccionRestoEl.hidden = true;

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
        renderPodio([]);
        renderResto([]);
      });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
