# ADR · WEB3-01 — Figures en ALETHEIA Web (WEB-3)

| | |
|---|---|
| **Estado** | **APROBADO para implementación** (2026-09-21), bajo las decisiones registradas en §9. |
| **Decisión** | Habilitar Figures de tipo texto (`CLAIM_TEXT` con segundo testigo en evidencia vigente), con doble testigo verificado en build, sin ninguna derivación numérica, y refinar `G-FIG-03` y `G-FIG-05` únicamente en lo necesario para que una Figure válida pueda mostrarse. |
| **Fecha** | 2026-09-21 |
| **Fase / rama** | WEB-3 · rama `web-3`. `main` y la producción actual no cambian. |
| **Resuelve (parcialmente)** | `OD-16` (sintaxis de `figure_id`, directiva, `period`, lint numérico) y `OD-18` (origen de las cifras de `CLM-0002`), abiertas por diseño en `WEB-0-DECISION-LOG.md` para WEB-1. |
| **Relación con WEB-0 / Charter** | **Implementa** el Data Contract §9 (congelado). **No lo enmienda.** Refina dos gates implementados en `scripts/gates/gates.ts`; los textos de `governance/` no se editan (siguen byte-idénticos a `SHA256SUMS.txt`). Misma vía que OD-01: un ADR, no una edición silenciosa. |
| **Evidencia** | [`docs/web-3/FIGURES-AUDIT.md`](../web-3/FIGURES-AUDIT.md) · detector reproducible `npm run figures:audit` (`tools/figures/audit.ts`, solo lectura) |

---

## 1. Por qué WEB-3 necesita Figures

El objetivo de WEB-3 es que un visitante pueda **recorrer un resultado hacia atrás** y entender cómo se obtuvo. Para los siete claims estadísticos del corpus, el resultado *es* una cifra registrada. Sin Figures, el recorrido queda limitado a decir «creció de forma distinta» donde el corpus dice cuánto, sobre qué población, en qué período y contra qué umbral.

WEB-1 eligió publicar **0 Figures** («el corpus de este corte no trae una cifra estructurada adecuada y no se fabrica ninguna», `G-FIG-01`). Esa decisión fue correcta *para WEB-1* y sigue siendo correcta para `main`. El Data Contract §9 ya prevé la vía para publicar cifras (§9.2.4: «figuras solo de texto se permiten en V1 si el valor figura textualmente en dos testigos (claim + evidencia)»); WEB-1 no la implementó. Este ADR la implementa, con las restricciones de abajo.

Un principio previo no se toca: **ninguna cifra sustantiva publicada puede existir solo como texto editorial** (Data Contract §9, D-006). Toda cifra visible es la renderización de una Figure del corpus.

## 2. Estado previo que se preserva

| Se preserva | Cómo |
|---|---|
| `governance/` (Charter v1.2, WEB-0 v1.0) | Sin ediciones. `governance.test.ts` sigue verificando `SHA256SUMS.txt` |
| `corpus-src/`, `pins/`, `corpus-pins/` | Sin cambios. **No se agrega ningún archivo al pin** (ver §7, Vía S) |
| `main` y producción | Intactos. Todo ocurre en `web-3` con preview de Vercel |
| Pin de revisión humana de WEB-2 (`1dbfbe7`) | Sin tocar en `main` |
| Los 88 + 8 gates | Ninguno se elimina. Dos se refinan (§5). Los demás no cambian |
| Regla «sin aritmética en la capa web» | Se mantiene íntegra (§3, D3). Lo que se corrige es un regex demasiado amplio, no el principio |
| Estados epistemológicos, límites, `public_question` | Sin cambios |
| Reversibilidad | Si este ADR se rechaza, WEB-3 sale con `Evidence Chain` únicamente. No hay dependencia de Figures en el resto del diseño |

## 3. Decisión

### D1 · Qué es una Figure admisible

> **Principio fijado:** una cifra solo puede publicarse como Figure si existe como magnitud registrada en dos testigos vigentes y compatibles del corpus. No alcanza con que aparezca el mismo número: debe coincidir el contexto semántico.

Una cantidad registrada en el corpus (porcentaje, diferencia en puntos porcentuales, conteo de un par «N de M») es una **Figure admisible** solo si cumple **todas** estas condiciones. Si falla una, no se publica; no se «aproxima».

