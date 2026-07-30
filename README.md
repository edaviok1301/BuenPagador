# BuenPagador — Casa de Campo Fin de Año 🎄

Página estática para mostrar el ranking de quienes pagaron su cuota para la casa de campo de fin de año. Publicada con **GitHub Pages**, sin backend, sin base de datos y sin build.

- `index.html` — página **pública**: carga `data/pagadores.json`, calcula el ranking por fecha de pago y muestra el podio (top 3) + el resto de participantes.
- `editor.html` — página de **edición visual**: permite crear, editar, eliminar, duplicar y ordenar participantes, y genera el JSON final para copiar/descargar. **No modifica nada en GitHub automáticamente.**

## Estructura del proyecto

```text
BuenPagador/
├── index.html
├── editor.html
├── css/
│   ├── styles.css
│   └── editor.css
├── js/
│   ├── shared.js     # lógica compartida (ranking, fechas, validaciones)
│   ├── index.js       # lógica de la página pública
│   └── editor.js       # lógica del editor
├── data/
│   └── pagadores.json
├── photo/
│   └── default.webp
├── .nojekyll
└── README.md
```

## Formato de `data/pagadores.json`

```json
[
  {
    "nombre": "Juan Pérez",
    "foto": "photo/juan-perez.webp",
    "fechaPago": "2026-07-30T09:15:00-05:00"
  }
]
```

- `nombre`: texto mostrado en la web.
- `foto`: ruta relativa dentro del repo (`photo/archivo.webp`) o URL externa (`https://...`). Si falta, está vacía o no carga, se usa automáticamente `photo/default.webp`.
- `fechaPago`: fecha y hora **exactas** del pago, en formato ISO 8601 con la zona horaria de Lima, Perú (`-05:00`). Ejemplo: `2026-07-30T15:42:00-05:00`.

El ranking se calcula **exclusivamente** con `fechaPago` (el orden físico dentro del archivo no importa). Los registros con fecha inválida no rompen la página: se muestran al final con un aviso de "Fecha por corregir".

## Flujo de actualización (manual, sin backend)

```text
1. Abrir editor.html (local o publicado en GitHub Pages)
   → carga automáticamente data/pagadores.json
2. Crear, editar, eliminar o duplicar participantes
3. Revisar el ranking calculado en tiempo real
4. Copiar el JSON o descargar pagadores.json
5. Reemplazar manualmente data/pagadores.json en el repositorio
6. Confirmar (commit + push) los cambios en GitHub
7. GitHub Pages actualiza automáticamente index.html
```

### Paso a paso detallado

1. **Crear o clonar el repositorio** (privado) en GitHub y clonarlo localmente.
2. **Agregar fotografías** a la carpeta `photo/` (formato `.webp` recomendado, aunque cualquier imagen web funciona) o usar URLs externas `https://...`.
3. **Editar los participantes** abriendo `editor.html` en el navegador:
   - Si lo abres directamente desde tu computadora (`file://`), la carga automática de `data/pagadores.json` puede fallar por restricciones del navegador. En ese caso usa **"Importar archivo .json"** o **"Pegar JSON manualmente"** — el editor sigue funcionando igual.
   - También puedes servir la carpeta con un servidor local simple (por ejemplo `npx serve` o `python -m http.server`) para que la carga automática funcione como en producción.
4. **Copiar o descargar el JSON resultante** con los botones al final del editor.
5. **Reemplazar** el contenido de `data/pagadores.json` en tu copia local del repositorio con el JSON generado.
6. **Confirmar los cambios en GitHub**:
   ```bash
   git add data/pagadores.json photo/
   git commit -m "Actualizar pagadores"
   git push
   ```
7. **Activar GitHub Pages** (una sola vez): en el repositorio ve a `Settings → Pages`, selecciona la rama (`main`) y la carpeta raíz (`/`) como origen, y guarda.
8. **Verificar la página pública**: entra a `https://usuario.github.io/nombre-repositorio/` y confirma que el ranking se actualizó.

## Notas técnicas

- HTML5 + CSS3 + JavaScript puro. Sin frameworks, sin dependencias externas, sin proceso de compilación.
- Todas las rutas son relativas (`./data/...`, `./photo/...`, `./css/...`, `./js/...`) para funcionar correctamente cuando el sitio se publica bajo una subruta como `usuario.github.io/repo/`.
- El editor **nunca** escribe en el repositorio ni usa la API de GitHub: solo trabaja en memoria del navegador y te entrega el JSON para que tú lo reemplaces manualmente.
- Si cierras o recargas `editor.html` con cambios sin copiar/descargar, el navegador mostrará una advertencia antes de salir.
- No se almacenan montos, documentos de identidad, teléfonos, contraseñas ni secretos en ningún archivo.
