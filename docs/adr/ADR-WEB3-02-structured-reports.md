# ADR · WEB3-02 — Reportes estructurados del tag congelado (Vía S)

| | |
|---|---|
| **Estado** | **PROPUESTO** — autorizado para redacción, **no para implementación**. No se incorpora ningún reporte al pin, a `corpus-src/` ni a `consumed_paths` hasta su aprobación explícita. |
| **Fecha** | 2026-09-21 |
| **Fase / rama** | WEB-3 · rama `web-3` |
| **Relación con ADR-WEB3-01** | Continuación opcional. ADR-WEB3-01 opera **solo** con lo que ya está pineado (Vía T: dos testigos de texto). Este ADR estudia si conviene una segunda autoridad: los reportes JSON estructurados que el propio corpus cita |
| **Casos de estudio** | Q-0005 (insumos estructurados del cálculo) · Q-0008 (fórmula y estructura registrada de la proporción) |
| **Evidencia** | Lecturas de solo lectura sobre el tag (`git show`, `git rev-parse`); ver §2 y `docs/web-3/FIGURES-AUDIT.md` |

---

## 1. La pregunta

Para dos casos, la Vía T no alcanza:

- **Q-0005 / `CLM-0006`.** Los insumos del cálculo (media de ingreso laboral en pesos en cada trimestre, IPC trimestral, índice real) figuran **una sola vez** en texto (la evidencia). No hay segundo testigo de texto, así que ADR-WEB3-01 los deja en `Evidence Chain`.
- **Q-0008 / `CLM-0007`.** El corpus de texto registra los pares «N de M», pero no la **fórmula**. El reporte estructurado sí la registra.

¿Se puede dar acceso a esa información **sin crear evidencia nueva** y **sin violar el freeze**? Este ADR separa dos cosas que no deben confundirse:

| | Hacer accesible información frozen ya existente | Crear nueva evidencia |
|---|---|---|
| Qué es | Vendorear byte a byte un archivo del tag y leer valores ya registrados | Recalcular, completar, corregir o interpretar |
| ¿La propone este ADR? | **Sí, condicionado a las reglas de §6** | **No. Prohibido** |

## 2. Qué son esos reportes

Son artefactos JSON generados por las fases de análisis de `ALETHEIA-LABOR` y **versionados en el repo antes del cierre**. El corpus de texto los cita por ruta como respaldo de la evidencia (`Full detail: reports/…` en el campo `RESULT`, o `REPRODUCIBILITY`). No son datos crudos: son la salida estructurada de cada ejecución, con hashes de entrada.

| Reporte | Bytes | Blob SHA (`git`) | SHA-256 | Último commit que lo toca (anterior al tag) | Lo cita |
|---|---:|---|---|---|---|
| `reports/lab_a3_1/eph-hyp0004-real-income-growth.json` | 869 | `93889ffccc8e62102ea163c08c7acca4bcdefe37` | `73439067808932e769d4047b5fefdfb173dc1ef0eedad21f5ad5bfbc0abfa95b` | `d6fb904` · 2026-09-18 | `LAB-EVD-0010` (Q-0005) |
| `reports/lab_a3_1/eph-hyp0003-registration-proxy.json` | 1.256 | `5257866446263275023753036cf82392c0d74ac9` | `170e8357966d5bc01b5e8cafdb5d63f28f3ee60caddc1db56819f3858ed3813b` | `d6fb904` · 2026-09-18 | `LAB-EVD-0009` (Q-0004) |
| `reports/lab_b2_2/arca-sipa-hyp0005-execution.json` | 5.880 | `84d1f78c63c5a009634d4c3623f254fe337bc175` | `ce78abfa07da83c5f1713427e4f3faa7b66e81a5747d35dfcf71fdbc9f951156` | `14b7245` · 2026-09-18 | `LAB-EVD-0017` (Q-0008) |
| `reports/lab_a3/cgi-real-wagebill-quarterly.json` | 8.144 | `cda6bbd58dd249076879b4ced0142912ceb96ee6` | `25165d3b940c906a4ed3e79ffc9a27450f9b9fdce36629e7034eb60ca110d42c` | `4529861` · 2026-09-18 | `LAB-EVD-0007` (Q-0003) |