1. **Testigo A** — figura textualmente en `CLAIM_TEXT` del claim.
2. **Testigo B** — figura textualmente en `RESULT` de una evidencia **vigente** del mismo claim. Una evidencia reemplazada (`claim_supersessions`, p. ej. `LAB-EVD-0015`) **no es testigo**. Coincidir con una evidencia reemplazada no cuenta y se reporta como rechazo.
3. **Igualdad exacta** de magnitud y unidad entre A y B, comparada como cadena normalizada (sin coma de miles). Nunca por tolerancia numérica.
4. **Misma cantidad, no solo el mismo número.** Ambos testigos atribuyen el valor al mismo objeto/métrica **y al mismo período**. Si un testigo lo describe como el extremo de un rango o lo aproxima («roughly», «approximately», «up to»), la Figure se rechaza.
5. **Signo consistente.** El signo lo fija el testigo que lo registra explícitamente (`+` / `−`). El otro testigo puede darlo por verbo (`fell`, `rose`, `grew`) y debe ser coherente. Un signo inferido sin ningún testigo explícito se rechaza.
6. **Contexto declarado, no inferido.** El emparejamiento se hace con una entrada explícita `figure_specs` en `modules/labor.contract.json` (una expresión regular por testigo, mismo patrón que `anchor_specs`). Si el build no encuentra un testigo, o los dos discrepan, **el build falla** (no degrada).

Un emparejamiento que dependa de **orden posicional** en la frase («A y B en esos mismos trimestres») se marca `pairing: POSITIONAL` y exige una firma humana explícita en el reporte (`G-FIG-06`). No se habilita en la primera ola.

### D2 · Qué queda prohibido

- Sumar, restar, promediar, ponderar, redondear o convertir unidades. `display` solo da formato (`es-AR`, `−` tipográfico, coma decimal); **nunca cambia la cantidad de decimales** respecto del testigo.
- Reconstruir un numerador, denominador, fórmula o brecha que el corpus no registre; inferir numeradores o denominadores. **Si una cifra calculada también está registrada explícitamente, es Figure por ese registro, no porque WEB-3 la haya calculado**: la brecha de `33,38 pp` de `CLM-0006` es admisible porque ambos testigos la registran, no porque se pueda restar.
- Parsear `RESULT` como fuente primaria (Data Contract §9.2.1). Solo se lo usa como segundo testigo de una cifra ya presente en el claim.
- Comparar magnitudes entre claims o mezclar nominal con real (`REL-PR-012`). Cada Figure lleva `nominal_real` y `stock_flow` y se muestra siempre junto a la cifra.
- Ninguna Figure en `<title>`, `<meta>`, Open Graph, JSON-LD ni atributos (`aria-label`, `title`). El texto accesible referencia a la cifra por `aria-describedby`, no la copia.
- Una cifra de un solo testigo, aunque sea correcta. Queda fuera hasta tener el segundo.

### D3 · Un ratio «N de M» solo si el corpus lo registra como par

Un numerador y un denominador se muestran **únicamente** cuando ambos figuran juntos («1,678,677 of 11,498,694») en los dos testigos. No se muestra fórmula (`× 100`, `÷`): el corpus de texto no la registra. El denominador arrastra su calificador registrado (p. ej. «suma analítica de LAB, nunca el total propio de SIPA», GOV-005) en el mismo bloque.

### D4 · Mecanismo (resuelve OD-16 y OD-18 para este alcance)

| Aspecto | Decisión |
|---|---|
| `figure_id` | `fig.<CLAIM_ID>.<key>` (mismo patrón que `anc.<CLAIM_ID>.<key>`), `id_origin: DERIVED` |
| Origen | `figure_specs` en `modules/labor.contract.json`. El generador extrae, verifica y falla si discrepan. `generated/labor/figures.json` es el resultado |
| `origin` | `CLAIM_TEXT` (con `witnesses[]` de claim y evidencia). `STRUCTURED_REPORT` **no** se usa (§7) |
| Directiva | `{{figure:<figure_id>}}` en la lista blanca (`G-EDI-07`). El editor nunca ve el valor (Data Contract §9.2.8, `G-FIG-02` intacto) |
| `period` | `{ start, end, granularity }` capturado por regex de **ambos** testigos, como las anclas |
| `OD-18` | Las cifras de `CLM-0002` tienen `origin: CLAIM_TEXT`. Los reportes archivados (`cgi-national-quarterly.json`) son series de niveles: no contienen el estadístico publicado |

