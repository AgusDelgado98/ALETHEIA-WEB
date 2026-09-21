# Design Freeze · REGISTRO + FOLIO

**Estado:** dirección visual congelada por decisión del autor. **Alcance de este documento:** registrar el conflicto con el Design Charter v1.2 y el estado del prototipo. Este rediseño es una **nueva dirección visual deliberada**, no una desviación silenciosa.

`governance/ALETHEIA-WEB-DESIGN-CHARTER.md` (v1.2, FROZEN, INV-14) **no se modifica** en este paso. Hasta que se apruebe una enmienda, este documento es la referencia del rediseño y el Charter sigue vigente para todo lo que este documento no reemplaza.

## Identidad aprobada

ALETHEIA se siente como **abrir un archivo de investigación**: el **Registro** (las 18 research questions como filas tipadas con su estado epistemológico) y el **Folio** (el expediente de la pregunta seleccionada). La unidad principal es una pregunta tipada, no una tarjeta. La experiencia de escritorio es viewport-first: el scroll global no es la arquitectura primaria; el scroll vive dentro de paneles.

## Qué se conserva del Charter

| Principio | Charter |
|---|---|
| Paleta (`--paper`, `--ink`, `--graphite`, `--hair`, verdigris solo para abrir/activo) | §3.1, §10 |
| Tipografías: Newsreader (ideas y preguntas), Instrument Sans (lectura), IBM Plex Mono (IDs y procedencia) | §3.2 |
| Estados epistemológicos por **forma** (hilo, cuadrado, corte, punteado, rayado), nunca por color; las marcas `MapState`/`EvidenceState` y su gramática | §8, §20.4 |
| Los seis glifos y su regla de ir siempre acompañados de texto | §7 |
| Estructura por filetes de 1 px; sin sombras, gradientes, colores nuevos, fotos ni ilustraciones decorativas | §3.3, §14 |
| Dos capas de estado (pregunta / afirmación) que nunca se mezclan | §20.3 |
| Accesibilidad como restricción (foco visible, `prefers-reduced-motion`, no depender del color) | §13, §15 |
| El contenido se lee sin JavaScript (INV-13): el prototipo tiene 0 JS | Architecture §4 |
| Copy y contenido científico: ninguna palabra editorial se cambia | Editorial Contract |

## Qué se reemplaza y por qué

| Principio del Charter | Reemplazo | Motivo |
|---|---|---|
| §3.3 «Mucho espacio. Densidad inicial baja.» | Grilla base de 4 px, pocos niveles de padding, filas de 24–30 px | La baja densidad obliga a 5–10 pantallas de scroll y esconde la estructura: la Home medía ~7.700 px a 1366×768 y las 18 preguntas ocupaban ~3.500 px. |
| §14 «el riel lateral fue retirado» | El **Registro** es un panel lateral persistente | El Registro no es navegación adicional: es la propia lista de preguntas, siempre visible junto al Folio. |
| §11.2 «Preguntas como puertas» (la pregunta grande, sola, en serif de 46 px) | Preguntas como filas tipadas de una línea; pregunta de 20–22 px en el Folio | La pregunta a 46 px ocupaba ~255 px y dejaba el estado a ~500 px de distancia. El estado debe estar pegado a la pregunta. |
| §4 La Apertura y §18.1 el hero de la Home | Carátula mínima en el Folio cuando no hay pregunta seleccionada | La Home deja de ser una landing; la primera pantalla ya es la herramienta. |
| §11.4 Mapa de preguntas como página larga | El Registro (índice persistente) | Ídem: escaneable de un vistazo. |
| Navegación Hallazgos · Explorar · Límites · Método · Sobre | Registro · Límites · Documentos (Método, Versiones, Sobre) | Hallazgos y Explorar se integran en el Registro. **Solo el header cambia en este prototipo**; las páginas viejas siguen existiendo. |

## Alcance del prototipo (esta rama)

- Nuevo shell global (`Shell`, `ShellBar`, `StatusBar`), `Registro`, `Caratula`, `Folio`, `TrailRow` y `StateMark`.
- `/` → Registro + carátula. `/labor/preguntas/q-0003` → Registro + Folio de Q-0003 (URL canónica sin cambios).
- Las otras 17 preguntas, `/limites`, `/metodo`, `/versiones`, `/sobre`, `/hallazgos` y `/explorar` **siguen con la UI anterior** para poder comparar los dos lenguajes.
- Responsive: escritorio (≥ 64 rem de ancho y ≥ 34 rem de alto) usa la grilla de `100dvh`; por debajo degrada a documento normal Registro → Folio. No hay `overflow:hidden` global.
- Cadenas nuevas de interfaz (códigos de estado `OBS/REF/INS/NID/BLQ/ABI`, etiquetas del shell y de las vistas): están en `editorial/site/ui.yml`, selladas como `PENDING_AUTHOR_REVIEW`. No se aprobó nada.
- Títulos cortos del Registro: son los títulos ya auditados de cada ficha (`finding.title` o glosa pública); no se creó texto editorial.

