/**
 * theme.js — control de tema claro/oscuro compartido entre index.html y editor.html.
 * El tema en sí ya se aplica lo antes posible mediante un script inline en <head>
 * de cada página (evita parpadeo). Este archivo solo gestiona el botón de alternancia.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'theme';

  function prefiereOscuro() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    } catch (err) {
      return false;
    }
  }

  function leerGuardado() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      return null;
    }
  }

  function guardar(tema) {
    try {
      localStorage.setItem(STORAGE_KEY, tema);
    } catch (err) {
      /* almacenamiento no disponible (modo privado, cuotas, etc.): el tema
         seguirá funcionando en esta sesión, solo no se recordará. */
    }
  }

  function temaInicial() {
    var guardado = leerGuardado();
    if (guardado === 'light' || guardado === 'dark') return guardado;
    return prefiereOscuro() ? 'dark' : 'light';
  }

  function aplicar(tema) {
    document.documentElement.dataset.theme = tema;
  }

  function actualizarBoton(boton, tema) {
    if (!boton) return;
    var esOscuro = tema === 'dark';
    var etiqueta = esOscuro ? 'Activar tema claro' : 'Activar tema oscuro';
    boton.setAttribute('aria-label', etiqueta);
    boton.setAttribute('title', etiqueta);
    boton.setAttribute('aria-pressed', String(esOscuro));
    // Se usa setAttribute/removeAttribute en vez de la propiedad .hidden:
    // en SVGElement esa propiedad no siempre refleja el atributo "hidden".
    var iconoSol = boton.querySelector('.icono-sol');
    var iconoLuna = boton.querySelector('.icono-luna');
    if (iconoSol) {
      if (esOscuro) iconoSol.removeAttribute('hidden');
      else iconoSol.setAttribute('hidden', '');
    }
    if (iconoLuna) {
      if (esOscuro) iconoLuna.setAttribute('hidden', '');
      else iconoLuna.removeAttribute('hidden');
    }
  }

  /** Conecta el botón de alternancia de tema. Debe llamarse una vez, cuando el botón exista en el DOM. */
  function inicializarBotonTema(boton) {
    if (!boton) return;
    var actual = document.documentElement.dataset.theme || temaInicial();
    actualizarBoton(boton, actual);

    boton.addEventListener('click', function () {
      var temaActual = document.documentElement.dataset.theme;
      var siguiente = temaActual === 'dark' ? 'light' : 'dark';
      aplicar(siguiente);
      guardar(siguiente);
      actualizarBoton(boton, siguiente);
    });
  }

  global.CasaCampoTema = {
    STORAGE_KEY: STORAGE_KEY,
    temaInicial: temaInicial,
    aplicar: aplicar,
    inicializarBotonTema: inicializarBotonTema
  };
})(window);