### D5 · Clases numéricas, con marcado DOM distinto

Hoy `data-num="count"` es un cajón de sastre: mezcla conteos derivados del manifest con numerales de citas canónicas (`markAllNumerals`) y los tipos `anchor`, `version` y `table`. Se reemplaza por clases con semántica explícita. **El propósito no es relajar `G-FIG-05`, sino explicitar qué es cada numeral.**

| Clase | Marcado | Qué es | Regla |
|---|---|---|---|
| **Cifra de investigación** | `data-figure="<figure_id>"` | Figure publicada bajo Data Contract §9 | Autorizada solo por el artefacto generado (D6). **Único** elemento que puede contener `%` o `pp` |
| **Interfaz** | `data-num="ui"` | Numeral estrictamente de interfaz cuando esté permitido (p. ej. ordinal de un paso) | Entero. Nunca `%`, `pp`, decimal ni signo. Preferir `counter()` de CSS, que no entra al HTML |
| **Conteo autorizado** | `data-num="count"` | Conteo de interfaz derivado del manifest (p. ej. «18 preguntas») | Solo conteos autorizados. Entero |
| **Identificador** | `data-num="id"` | `LAB-CLM-0006`, versiones (`v1.0.0`) | Patrón cerrado (`TOKEN`). Absorbe los tipos anteriores `version` y `table` (nombres de cuadro) |
| **Fecha / período** | `data-num="date"` | `2026-Q1`, `2025-08-01` | Resuelve a un ancla con doble testigo. Reemplaza el tipo actual `anchor` |
| **Hash** | `data-num="hash"` | `ca6a85e…` | Hex de longitud fija |
| **Canónico** | `data-num="canon"` | Numeral dentro de texto canónico citado (`lang="en"`). Reemplaza el uso de `count` en `markAllNumerals` | Solo dentro de un `CanonicalCite` (`q[data-canonical-cite]`) y verbatim en el corpus generado. **No habilita** reutilizar una cifra canónica como Figure: una Figure necesita su propio contrato |

### D6 · `data-figure` no es una vía de escape

La autorización de una cifra en el HTML **viene del artefacto generado y validado, nunca del marcado**. Un elemento `data-figure` pasa `G-FIG-03`/`G-FIG-05` únicamente si, a la vez:

1. su valor es un `figure_id` presente en `generated/labor/figures.json`;
2. esa Figure tiene `status: ELIGIBLE`, existe en `figure_specs` y pasó la validación determinista de doble testigo en el build;
3. el texto del elemento es exactamente `display(value_raw, display)` de esa Figure;
4. la Figure corresponde al claim y a la evidencia configurados para la página donde aparece.

Por lo tanto `<span data-figure>123</span>`, `<span data-figure="fig.inventado">35,48 %</span>` o el texto correcto con el `figure_id` de otra cifra **fallan**. El gate no relaja `G-FIG-05` por defecto: la excluye únicamente dentro de elementos que cumplen las cuatro condiciones.

### D7 · `figure_specs`: declarativo y pequeño

Cada entrada de `figure_specs` en `modules/labor.contract.json` declara solo lo necesario para reconstruir *por qué* la cifra fue autorizada:

| Campo | Contenido |
|---|---|
| `key` | Sufijo del ID → `fig.<claim_id>.<key>` |
| `claim_id`, `question_id` | Claim y pregunta |
| `value_text` | Valor textual exacto tal como figura en el corpus (`+35.48%`) |
| `unit`, `sign` | `pct` \| `pp` \| `count`; `+` \| `-` \| `none` |
| `period` | `{ start, end, granularity }` |
| `object` | Qué se mide: `metric_key` + `object_ids` del claim; `nominal_real` y `stock_flow` |
| `witness_a`, `witness_b` | Puntero (`entity`, `field`) y expresión regular con un grupo de captura para el valor. Si el emparejamiento es posicional: `pairing: POSITIONAL` |
| `status` | `ELIGIBLE` \| `PENDING_REVIEW` \| `REJECTED` |
| `display` | Política de formato (`decimals`, `sign`) |

