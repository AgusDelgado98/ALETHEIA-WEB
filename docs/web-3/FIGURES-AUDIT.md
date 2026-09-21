# WEB-3 · Auditoría de candidatos a Figure

Insumo de [`ADR-WEB3-01`](../adr/ADR-WEB3-01-figures.md). **Solo lectura**: no se modificó `generated/`, `corpus-src/`, `pins/` ni el repo fuente.

- Corpus: `ALETHEIA-LABOR` tag `aletheia-labor-v1.0.0` (commit `ca6a85e12b05df28e73e60ac406c90ad16352ed3`), tal como está pineado en `corpus-src/` y materializado en `generated/labor/`.
- Detector: `npm run figures:audit` (`tools/figures/audit.ts`). Es determinista y **solo detecta candidatos**; la decisión por Figure es la revisión de contexto de este documento.

## 1. Método

1. Se extraen las cantidades (`%`, `pp`, `percentage points`, y enteros con separador de miles) de `canonical_text` del claim y de `result_text` de cada evidencia **vigente** del claim. Se excluyen fechas, IDs y citas legales.
2. Un candidato es una cantidad con **misma magnitud y misma unidad** en ambos textos.
3. Cada candidato pasa por la revisión de D1 (mismo objeto, mismo período, signo, sin aproximación) leyendo las dos oraciones.
4. Control adicional, **informativo y no parte del contrato**: cada valor de texto se contrasta con el JSON estructurado del tag (solo lectura vía `git show`), para saber si el texto es fiel. No se usa para publicar nada.

**Evidencia reemplazada.** `LAB-CLM-0007` referencia `LAB-EVD-0015` y `LAB-EVD-0017`; el corpus declara que el segundo reemplaza al primero. `LAB-EVD-0015` **comparte tres numeradores** con el claim (`1,678,677`, `1,887,224`, `2,428,877`) pero con **otros denominadores** (`2,202,532`, `2,697,458`, `3,216,472`), porque mide otra cosa. Un emparejamiento ingenuo por valor generaría un testigo falso. El detector la excluye y la reporta como rechazo.

## 2. Resultado por claim

Leyenda: **OK** cumple D1 · **REV** cumple con una condición a firmar (`POSITIONAL` o granularidad de período) · **NO** rechazada.

### Claims con al menos una Figure admisible (7)

**`LAB-CLM-0006` · Q-0005 · ingreso laboral nominal y real (EPH, 2025-Q1 → 2026-Q1)**

| Cantidad | Testigo claim | Testigo evidencia (`LAB-EVD-0010`) | Dictamen |
|---|---|---|---|
| `35.48 %` nominal | «grew 35.48% in nominal terms» | «nominal growth +35.48%» | **OK** |
| `2.10 %` real | «only 2.10% once deflated by the admitted national IPC» | «real growth +2.10%» | **OK** |
| `33.38 pp` brecha | «a gap of 33.38 percentage points» | «Gap between nominal and real growth: 33.38 percentage points» | **OK** — el corpus la registra; no se resta |
| ARS `794,253` → `1,076,056` | — | «Weighted mean P21: ARS 794,253 (2025-Q1) -> …» | **NO** — testigo único |
| IPC `8,090.14` → `10,734.91`; índice real `98.18` → `100.24` | — | idem | **NO** — testigo único |

Control estructurado (`reports/lab_a3_1/eph-hyp0004-real-income-growth.json`, blob `93889ffc…`): `NOMINAL_GROWTH_PCT 35.4803`, `REAL_GROWTH_PCT 2.102`, `GAP_PP 33.3783`. Coinciden con el texto por redondeo a 2 decimales.

**`LAB-CLM-0005` · Q-0004 · asalariados sin descuento jubilatorio, `REFUTED_WITHIN_SCOPE`**

| Cantidad | Dictamen |
|---|---|
| `36.29 %` (2025-Q1), `37.90 %` (2026-Q1), `+1.61 pp` | **OK** los tres. Ambos testigos ubican cada valor en su trimestre |
| Conteos ponderados (`9,633,463`, `3,495,931`, `9,669,168`, `3,664,820`) y muestrales (`14,627`, `13,938`) | **NO** — solo en la evidencia |

