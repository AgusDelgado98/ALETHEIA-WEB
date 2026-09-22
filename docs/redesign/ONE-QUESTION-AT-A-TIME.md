# ONE QUESTION AT A TIME

**Estado:** dirección visual aprobada. Reemplaza, para `/`, las 18 preguntas, `/metodo`, `/sobre`, `/versiones`
y `/cierre`, al prototipo Registro + Folio documentado en `REGISTRO-FOLIO-DESIGN-FREEZE.md`.

## El principio

La web no debe mostrar las 18 preguntas, todos los estados, IDs y detalles técnicos al mismo tiempo. La entrada
es simple; el usuario elige una pregunta; esa pregunta ocupa toda la interfaz; los detalles técnicos aparecen
por capas (`Presentar → Profundizar → Auditar`), no todos juntos.

## Arquitectura

- **`/` (Home):** una pantalla — ALETHEIA se presenta, explica qué investigó y enuncia el principio de decir
  solo lo que la evidencia permite sostener. La acción principal («Comenzar») abre Q-0003; el selector queda
  como acceso secundario. Sin las 18 preguntas desplegadas, sin IDs, sin leyenda de estados.
- **Selector de preguntas:** un overlay (`src/components/QuestionPicker.astro`), 0 JavaScript: un checkbox
  (`#picker-toggle`, oculto pero enfocable) + `<label for="picker-toggle">` en cualquier parte del documento lo
  abre o lo cierra, incluido el fondo del propio overlay (backdrop = label). Lista las 18 preguntas por régimen
  A/B/C; cada fila muestra únicamente número, título corto y la marca de estado compacta (forma, no color;
  Charter §8) — sin código de tres letras, sin leyenda, sin IDs de claim ni de raíz. El usuario elige cualquier
  pregunta directamente (Q1 → Q8 → Q3 sin recorrer las anteriores).
- **Las 18 preguntas (`labor/preguntas/[id].astro`, URLs sin cambios):** cada pregunta ocupa toda la interfaz.
  Las fichas completas muestran su desarrollo y las mínimas declaran honestamente que no registran uno adicional.
  - Primer nivel, siempre visible: progreso («Pregunta 03 de 18»), pregunta completa, estado epistemológico
    (forma, `MapState`) y respuesta efectiva.
  - Cambiar de pregunta: anterior/siguiente (a la pregunta contigua en el orden del ledger) y un disparador
    «Cambiar pregunta» que abre el mismo selector — no hay una lista de 18 permanentemente en pantalla.
  - Segundo nivel, una vista a la vez: **Respuesta**, **Evidencia**, **Límites** y **Procedencia**. La respuesta
    principal no tiene scroll interno; cuando existe desarrollo largo, «Ver desarrollo completo» abre un panel
    amplio. Los identificadores técnicos solo aparecen en Procedencia. Si el corpus no registra una URL original,
    la interfaz lo dice y no inventa un enlace.
  - El recorrido conecta las 18 preguntas en el orden del ledger y termina en Cierre. El selector permite saltar
    a cualquier pregunta sin mantener la lista visible durante la lectura.
- **`/metodo`, `/sobre` y `/versiones`:** documentos limpios en el lenguaje visual nuevo, sin Registro permanente
  y con un regreso claro a la investigación.
- **`/cierre`:** cierre reflexivo con síntesis del alcance desigual de la evidencia y acciones para volver a
  explorar, revisar metodología o abrir fuentes y procedencia.

## JavaScript

**0 JavaScript.** El selector y las cuatro vistas de las preguntas son checkbox/radio + `<label>`; el movimiento
(apertura del selector, cambio de vista) es transición y animación CSS (`opacity`, `transform`), no JS. Se
evaluó agregar unos KB de JS para mejorar el foco y el bloqueo de scroll del overlay, pero el patrón
CSS-only ya cubre la interacción completa (abrir, cerrar por el fondo, cerrar por «✕», recorrer con teclado) sin
sacrificar que el sitio se lea y se use sin JavaScript (Charter, invariante conservada). Falta, sin JS: cerrar
el selector con Escape (funciona con clic en el fondo o en «✕»).

## Reutilización (sin tocar contenido)

`SingleFolio.astro` reutiliza tal cual `TrailRow`, `MapState`, `Glyph`, `SegmentText` y la lógica de
fuente/licencia del Folio anterior: ningún texto de investigación, claim, estado o límite cambió. Lo único
nuevo es texto de navegación y cierre en `editorial/site/ui.yml`, auditado igual que el resto
(`PENDING_AUTHOR_REVIEW`).

## Qué falta (deliberadamente, esta ronda no lo hace)

- `/explorar`, `/hallazgos`, `/limites` y `/404` siguen con el shell anterior; no formaron parte de esta ronda.

## Tests y gates (nada relajado)

- `tests/registro-folio.test.ts` y `tests/web1.test.ts` se actualizaron: las aserciones que asumían que Home
  tenía el Registro completo, o que Q-0003 usaba el shell viejo, ahora prueban la arquitectura nueva
  (selector oculto pero presente, IDs solo en Procedencia salvo la cita en el Rastro, etc.).
- El material de revisión cambió (`src/`, `editorial/`, `public/`): el paquete de revisión se **re-fijó con el
  mecanismo canónico** (`tools/reviews`, `npm run reviews:build`) sobre el commit técnico aprobado.
  **G-OD-14 sigue abierto** (falta la revisión humana independiente); no se falsificó ninguna revisión humana
  ni legal. G-LEG-02 y G-LEG-03 pasan.

## Decisiones que requieren revisión humana

1. ¿La marca de estado compacta en el selector (forma sin código de tres letras) es legible sin la leyenda?
2. Confirmar el tratamiento compacto de las cuatro capas en móvil y el panel amplio de desarrollo.
3. El disparador «Cambiar pregunta» vive en la barra superior; no hay un enlace «← Preguntas» separado (se
   consideró redundante con el disparador). ¿Alcanza?
4. Confirmar que reutilizar la página de Versiones como «procedencia general» en los enlaces secundarios de la
   Home es la intención correcta (no hay URL de GitHub registrada en el corpus).