La magnitud normalizada se deriva de `value_text` en el generador; no se repite. Los rótulos, alcances y límites **no** se copian aquí: viven en el corpus y en `editorial/`.

### D8 · Estados

| Estado | Significado | ¿Llega a HTML? |
|---|---|---|
| `ELIGIBLE` | Doble testigo verificado en build; habilitada por la autoría | **Sí, como `data-figure`** |
| `PENDING_REVIEW` | Doble testigo verificado, pero requiere firma humana (`POSITIONAL` o granularidad) | **No** |
| `REJECTED` | Decisión registrada de no publicar | **No** |

Todo lo que no tiene una entrada `ELIGIBLE` está **rechazado por omisión**, aparezca o no en un texto libre. No existe mecanismo para forzar una Figure rechazada, ni para promover una `PENDING_REVIEW` sin un cambio versionado del contrato con firma. El generador solo materializa en `figures.json` las `ELIGIBLE`.

## 4. Elegibilidad por claim (resumen; detalle en la auditoría)

No se asume que los 7 claims estadísticos quedan habilitados. Resultado de la auditoría:

| Claim | Pregunta | Figures que satisfacen D1 | Rechazadas | Estado |
|---|---|---|---|---|
| `CLM-0006` | Q-0005 | 3: `+35,48 %` nominal · `+2,10 %` real · `33,38 pp` brecha | 6 cifras de insumo solo en la evidencia (medias en ARS, IPC, índice real): testigo único | **Ola 1** — `ELIGIBLE` |
| `CLM-0005` | Q-0004 | 3: `36,29 %` · `37,90 %` · `+1,61 pp` | 6 conteos ponderados (solo evidencia) | **Ola 1** — `ELIGIBLE` |
| `CLM-0007` | Q-0008 | 6 (3 participaciones y 3 cambios en pp) + 3 pares «N de M» | Coincidencias con `LAB-EVD-0015` (reemplazada) | **Ola 2**: primero su ficha editorial completa (`REL-PR-005/006`, caveats obligatorios) |
| `CLM-0001` | Q-0001 | 3 cambios en pp | 15 cifras solo en la evidencia (12 extremos y 3 cambios de otras modalidades) | Sin spec por ahora (no habilitada en ola 1) |
| `CLM-0002` | Q-0003 | 1: `36,75 pp` (JOB vs HOUR, 2021-Q2) | `235 pp` (rango/aproximación) | Sin spec por ahora; **CGI CC BY-SA** |
| `CLM-0004` | Q-0003 | 0 limpias; 4 con emparejamiento `POSITIONAL` (`234,30 %`; `−10,43 %`, `+1,09 %`, `−2,43 %`) | `−14,75 %`, `−11,73 %`, `218,46 %`, `±18 pp` | 4 × `PENDING_REVIEW`; **CGI CC BY-SA** |
| `CLM-0003` | Q-0002 | 1: `0,54 %` + 2 con granularidad de período distinta | — | `0,54 %` sin spec por ahora; 2 × `PENDING_REVIEW` |
| `CLM-0008`–`CLM-0014` | 7 preguntas | **0** | — | No aplica: no son mediciones |

**Primera ola: Q-0005 y Q-0004** (6 Figures `ELIGIBLE`). Q-0005 es el ejemplo principal de `HowWeMeasured`. Q-0004 demuestra que una medición cuantitativamente clara puede coexistir con `REFUTED_WITHIN_SCOPE`: separa «hay una medición» de «qué conclusión permite esa medición», y **el resultado numérico no se presenta como señal de mayor certeza**. Los valores intermedios de Q-0005 (medias en pesos, IPC) **no** son Figures: quedan en `Evidence Chain`. Q-0005 no muestra numerador/denominador: no es una proporción y el corpus no registra tal estructura.

Las 6 cifras `PENDING_REVIEW` (`CLM-0004` ×4, `CLM-0003` ×2) no salen. Las 32 rechazadas permanecen fuera aunque aparezcan en un texto libre; **`−14,75 %` de `CLM-0004` sigue rechazado bajo este ADR aunque el reporte estructurado la confirme**: un artefacto posterior no se usa retroactivamente para aprobar una cifra ambigua por texto.