Control (`eph-hyp0003-registration-proxy.json`, blob `52578664…`): `36.2895`, `37.9021`, `1.6126`; `weighted_unregistered / weighted_total_asalariados` presentes. El estado `REFUTED_WITHIN_SCOPE` obliga a mostrar el alcance junto a cada cifra.

**`LAB-CLM-0007` · Q-0008 · participación del Monotributo (3 vintages no adyacentes)**

| Cantidad | Dictamen |
|---|---|
| `14.60 %` · `16.49 %` · `19.44 %` | **OK** (`LAB-EVD-0017`) |
| `+1.89 pp` · `+2.95 pp` · `+4.84 pp` | **OK** |
| Pares `1,678,677 of 11,498,694` · `1,887,224 of 11,443,898` · `2,428,877 of 12,495,118` | **OK** — **único caso con numerador y denominador registrados juntos en ambos testigos** |
| Coincidencias con `LAB-EVD-0015` | **NO** — evidencia reemplazada |

Control (`arca-sipa-hyp0005-execution.json`, blob `84d1f78c…`): `14.5988`, `16.4911`, `19.4386`, `4.8398`, `1.8922`, `2.9475`; numeradores y denominadores idénticos. Este JSON además **registra la fórmula** (`100 * ARCA_MONOTRIBUTISTA / DENOMINATOR`), pero es Vía S (no está en el pin).
**Advertencia de lectura:** el denominador es una suma analítica de LAB que nunca equivale al total de SIPA (GOV-005), y ARCA y SIPA no son poblaciones mutuamente excluyentes. El corpus registra caveats obligatorios; sin ficha editorial que los muestre junto a la cifra, no debe habilitarse (`REL-PR-005/006`).

**`LAB-CLM-0001` · Q-0001 · composición del empleo registrado SIPA, 2012-01 → 2026-05**

| Cantidad | Dictamen |
|---|---|
| `ASALARIADO_PRIVADO −7.97 pp`, `ASALARIADO_PUBLICO +3.23 pp`, `MONOTRIBUTO +5.21 pp` | **OK** — el signo lo da la evidencia; el claim lo da por verbo (`fell`, `rose`) |
| 12 participaciones de extremos (`55.86 % → 47.89 %`…) y 3 cambios de otras modalidades | **NO** — solo en la evidencia |

Control: el archivo estructurado archivado (`reports/lab_a/sipa-t2-level-monthly.json`, blob `07f65da3…`) es la **serie mensual de niveles**; el estadístico (cambio de participación) **no está registrado ahí**, y obtenerlo exigiría calcularlo. Queda solo en Vía T (texto), sin control estructural posible sin derivar. La hipótesis tiene exposición previa `DIRECT`.

**`LAB-CLM-0002` · Q-0003 · CGI-IMO nominal**

| Cantidad | Dictamen |
|---|---|
| `36.75 pp` (JOB vs HOUR, 2021-Q2) | **OK** — ambos: «2021-Q2 … 36.75pp gap» |
| `235 pp` | **NO** — el claim dice «up to 235»; la evidencia dice «a 233-235pp gap» (rango) |

Control: la serie archivada (`cgi-national-quarterly.json`) es de niveles; no contiene el estadístico. **CGI es CC BY-SA 4.0.**

**`LAB-CLM-0004` · Q-0003 · CGI-IMO real (deflactado por IPC)**

| Cantidad | Dictamen |
|---|---|
| `234.30 %` nominal, 2024-Q2 | **REV** — el claim lo empareja con su trimestre por orden («218.46% and 234.30% in those same quarters»); la evidencia lo ubica explícitamente («peaking at 234.30% in 2024-Q2») |
| `−10.43 %` (real), `+1.09 %` (JOB), `−2.43 %` (HOUR), 2019-Q2 | **REV** — en el claim, la primera cifra no lleva etiqueta; el emparejamiento es posicional |
| `−14.75 %` | **NO** — el claim la fija en 2024-Q1; la evidencia la da como extremo aproximado de la ventana («approximately -14.75% to +14.86%») |
| `−11.73 %`, `218.46 %` | **NO** — solo en el claim |
| `±18 pp` | **NO** — aproximación («roughly») |

Control (`cgi-real-wagebill-quarterly.json`, blob `cda6bbd5…`): `−14.7475` (2024-Q1, el mínimo), `−11.7279` (2024-Q2), `218.4562`, `234.3003`, `−10.433`, `1.0893`, `−2.4279`. **Todo el texto es fiel**, y confirma que `−14.75` es correcto en 2024-Q1. Es la ilustración de por qué Vía T rechaza lo que Vía S podría verificar: la evidencia de texto no lo dice, y el contrato exige que lo diga.

