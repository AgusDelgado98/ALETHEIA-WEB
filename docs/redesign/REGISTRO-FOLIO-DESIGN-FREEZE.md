# Design Freeze · REGISTRO + FOLIO

**Estado:** dirección visual congelada por decisión del autor. **Alcance de este documento:** registrar el conflicto con el Design Charter v1.2 y el estado del rediseño (prototipo aprobado visualmente, migración completa). Este rediseño es una **nueva dirección visual deliberada**, no una desviación silenciosa.

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
| El contenido se lee sin JavaScript (INV-13): el sitio tiene 0 JS | Architecture §4 |
| Copy y contenido científico: ninguna palabra editorial se cambia | Editorial Contract |

## Qué se reemplaza y por qué

| Principio del Charter | Reemplazo | Motivo |
|---|---|---|
| §3.3 «Mucho espacio. Densidad inicial baja.» | Grilla base de 4 px, pocos niveles de padding, filas de 24–30 px | La baja densidad obliga a 5–10 pantallas de scroll y esconde la estructura: la Home medía ~7.700 px a 1366×768 y las 18 preguntas ocupaban ~3.500 px. |
| §14 «el riel lateral fue retirado» | El **Registro** es un panel lateral persistente | El Registro no es navegación adicional: es la propia lista de preguntas, siempre visible junto al Folio. |
| §11.2 «Preguntas como puertas» (la pregunta grande, sola, en serif de 46 px) | Preguntas como filas tipadas de una línea; pregunta de 20–22 px en el Folio | La pregunta a 46 px ocupaba ~255 px y dejaba el estado a ~500 px de distancia. El estado debe estar pegado a la pregunta. |
| §4 La Apertura y §18.1 el hero de la Home | Carátula mínima en el Folio cuando no hay pregunta seleccionada | La Home deja de ser una landing; la primera pantalla ya es la herramienta. |
| §11.4 Mapa de preguntas como página larga | El Registro (índice persistente) | Ídem: escaneable de un vistazo. |
| Navegación Hallazgos · Explorar · Límites · Método · Sobre | Registro · Límites · Documentos (Método, Versiones, Sobre) | Hallazgos y Explorar se integran en el Registro: siguen existiendo como vistas del Registro (mismas URLs). |

## Alcance de la migración (rama `redesign/registro-folio`)

- Un solo shell (`Shell`, `ShellBar`, `StatusBar`) con `Registro`, `Caratula`, `Folio`, `DocPanel`, `TrailRow` y `StateMark`. La UI anterior (`Base`, `SiteNav`, `SiteFooter`, `QuestionEntry`, `QuestionHeader`, `EvidenceTrail`, `ProvenanceDetails`, `WhatWeCanSay`, `WhatThisDoesNotMean`, `Frame`) se eliminó: no queda ninguna página con el lenguaje viejo.
- `/` → Registro + carátula. Las **18** preguntas (`/labor/preguntas/q-0001` … `q-0018`, URLs sin cambios) → Registro + Folio con la pregunta seleccionada y los seis estados (OBS, REF, INS, NID, BLQ, ABI).
- `/explorar`, `/hallazgos`, `/limites`, `/metodo`, `/versiones`, `/sobre` y `/404` → Registro persistente + panel de documento (`DocPanel`): barra de documentos con enlaces reales, cabecera compacta y un único scroll interno. Ningún texto se cambió; solo la presentación.
- Navegación superior: **Registro** (Home, las 18 preguntas, Explorar y Hallazgos), **Límites** y **Documentos** (→ `/metodo`; Método, Versiones y Sobre se alcanzan desde la barra de documentos).
- Escritorio (≥ 64 rem de ancho y ≥ 34 rem de alto): grilla de `100dvh`, sin scroll global; el scroll vive en el Folio o en el panel de documento. Móvil: Registro → Folio, documento normal.
- 0 JavaScript: las cuatro vistas del Folio son radios + labels.