## 5. Refinamiento de gates (solo lo necesario)

| Gate | Hoy | Cambio propuesto |
|---|---|---|
| `G-FIG-01` | Vacuo (0 Figures) | **Se activa** tal como está redactado: cada Figure resuelve a testigos y `display` reproduce el `text_anchor` de **ambos** |
| `G-FIG-02` | Sin literales numéricos en editorial | **Sin cambios** |
| `G-FIG-03` | Todo numeral en un `data-num` | Se agrega `data-figure` como elemento permitido, **condicionado** a D6 (autorización desde el artefacto generado). Se reemplaza `count` como cajón de sastre por las clases de D5. `data-num="ui"`/`"count"` que contenga `%`, `pp`, decimal o signo **falla**; `canon` fuera de un `CanonicalCite` **falla**. Se sigue escaneando atributos, `<title>` y `<meta>` |
| `G-FIG-04` | NA (0 Figures) | Se activa: cada Figure exhibe fuente y período (Encuadre), alternativa en tabla y descripción textual |
| `G-FIG-05` | Regex `%\|por ciento\|puntaje\|ranking\|índice\|promedio\|mayor que\|menor que\|el doble` sobre todo el HTML visible | El regex se aplica **al HTML sin los elementos `data-figure` que cumplen D6**. Ni una palabra de la lista se relaja fuera de ellos. Los textos editoriales se siguen linteando sin cambio (las Figures llegan por directiva, no por literal) |
| `G-FIG-06` | 2 testigos para anclas | Se extiende a Figures: reporte con testigos, `pairing` y firma humana para `POSITIONAL` |
| `G-OG-01` / `G-SEO-01` | Sin cifras sin calificador en metadatos | **Sin cambios.** WEB-3 no pone Figures en metadatos |

Pruebas obligatorias con el cambio: una Figure `ELIGIBLE` renderizada pasa; el mismo texto fuera de `data-figure` falla `G-FIG-03`/`05`; `data-figure` sin ID, con un `figure_id` inexistente, con el ID de otra cifra o con el texto alterado **falla**; una Figure `PENDING_REVIEW` o `REJECTED` en `data-figure` falla; una Figure con un solo testigo hace fallar el **build**; una coincidencia solo con evidencia reemplazada (`LAB-EVD-0015`) se rechaza; un matcher por valor sobre `CLM-0007` no autoriza los denominadores de `LAB-EVD-0015`; `−14,75 %` de `CLM-0004` no puede autorizarse; `ui`/`count` con `%` falla; `canon` fuera de una cita falla.

## 6. Qué pasa con el componente `HowWeMeasured`

Dos modos, como se pidió:

1. **Evidence Chain** — siempre disponible: fuente → universo → tratamiento → métrica → resultado registrado → límite, con campos ya estructurados (objeto, raíz, evidencia). No finge operaciones.
2. **Figure / Measurement** — aparece **solo** si el claim tiene ≥ 1 Figure válida. Muestra cada Figure con su Encuadre, su atributo nominal/real, su período y sus testigos. Si además hay un par «N de M» registrado, lo muestra tal cual. No muestra fórmula que el corpus de texto no registre.

Ningún modo escribe una cifra a mano. El resto de la ficha referencia Figures por directiva.

## 7. Qué queda explícitamente fuera (y por qué)

- **Vía S (origen estructurado).** Los reportes JSON del tag `aletheia-labor-v1.0.0` (`reports/lab_a3_1/…`, `reports/lab_b2_2/…`, `reports/lab_a3/…`) existen, tienen los valores completos y **coinciden por redondeo** con todos los testigos de texto auditados. Habilitarían, además, los insumos que hoy son de testigo único (medias en ARS, IPC, poblaciones ponderadas) y la fórmula registrada de `CLM-0007`. Pero **no están en el pin** (`pins/labor.pin.json` tiene 11 archivos). Agregarlos exige un ADR de pin (`corpus-pins` lo requiere) y actualizar `corpus-src/`. **No se hace aquí.** Se estudia en `ADR-WEB3-02` (`docs/adr/ADR-WEB3-02-structured-reports.md`), que permanece **PROPUESTO**: no se incorpora ningún reporte al pin hasta su aprobación explícita.
- **Umbrales preinscriptos** (`2-percentage-point`, `5-percentage-point`): no los detecta la regla de D1 y viven en las hipótesis; no forman parte del piloto.
- **Rangos y aproximaciones** (`233-235pp`, `±18`, «roughly»).
- **Cualquier cifra de testigo único.**