## Impacto conocido en tests y gates (no se relajó nada)

- **Gates:** todos los técnicos pasan. G-OD-14 sigue abierto (falta la revisión independiente). G-LEG-03 aparece como `REVIEW INVALIDATED BY DRIFT` porque cambió material sujeto a revisión (`src/`, `editorial/`); el pin de WEB-2 **no se actualiza** en esta rama.
- **Tests que codifican el estado de WEB-2 (pin/recuentos):** `tests/reviews.test.ts` (recuentos 368/350 y pin) y el chequeo de gates de release en `tests/gates.test.ts` fallan por diseño en esta rama, por el mismo motivo.
- **Tests que codifican el DOM de la Home vieja:** `tests/web1.test.ts` — «Home muestra 5 destacadas y 13 restantes» exige `data-featured` / `data-remaining` en `/`, y «aviso legal visible; cierre congelado en versiones» exige el commit completo y «CLOSED / FROZEN» en `/`. La Home nueva no tiene esas secciones (el commit abreviado y «Corpus congelado» están en la barra de estado). Se ajustarán cuando se apruebe el prototipo, no antes.

## Ronda de refinamiento (única, antes de la aprobación visual)

- **Lectura completa:** ya no se marca con peso 500. Las cinco filas (`data-tier="A"`) tienen el mismo peso y color que las demás y llevan un segundo filete fino de 1 px en el margen izquierdo de la fila. La leyenda del Registro lo explica como «lectura completa» (cadena `key_full_reading`, `PENDING_AUTHOR_REVIEW`). No es un estado epistemológico ni una jerarquía de evidencia. Para lectores de pantalla, esas filas anuncian «lectura completa».
- **Códigos de estado:** se conservan `OBS/REF/INS/NID/BLQ/ABI`. La leyenda completa (glifo + código + denominación) sigue visible dentro del Registro; la altura de fila ahora es continua (22–30 px según el alto del viewport) para que entren 18 filas y la leyenda completa sin scroll propio desde ~650 px de alto.
- **Folio en pantallas bajas:** cabecera compacta (ID + régimen + estado en una línea; alcance con la etiqueta en línea; cota estrictamente horizontal; pestañas compactas) y **un único scroll interno del Folio** (las pestañas quedan fijas arriba). A 1366×650 la zona útil de la vista activa pasó de ~180 px a ~236 px. Sin scroll global en 1366×650, 1366×768 ni 1920×1080.
- **Títulos truncados:** se permiten en el prototipo (una línea con puntos suspensivos). Reporte, sin aprobar nada: `REGISTRO-TITLES-REPORT.md`.
- **Documentos:** sigue apuntando a `/metodo` (UI vieja) a propósito. **Período:** no se agregó a la cota; sigue dentro de Alcance.
- Límite conocido: por debajo de ~630 px de alto el Registro deja de entrar completo y su lista scrollea (fila mínima de 22 px).

## Incompatibilidades esperadas del prototipo (siete fallos de tests, no se relajó ningún gate)

1. `tests/gates.test.ts` — «los técnicos no fallan; solo G-OD-14 permanece FAIL/OPEN…» (G-LEG-03 invalidado por drift del pin).
2. `tests/reviews.test.ts` — «el pin está atado al commit WEB-2 y los hashes coinciden».
3. `tests/reviews.test.ts` — «G-OD-14 PENDING no pasa; G-LEG-02 y G-LEG-03 cerrados sí».
4. `tests/reviews.test.ts` — «18 public_question APPROVED; 350 PENDING_AUTHOR_REVIEW…» (recuentos de WEB-2).
5. `tests/reviews.test.ts` — «368 textos: la suma de veredictos es exacta».
6. `tests/web1.test.ts` — «Home muestra 5 destacadas y 13 restantes…» (`data-featured`/`data-remaining`).
7. `tests/web1.test.ts` — «aviso legal visible; cierre congelado en versiones» (commit completo y «CLOSED / FROZEN» en `/`).

Se resuelven al aprobar el prototipo (adaptar Home tests, actualizar pin de revisión), no antes.

## Decisiones visuales que requieren revisión humana

1. Marca de «lectura completa» (segundo filete en el margen): ¿alcanza y es suficientemente discreta?
2. Códigos de estado de tres letras (`OBS`, `REF`, …) junto a la marca: ¿son legibles sin la leyenda?
3. Altura útil del Folio a 1366×650 (~236 px con un único scroll interno): ¿suficiente?
4. Los títulos largos de las cinco fichas destacadas se truncan con puntos suspensivos en el Registro.
5. «Documentos» apunta por ahora a `/metodo` (la UI vieja).
6. La cota no muestra período porque el corpus no lo expone como dato estructurado: sigue dentro del texto de Alcance.