**Procedencia.** Repo `ALETHEIA-LABOR`; tag anotado `aletheia-labor-v1.0.0` (objeto `43279191455e5ed64b9d9a2fe492ae14a701e344`) → commit `ca6a85e12b05df28e73e60ac406c90ad16352ed3`, árbol `6150649a97e41a028a6966b114df36edbb937619`. Todos los archivos existen en ese commit. Verificación: `git show aletheia-labor-v1.0.0:<ruta> | sha256sum`.

**Lo que contienen.**

- `eph-hyp0004-…`: por trimestre, `weighted_mean_p21`, `IPC_QUARTERLY_MEAN`, `REAL_MEAN_P21`; y `NOMINAL_GROWTH_PCT`, `REAL_GROWTH_PCT`, `GAP_PP`.
- `eph-hyp0003-…`: `weighted_total_asalariados`, `weighted_unregistered`, `weighted_unregistered_share_pct`, `SHIFT_2025Q1_TO_2026Q1_PP`.
- `arca-sipa-hyp0005-execution.json`: `FORMULA` (`MONOTRIBUTO_SHARE_PCT = 100 * ARCA_MONOTRIBUTISTA / DENOMINATOR`), `INPUT_VALUES`, `COMPUTED_RESULTS` (numerador y denominador por vintage), `TEMPORAL_COMPARISONS_PP`, `SUM_DISCLAIMER` y `MANDATORY_CAVEATS`.
- `cgi-real-wagebill-quarterly.json`: tabla trimestral (`nominal_wage_bill_yoy_pct`, `real_wage_bill_yoy_pct`, `job_yoy_pct`, `hour_yoy_pct`).

**Fidelidad.** Los valores de texto de los claims que tienen reporte (`CLM-0004`, `CLM-0005`, `CLM-0006`, `CLM-0007`) coinciden con estos reportes al redondear a los decimales del texto (`35.4803 → 35.48`, `2.102 → 2.10`, `33.3783 → 33.38`, `36.2895 → 36.29`, `37.9021 → 37.90`, `1.6126 → 1.61`, `14.5988 → 14.60`…). Es evidencia de consistencia, no un sustituto del pin.

**Reportes que NO se proponen.** `reports/lab_a/sipa-t2-level-monthly.json`, `cgi-national-quarterly.json` y `mler-sipa-overlap-monthly-aggregates.json` son **series de niveles**: el estadístico publicado (cambio de participación, brecha JOB-HOUR, diferencia MLER-SIPA) **no está registrado** en ellos y obtenerlo exigiría calcularlo. Quedan fuera por D2 de ADR-WEB3-01.

## 3. Por qué no están hoy en el pin

- El pin de M0 (`pins/labor.pin.json`, 11 archivos, 520.898 B) cubre los **7 registros de metadatos** (ledgers y registries) y **4 inventarios** (`LAB-S0`, `LAB-S2`, `LAB-B4`) necesarios para el modelo de datos de WEB-0.
- `G-SRC-02/03` obligan a que **todo archivo consumido** esté en el pin, con `blob_sha` y `sha256` verificados. Un reporte no pineado no puede leerse.
- El Data Contract §9.2.1 **ya prevé** el origen `STRUCTURED_REPORT` («existen JSON estructurados con `NOMINAL_GROWTH_PCT`, `REAL_GROWTH_PCT`, `GAP_PP`…»), pero WEB-1 decidió no implementarlo: publicó 0 Figures.
- `corpus-pins/corpus-pins.json` declara que **un cambio de pin exige ADR**. Este es ese ADR.

## 4. Qué habría que pinear

| Archivo | Necesario para | Necesario ya |
|---|---|---|
| `eph-hyp0004-real-income-growth.json` | Q-0005: insumos (medias en ARS, IPC, índice real) | Sí, si se aprueba Vía S |
| `arca-sipa-hyp0005-execution.json` | Q-0008: fórmula, pares «N de M», caveats | Segunda ola |
| `eph-hyp0003-registration-proxy.json` | Q-0004: numerador y denominador ponderados | Opcional |
| `cgi-real-wagebill-quarterly.json` | Q-0003 (`CLM-0004`): verificar por estructura | No (CGI CC BY-SA; fuera de la ola 1) |