## 8. Consecuencias

- Cambian `modules/labor.contract.json`, el generador, `generated/labor/figures.json` (nuevo), `claims.json` (`figure_ids`), `contract_sha256` y `generator_source_sha256`. Solo en `web-3`.
- `tests/pipeline.test.ts` («no se inventa una Figure») pasa a verificar el conjunto exacto de las 6 Figures `ELIGIBLE`.
- Los tipos de `Part` `anchor`, `version` y `table` se reemplazan por `date`, `id` y `canon` (D5).
- Los rótulos públicos de cada Figure son cadenas editoriales nuevas (`PENDING_AUTHOR_REVIEW`).
- **Revisión legal (G-LEG-03).** `numerical_figures` figura hoy como tipo de derivado `PENDING`. Publicar Figures vuelve concreto ese punto. Los claims con **CGI CC BY-SA 4.0** (`CLM-0002`, `CLM-0004`, Q-0003) plantean además la cuestión de *ShareAlike*: por eso **no entran en la primera ola**.
- Este ADR **no cierra** `OD-14`, `G-LEG-02` ni `G-LEG-03`.

## 9. Decisiones tomadas por la autoría (2026-09-21)

1. **D1–D5 y el refinamiento de gates: aprobados**, con las precisiones de D5 (clases `figure`, `ui`, `count`, `id`, `date`, `hash`, `canon`), D6 (autorización desde el artefacto), D7 (`figure_specs` pequeño) y D8 (estados).
2. **Primera ola: Q-0005 y Q-0004.**
3. **Q-0008 (`CLM-0007`): segunda ola**, después de su ficha editorial completa. Será el caso de prueba para mostrar un par «N de M» sin inventar la estructura.
4. **`ADR-WEB3-02` (Vía S): autorizado para redacción, no para implementación.** Permanece PROPUESTO.
5. **Los reportes JSON del tag quedan fuera del pin.**
6. **Orden de implementación:** F1 contrato y generador → F2 Q-0005 → F3 Q-0004 → F4 `HowWeMeasured` (Evidence Chain y Figure / Measurement) → F5 tests y gates negativos. Solo después se integran las Figures al rediseño de Home y fichas. Primero autoridad de dato, después representación.
7. **Regla visual.** Una Figure no es un KPI: sin número enorme, sin tile, sin verde/rojo, sin delta promocional, sin contador animado. Sí: cifra contextualizada, unidad, período, significado, origen, vínculo con el método y su límite asociado. La pregunta visual no es «¿qué tan grande es este número?» sino «¿qué representa y cómo sabemos que podemos mostrarlo?».

## 10. Implementación (WEB3-F1 a F5)

- **F1** (`8c112bd`): contrato, generador y gates de datos.
- **F2/F3/F4:** `FigureValue.astro` (única vía para mostrar una cifra; recibe un ID y falla el build si no es una Figure `ELIGIBLE`), `HowWeMeasured.astro` (modos Evidence Chain y Figure / Measurement) y `src/lib/figures.ts`. Los rótulos y los dos textos fijos del bloque viven en `editorial/site/figures.yml` (8 unidades) y la interfaz en `ui.yml` (23 cadenas), todas `PENDING_AUTHOR_REVIEW`.
- **F5:** `scripts/gates/numerals.ts` valida el marcado numérico del HTML contra el artefacto generado. `G-FIG-03`, `G-FIG-04`, `G-FIG-05` y `G-LIM-04` operan sobre el HTML real. Tests negativos en `tests/figures-html.test.ts`; navegador en `npm run e2e:figures`.
- **Aclaración de D5:** `Cuadro N` se marca `id` (nombre de cuadro), no `canon`; `canon` queda para los numerales de citas canónicas.
