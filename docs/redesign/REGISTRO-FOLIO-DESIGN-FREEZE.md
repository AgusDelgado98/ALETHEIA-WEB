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

## Decisiones visuales que requieren revisión humana

1. Título en negrita (peso 500) para las cinco preguntas con lectura completa: es un destaque editorial, no epistémico; ¿alcanza o preferís otra marca?
2. Códigos de estado de tres letras (`OBS`, `REF`, …) junto a la marca: ¿son legibles sin la leyenda?
3. Altura del primer nivel del Folio en pantallas bajas (a 1366×650 quedan ~180 px para la vista activa).
4. Los títulos largos de las cinco fichas destacadas se truncan con puntos suspensivos en el Registro.
5. «Documentos» apunta por ahora a `/metodo` (la UI vieja).
6. La cota no muestra período porque el corpus no lo expone como dato estructurado: sigue dentro del texto de Alcance.