Total mínimo (Q-0005 + Q-0008): **6.749 B** en 2 archivos. Los cuatro: **16.149 B**. Ninguno tiene extensión de dato crudo (`G-LEG-01`).

## 5. Impacto

| Área | Cambio | Cómo se verifica |
|---|---|---|
| `modules/labor.contract.json` | `consumed_paths` +N; `contract_sha256` cambia | `G-GEN-03` |
| `pins/labor.pin.json` | +N entradas con `blob_sha`, `sha256`, `bytes` | `G-SRC-01/02` |
| `corpus-src/labor@ca6a85e/reports/…` | +N archivos, byte-idénticos a los objetos del tag | `G-SRC-03`, `G-SRC-04` (los repos fuente no cambian) |
| `corpus-pins/corpus-pins.json` | Registro humano del cambio (por este ADR) | revisión humana |
| `generated/labor/manifest.json` | `source_files` +N; `generator_source_sha256` | `G-GEN-01/02` |
| Data Contract §9 | Ninguna enmienda: se **implementa** `STRUCTURED_REPORT` (ya previsto). Se agrega un tipo de testigo `structured` con puntero JSON | `G-FIG-01` |
| `figure_specs` | `witness` gana el tipo `structured` (`path`, puntero JSON) | esquema estricto |
| Gates | `G-FIG-01`/`06` aceptan testigo estructurado; `G-PRV-03` cubre su `blob_sha` | tests negativos |
| `tag`, `commit`, `tree` de LABOR | **Sin cambios** | `G-SRC-01` |
| `ALETHEIA-LABOR` (repo fuente) | **Sin cambios** (solo lectura) | `G-SRC-04` |

## 6. Reglas propuestas (si se aprueba)

1. **Solo lo que el corpus ya cita.** Únicamente los reportes que el propio `RESULT`/`REPRODUCIBILITY` de una evidencia nombra por ruta.
2. **Ancla textual obligatoria (Data Contract §9.2.2).** Todo valor estructurado exige un `text_anchor` en un registro de texto del corpus. Un número que solo existe en el JSON **no se publica**: sería publicar información no registrada por el corpus de texto.
3. **Sin recalcular.** El valor sale del puntero JSON. Nada se suma, resta ni promedia. `COMPUTED_RESULTS` y `FORMULA` se muestran **tal como están registrados**.
4. **Formato con redondeo declarado.** `value_raw` conserva la precisión del reporte (`794252.8362…`). El formato aplica `display.decimals` de forma **determinista sobre la cadena decimal** (sin coma flotante) y **debe reproducir el ancla**; si no la reproduce, el build falla. Esto es *formato*, no cálculo (Data Contract §9.2.6), y es lo que ADR-WEB3-01 D2 prohíbe para Vía T y aquí necesitaría una excepción explícita **acotada a Vía S**.
5. **Un ancla, no un nuevo testigo.** Un valor estructurado con ancla en la evidencia cuenta como dos testigos (estructura + texto), como define §9.2.2. **Esto difiere de la regla «claim + evidencia» de ADR-WEB3-01**, que la autoría debe confirmar o rechazar para los insumos de Q-0005.
6. **No retroactividad.** Un reporte estructurado **no** puede usarse para promover una cifra rechazada por Vía T. `−14,75 %` de `CLM-0004` sigue `REJECTED` bajo ADR-WEB3-01 aunque `cgi-real-wagebill-quarterly.json` la confirme (`−14.7475`, 2024-Q1). Solo podría reconsiderarse si este ADR define formalmente otra autoridad estructurada **y** se registra el cambio de estado con firma.
7. **Lo no citado queda fuera.** Campos del reporte sin ancla en el corpus de texto (p. ej. `weighted_population` en `eph-hyp0004`, `n_persons_unweighted`, `INPUT_SHA256`) **no se publican** por Vía S.

## 7. Qué representa cada caso

**Q-0005.** Habilitaría, con ancla en `LAB-EVD-0010`: `794,253` y `1,076,056` (ARS), `8,090.14` y `10,734.91` (IPC), `98.18` y `100.24` (índice real). Sigue **sin** existir numerador/denominador (no es una proporción) y **no** se muestra fórmula: el reporte no registra ninguna para el crecimiento. El walkthrough podría mostrar los insumos y luego los resultados ya registrados, sin operación visible.