**`LAB-CLM-0003` · Q-0002 · MLER vs SIPA**

| Cantidad | Dictamen |
|---|---|
| `0.54 %` | **OK** — pero el claim dice «average difference» y la evidencia «average absolute difference». La etiqueta pública debe salir del testigo más específico (evidencia) |
| `3.38 %` (2012), `5.07 %` (2021) | **REV** — el claim da el año; la evidencia el mes (`2012-01`, `2021-12`). Compatible, no idéntico: exige una regla de granularidad |

### Claims sin ninguna Figure (7)

`LAB-CLM-0008` a `LAB-CLM-0014` (Q-0009, Q-0012, Q-0010, Q-0013, Q-0016, Q-0014, Q-0018): **0 coincidencias.** No son mediciones (mapeo regulatorio, existencia de proxy, bloqueos de diseño, disponibilidad de fuentes). La única cifra suelta (`19 mapped cells: 11 ESTABLISHED, 3 …` en `LAB-EVD-0018`) es de testigo único y documental.

## 3. Totales

| | Figures |
|---|---:|
| **OK** (cumplen D1 sin condiciones) | 3 + 3 + 6 + 3 + 1 + 1 = **17** (más 3 pares «N de M») |
| **REV** (a firmar) | 4 (`CLM-0004`) + 2 (`CLM-0003`) = **6** |
| **NO** (rechazadas dentro de claims elegibles) | 6 + 6 + 15 + 1 + 4 = **32** cifras de testigo único, aproximadas o de otra evidencia |

*Recuento OK:* `CLM-0006` 3; `CLM-0005` 3; `CLM-0007` 3 participaciones + 3 cambios (+ 3 pares); `CLM-0001` 3; `CLM-0002` 1; `CLM-0003` 1. *Recuento NO:* `CLM-0006` 6, `CLM-0005` 6, `CLM-0001` 15, `CLM-0002` 1, `CLM-0004` 4.

## 4. `Q-0005` frente al contrato completo (Data Contract §9)

| Requisito | ¿Cumple con lo pineado? |
|---|---|
| §9.2.1 Origen estructurado primero | No disponible en el pin. Se recurre a §9.2.4 (texto con dos testigos), permitido en V1 |
| §9.2.2 `text_anchor` reproducido por `display` | Sí: `35.48`, `2.10`, `33.38` se reproducen sin redondear |
| §9.2.3 Sin aritmética nueva | Sí: la brecha está registrada en ambos testigos |
| §9.2.4 Doble testigo claim + evidencia | Sí, para las 3 |
| §9.2.5 Fuente y período (Encuadre) | Sí: `LAB-ROOT-0005` (EPH) y `LAB-ROOT-0006` (IPC, deflactor); período `2025-Q1` → `2026-Q1` presente en ambos testigos |
| §9.2.6 Formato determinista | Sí |
| §9.2.7 Nominal ≠ real | Sí: `35.48` nominal, `2.10` real, ambos calificados en el texto |
| §9.2.8 La narrativa referencia el ID | Sí, vía `{{figure:…}}` |
| Divulgación de exposición previa (`INDIRECT`) en el mismo pliegue (MVP §5.4) | Debe mostrarse; ya existe la unidad editorial `disclosure` |

**Q-0005 satisface el contrato para sus tres cifras de titular.** No lo satisface para los insumos (medias en ARS, IPC, índice real): eso sigue como `Evidence Chain`, sin fórmula, hasta una eventual Vía S.

Consecuencia para el walkthrough: **fuente → universo → tratamiento → métrica → `+35,48 %` nominal / `+2,10 %` real / `33,38 pp` → límite.** Sin operación aritmética visible.

## 5. Advertencias

- El detector no ve los umbrales preinscriptos con forma adjetival (`2-percentage-point`, `5-percentage-point`). Viven en las hipótesis; no son parte del piloto.
- Los controles estructurales usan `git show` sobre el tag; no modifican HEAD, refs ni working tree del repo fuente (verificado: `git status --porcelain` vacío antes y después).
- Esta auditoría es una fotografía del corpus congelado: si el corpus cambiara, se repite con `npm run figures:audit`.