### Folio de las fichas mínimas (13 preguntas sin lectura completa)

El corpus no tiene texto editorial largo para ellas y **no se inventó ninguno**. El Folio muestra únicamente lo que ya es público y auditado:

- cabecera: ID, régimen, «Ficha mínima», resolución, pregunta pública, título público (glosa) y el título canónico en inglés como cita;
- **Lectura:** resolución de la pregunta (y «Ausencia, no resultado negativo» cuando corresponde);
- **Evidencia:** cada claim con su estado y su fuente (con la glosa de fuente si existe), o «Sin claim: no hay Rastro de claim.»;
- **Límites:** los resultados preservados y las relaciones de gobernanza que tocan a esa pregunta, con enlace a `/limites`; si no hay ninguno, el texto general de Límites;
- **Procedencia:** igual que las fichas completas (la fila «Raíz de evidencia» se omite si el corpus no la expone para la ficha).

Consecuencia visible y deliberada: esas vistas son cortas. No se rellenan.

### Títulos cortos de navegación

Los 18 títulos del Registro son texto editorial nuevo (`nav_titles` en `editorial/site/glosses.yml`), derivado de la pregunta pública, de una línea y sin truncamiento a 1366 px. Están sellados como `PENDING_AUTHOR_REVIEW`: **su aprobación es una decisión humana** (ver `REGISTRO-TITLES-REPORT.md`). La pregunta completa y el título de la ficha no se modificaron.

## Ronda de refinamiento previa a la aprobación visual

- **Lectura completa:** no se marca con peso; las cinco filas llevan un segundo filete fino de 1 px en el margen izquierdo, explicado en la leyenda del Registro como «lectura completa» (cadena `key_full_reading`, `PENDING_AUTHOR_REVIEW`). No es un estado epistemológico ni una jerarquía de evidencia. Los lectores de pantalla anuncian «lectura completa» en esas filas.
- **Códigos de estado:** se conservan `OBS/REF/INS/NID/BLQ/ABI`; la leyenda completa (glifo + código + denominación) sigue visible en el Registro. La altura de fila es continua (22–30 px) para que entren 18 filas y la leyenda sin scroll propio desde ~650 px de alto.
- **Folio en pantallas bajas:** cabecera compacta, cota horizontal y un único scroll interno del Folio (pestañas fijas). A 1366×650, la zona útil de la vista activa de Q-0003 pasó de ~180 a ~236 px.
- **Documentos:** «Documentos» apunta a `/metodo`. **Período:** no se agregó a la cota; sigue dentro de Alcance.
- Límite conocido: por debajo de ~630 px de alto el Registro deja de entrar completo y su lista scrollea (fila mínima de 22 px).

## Estado de tests y gates

- Los tests que codificaban el DOM viejo (`data-featured`, `data-remaining`, commit completo y «CLOSED / FROZEN» en la Home) se **actualizaron** al DOM nuevo; no se restauró la UI anterior ni se relajó ningún gate. `scripts/e2e/run.ts` se reescribió para el shell nuevo (axe en cada vista, teclado, sin JS, reflow, un solo scroll interno).
- El material de revisión cambió (`src/`, `editorial/`): el paquete de revisión se **re-fijó con el mecanismo canónico** (`tools/reviews`, `npm run reviews:build`) sobre el nuevo commit técnico. **G-OD-14 sigue abierto** (falta la revisión humana independiente); no se falsificó ninguna revisión humana ni legal.

## Decisiones visuales que requieren revisión humana

1. Marca de «lectura completa» (segundo filete en el margen): ¿alcanza y es suficientemente discreta?
2. Códigos de estado de tres letras (`OBS`, `REF`, …): ¿son legibles con la leyenda visible?
3. Las vistas de las fichas mínimas son cortas por diseño: ¿se acepta o se prefiere una vista única?
4. Aprobación de los 18 títulos cortos de navegación (`PENDING_AUTHOR_REVIEW`).