**Q-0008.** Habilitaría la fórmula registrada `100 × ARCA_MONOTRIBUTISTA / DENOMINATOR` y `DENOMINATOR = ARCA_MONOTRIBUTISTA + SIPA_DEPENDENT_SUM_UNITS`, más `MANDATORY_CAVEATS` y `SUM_DISCLAIMER` **como texto canónico citado**. Es el caso donde numerador/denominador/fórmula están registrados. Sigue condicionado a la ficha editorial completa (`REL-PR-005/006`); este ADR no la habilita.

## 8. ¿Información nueva o materialización de evidencia frozen?

- **Materialización de evidencia frozen**: los cuatro archivos están en el commit congelado, los cita el corpus de texto, y sus valores coinciden con el texto. Vendorearlos no altera el tag, el commit ni el árbol.
- **No es evidencia nueva** mientras se cumplan las reglas de §6 (en particular 2, 3 y 7).
- **Sí sería evidencia nueva**, y queda prohibido: recomputar desde `data/`; leer un reporte no citado; publicar un campo sin ancla; corregir un valor; interpretar `EXPECTED_OBSERVATION_MET`.
- **Lo que sí cambia** es la *superficie publicada*: hoy los insumos solo son legibles en el texto de la evidencia. Por eso el ADR pide una decisión de la autoría y no un cambio técnico automático.

## 9. Qué invalida y qué no invalida del freeze actual

| No se invalida | Se ve afectado (y se re-verifica) |
|---|---|
| Tag `aletheia-labor-v1.0.0`, commit `ca6a85e…`, árbol `6150649…` | `pins/labor.pin.json` (+N archivos) |
| Los 7 ledgers/registries y los 4 inventarios ya pineados | `corpus-src/` (+N archivos) |
| Governance y Charter (`SHA256SUMS.txt`) | `contract_sha256`, `manifest.source_files` |
| Conteos de entidades, estados, mapeo pregunta↔claim | Hashes de `generated/` (`G-REL-04`: changelog) |
| Las 18 `public_question` aprobadas | El pin de revisión humana (ya invalidado en `web-3` por ADR-WEB3-01) |

## 10. Riesgos

- **Precisión aparente.** Publicar `794,253` sugiere exactitud de un valor que es una media ponderada de una encuesta. Requiere el calificador de alcance (EPH, ponderación) junto al valor. Mitigación: Encuadre y `HowWeMeasured`.
- **Lectura de la proporción de Q-0008** como conclusión más amplia. Mitigación: segunda ola y ficha editorial previa.
- **Deriva del formato de redondeo.** Mitigación: regla 4 y test que reproduce cada ancla.
- **Ampliar el pin** puede leerse como «cambiar el freeze». No lo es: cambia lo que se consume, no lo que está congelado.

## 11. Decisiones ya tomadas por la autoría (2026-09-21)

1. **«Valor estructurado + ancla de texto» NO cuenta todavía como el doble testigo de ADR-WEB3-01.** La regla 5 de §6 queda como propuesta a decidir, no como regla vigente.
2. **WEB-3 no redondea los insumos de Q-0005 para publicarlos.** La regla 4 de §6 (redondeo declarado) no se aplica desde WEB-3.
3. **`−14,75 %` de `CLM-0004` sigue rechazado bajo ADR-WEB3-01**, aunque el reporte estructurado lo confirme.
4. La Vía S puede definir más adelante una **nueva autoridad estructurada**, pero no reinterpreta retroactivamente ADR-WEB3-01.
5. **Ningún reporte JSON entra al pin todavía.** Este ADR permanece PROPUESTO.

## 12. Decisiones que siguen abiertas

1. ¿Se aprueba estudiar la Vía S para Q-0005, o los insumos quedan de forma permanente en `Evidence Chain`?
2. ¿Se define una autoridad estructurada nueva y separada (con su propio contrato y estado), sin tocar ADR-WEB3-01?
3. ¿Se pinea también `eph-hyp0003-…` (Q-0004)?
4. ¿Se difiere `arca-sipa-hyp0005-execution.json` a la segunda ola, junto con la ficha editorial de Q-0008?

Hasta esas respuestas: **ningún reporte entra al pin.**
