# WEB-0 · MVP (V1 pública)

| | |
|---|---|
| **Estado** | **FROZEN** (WEB-0 v1.0, 2026-09-19; ver `WEB-0-DECISION-LOG.md` §4). Enmienda 1: OD-05, OD-13, OD-02, OD-03 resueltas; OD-06 abierta por diseño |
| **Fecha** | 2026-09-19 |
| **Alcance** | Qué entra y qué no entra en la V1 pública; selección de los cinco hallazgos; criterios y candidatos de hero |
| **Base de evidencia** | Solo el corpus real (`aletheia-labor-v1.0.0`, commit `ca6a85e…`) y `aletheia-research-foundation-v1.0.0` para licencias/URLs. Las **puntuaciones** de §3 y §5 son juicio editorial explícito; los **hechos** de las tablas (claims, estados, exposición previa, origen de cifras, relaciones, licencias) salen del corpus. |

---

## 1. Alcance de la V1

### 1.1 Entra

| # | Pieza | Contenido | Notas |
|---|---|---|---|
| 1 | **Home narrativa** | Identidad → Apertura → Lo que sí/no → Formas de responder → Preguntas → Rastro → Todo el corpus (Design Charter §9, §11) | El **hero queda sin elegir** hasta la prueba de §5. Toda cifra es una Figure. |
| 2 | **Cinco hallazgos** (Tier A) | Páginas de pregunta con editorial completa (§2) | Indexados en `/hallazgos` |
| 3 | **Mapa completo de las 18 preguntas** | `/explorar`; puertas que se abren; una fila por pregunta; ■ por claim (0..N); resultado documental sin ■ | Sin filtros (Charter: «Sin selección») |
| 4 | **13 fichas mínimas (Tier B)** para completar las 18 preguntas | Generadas con el **mismo contrato de datos y de estados** que las completas; **solo cadenas auditadas** (§1.3) | **Decidido (OD-05).** Ningún enlace del mapa puede quedar muerto |
| 5 | **Sistema «Lo que sí / Lo que NO significa»** | En los 5 hallazgos, con matriz de cobertura de limitaciones completa; en el Tier B, límites `SHOWN` | Charter §11.1 |
| 6 | **Rastro** | Para los 5 claims de los hallazgos: `CLM-0006`, `0005`, `0002`, `0004`, `0011` | Q-0011 no tiene claim: ver §2.2 (regla propia) |
| 7 | **Límites** (`/limites`) | Generado desde `PreservedResult` (15) y `Relation` (34) + introducción editorial mínima. **Incluye los resultados preservados de los tres regímenes y, en particular, los del régimen C** (`KEEP-003`, `-004`, `-006`, `-007`; OD-13) | Está en la navegación fijada por el Charter |
| 8 | **Método mínimo** (`/metodo`) | Cómo leer un estado; dos capas de estado; raíces de evidencia; exposición previa a los datos; qué significa «Observado en la fuente» | Sin metodología en primer plano (Charter §9) |
| 9 | **Sobre** (`/sobre`) | Qué es ALETHEIA; independencia; atribuciones y licencias; accesibilidad; privacidad | Revisión legal previa (OD-03) |
| 10 | **Búsqueda estática** | Superposición Ctrl K, índice generado en build | Solo cadenas auditadas indexables |
| 11 | **Manifest y versión visibles** | `/versiones` + resumen en el pie: `web-1.0.0`, `labor@1.0.0`, commit `ca6a85e`, changelog, cómo citar | — |

### 1.2 No entra en V1

Ask ALETHEIA (ni UI ni backend) · Rastro de los otros 9 claims · páginas propias de claim · filtros/ordenamientos · descargas de datos · gráficos interactivos o dashboards · versión en otros idiomas · analítica · formularios/cuentas · comentarios · módulos distintos de `labor` · responsive final y motion final (OD-02: **no bloquean el desarrollo inicial pero sí el release público**; se especifican dentro de WEB-1).

### 1.3 Las 13 fichas mínimas (decidido, OD-05)

**Decisión:** el MVP tiene **5 fichas completas** (§2) y **13 fichas mínimas generadas** que completan las 18 preguntas. **Ningún enlace del mapa puede quedar muerto** (`G-UX-04`): el mapa no se construye con enlaces a fichas que todavía no existen.

Una ficha mínima sigue **el mismo contrato de datos y de estados** que una completa (mismo esquema, mismos gates `CORE_BUILD` de estado, mapeo, límites, cifras y editorial). No requiere la narrativa ni la visualización de las cinco principales.

| Incluye (todo generado desde el corpus + cadenas ya auditadas) | No requiere |
|---|---|
| `public_question` aprobada | Apertura |
| Resolución de la pregunta y, por cada claim, su estado (dos capas separadas) y calificador «Hallazgo documental…» cuando corresponde | Rastro |
| Titular de claim **auditado** y `scope_statement` | Prosa «Lo que sí podemos decir / Lo que NO significa» |
| Límites `SHOWN` junto al dato; divulgación de exposición previa si aplica; nota de brecha pregunta–claim si aplica | Hero, gráficos o visualización propia |
| Preguntas sin claim: resultado documental real y «Sin claim», sin ■; resultados preservados (`KEEP-*`) relacionados | — |
| Nivel Auditoría: IDs, provenance, cita | — |

**Regla de cifras:** si una ficha muestra una cifra, es una **Figure con su Encuadre** (Charter §5 y §17); si no puede mostrarse con Encuadre, **no se muestra**. Nunca una cifra sin Encuadre.

| Régimen | Pregunta | Claim(s) | Fin de la pregunta |
|---|---|---|---|
| A | Q-0001 | `CLM-0001` | Observado en la fuente (medición) |
| A | Q-0002 | `CLM-0003` | Observado en la fuente (medición) |
| A | Q-0006 | — | Bloqueada por diseño |
| A | Q-0007 | — | Abierta: no ejecutada (`OUTSIDE_LAB_A`, `NO_DESIGN`) |
| B | Q-0008 | `CLM-0007` | Observado en la fuente (medición) |
| B | Q-0009 | `CLM-0008` | Observado en la fuente (hallazgo documental) |
| B | Q-0010 | `CLM-0010` | Observado en la fuente (hallazgo documental) |
| B | Q-0012 | `CLM-0009` | Observado en la fuente (hallazgo documental) |
| **C** | Q-0014 | `CLM-0013` | Evidencia insuficiente |
| **C** | Q-0015 | — | No identificable |
| **C** | Q-0016 | `CLM-0012` | Observado en la fuente (hallazgo documental) |
| **C** | Q-0017 | — | No identificable |
| **C** | Q-0018 | `CLM-0014` | Evidencia insuficiente |

5 completas + 13 mínimas = **18**. Las 14 claims quedan cubiertas: 5 en las fichas completas (`CLM-0006`, `0005`, `0002`, `0004`, `0011`) y 9 en las mínimas. Dependencia editorial: los **9 titulares de claim** de las fichas mínimas requieren auditoría (OD-07).

---

## 2. Los cinco hallazgos

### 2.1 Regla de selección
1. Salen **solo del corpus real**.
2. **Maximizar lecciones distintas** que enseñen la tesis del producto («Lo que el dato dice. Y lo que no.»), no cubrir temas.
3. Desempate por puntuación (§3).
4. Se excluye lo de riesgo de lectura alto **salvo** que sea el único portador de una lección.
5. Cada hallazgo debe poder publicarse con **todas** sus limitaciones y con cada cifra como Figure.

### 2.2 Selección final

| # | Pregunta | Claims | Fin de la pregunta | Lección | Régimen |
|---|---|---|---|---|---|
| **H-1** | **Q-0005** · ingreso laboral, nominal y real | `LAB-CLM-0006` | Observado en la fuente (medición) | Un mismo dato se lee distinto según se lo mire; lo observado tiene alcance | A |
| **H-2** | **Q-0003** · horas, puestos y masa salarial | `LAB-CLM-0002` (nominal) + `LAB-CLM-0004` (real) | Observado en la fuente (2 claims) | **Una pregunta puede tener más de un claim**; nominal ≠ real | A |
| **H-3** | **Q-0004** · composición del trabajo al sumar la EPH | `LAB-CLM-0005` | Refutado dentro de su alcance | Refutar dentro de un alcance **no** es refutar todo; *lo esperado no ocurrió* también es un resultado | A |
| **H-4** | **Q-0013** · cambio de umbrales del Monotributo | `LAB-CLM-0011` | Evidencia insuficiente | Sin datos de flujo no se puede atribuir: **ausencia ≠ resultado negativo** | B |
| **H-5** | **Q-0011** · independiente real vs. dependiente encubierto | *(sin claim)* | No identificable con las fuentes conocidas | Hay preguntas que la evidencia disponible no permite responder, y decirlo es un resultado | B |

Distribución de finales: 2 Observado (3 claims) · 1 Refutado · 1 Insuficiente · 1 No identificable. Los estados **Bloqueada por diseño** (Q-0006) y **Abierta / no ejecutada** (Q-0007) quedan cubiertos por el mapa, `/limites` y sus fichas mínimas.

**Régimen C (OD-13, aprobada).** Queda **fuera de las cinco fichas destacadas del Home** en el MVP V1 **y no se oculta**: sigue visible en el **mapa de las 18 preguntas**, en **`/limites`**, en **sus cinco fichas mínimas** (Q-0014 a Q-0018) y en el **Método** cuando sea relevante. Razón: el régimen C **no produjo corpus empírico** (0 avisos capturados, 0 fuentes admitidas, 0 raíces de evidencia) y no conviene forzarlo como vitrina cuantitativa.

**Regla propia de H-5 (pregunta sin claim).** El Rastro del Design Charter (§11.3) arranca en la afirmación. Q-0011 no tiene claim: **no se fabrica uno**. V1 publica H-5 con «Lo que sí / Lo que NO» y el resultado documental, y declara «Sin claim: no hay Rastro de claim». Un Rastro para preguntas sin claim requeriría una variante visual que el Charter no define (OD-08).

### 2.3 Manifiesto de datos por hallazgo (hechos del corpus)

| | Q-0005 | Q-0003 | Q-0004 | Q-0013 | Q-0011 |
|---|---|---|---|---|---|
| Claims | CLM-0006 | CLM-0002, CLM-0004 | CLM-0005 | CLM-0011 | — |
| Hipótesis | HYP-0004 | HYP-0002 | HYP-0003 | HYP-0006 | HYP-0009 |
| `PRIOR_DATA_EXPOSURE` | **INDIRECT** | **INDIRECT** | **INDIRECT** | NONE | NONE |
| Divulgación de exposición | **Obligatoria** | **Obligatoria** | **Obligatoria** | — | — |
| Raíces | ROOT-0005 (+ deflactor ROOT-0006) | ROOT-0002 (+ deflactor ROOT-0006 en CLM-0004) | ROOT-0005 | ROOT-0007 | — |
| Limitaciones canónicas | 4 | 4 + 5 | 3 | 5 | 1 (pregunta) |
| Origen de cifras | JSON estructurado `reports/lab_a3_1/eph-hyp0004-real-income-growth.json` | CLM-0004: `reports/lab_a3/cgi-real-wagebill-quarterly.json` (tabla). CLM-0002: origen estructurado **por confirmar** en WEB-1 | JSON estructurado `reports/lab_a3_1/eph-hyp0003-registration-proxy.json` | Sin cifras | Sin cifras |
| Figures necesarias | 3 (nominal, real, brecha) | ≈4–6 | 3 + umbral | 0 | 0 |
| Relaciones aplicables | `REL-AUTH-003`, `REL-JX-006/007`; prohíbe `REL-PR-012/013` | `REL-AUTH-003`, `REL-JX-006`; prohíbe `REL-PR-012` | `REL-PR-009`, `-013`, `-004` | `REL-PR-006/-008`, `REL-CONF-003` | `REL-PR-005`, `REL-CONF-002` |
| Resultados preservados | — | — | `KEEP-001` | `KEEP-002`, `KEEP-010` | `KEEP-005` |
| Vínculo a fuente original | UNRESOLVED (ROOT-0005 sin registro directo) | **Resuelto** para ROOT-0002 (sha256 = V1 CGI) | UNRESOLVED | UNRESOLVED | — |
| Licencia | EPH/IPC: `NOT_RECORDED` | **CGI: CC BY-SA 4.0** (atribución + revisión ShareAlike) | EPH: `NOT_RECORDED` | ARCA: `NOT_RECORDED` | — |

Cifras de cada hallazgo (todas, en V1, Figures; nunca texto): H-1 `35,48 %`, `2,10 %`, brecha `33,38 pp` (2025-Q1→2026-Q1); H-3 `36,29 %`, `37,90 %`, `+1,61 pp`, umbral `5 pp`; H-2 y H-4/H-5 según §2.3.

### 2.4 Riesgos de los hallazgos y mitigación

| Riesgo | Hallazgo | Mitigación |
|---|---|---|
| Comparar magnitudes CGI (H-2) con EPH (H-1) | H-1/H-2 | `REL-PR-012` y `REL-AUTH-003`: sin eje compartido; en `/hallazgos` se listan sin gráfico común; ninguna prosa los compara |
| Leer «35,48 %» como «los salarios subieron 35 %» | H-1 | La Figure trae nominal/real, período y alcance; el texto usa «ingreso laboral medio declarado» (P21) y 32 aglomerados urbanos |
| Leer la refutación como «la informalidad no aumentó» | H-3 | Aviso de alcance obligatorio (Charter §20.3 regla 6); `REL-PR-009` |
| Leer insuficiencia como «el umbral no tuvo efecto» | H-4 | Texto fijo «Ausencia, no resultado negativo»; `REL-PR-008` |
| Inferir «contractorización» de H-4/H-5 | H-4/H-5 | `REL-PR-005`: prohibido; se cita como «lo que no se afirma» |
| Divulgar exposición previa | H-1/H-2/H-3 | Bloque obligatorio en la página (Editorial §5.6) |
| Licencia CGI (CC BY-SA 4.0) | H-2 | Atribución en la cota + `/sobre`; revisión legal antes de publicar |

**Reservas (no entran a V1 por riesgo o por redundancia de lección):** Q-0008/`CLM-0007` (participación del Monotributo 14,60 % → 19,44 %: exposición NONE y cifras estructuradas, pero es el más expuesto a lecturas de «contractorización» y de individuos que cambian de categoría; `REL-PR-005/-006`; necesita el sistema de límites probado primero) · Q-0001/`CLM-0001` (composición SIPA; exposición **DIRECT**, comparación de extremos sobre varios gobiernos) · Q-0014 (fuente de avisos: bajo riesgo, buen candidato de V1.1 para el régimen C).

---

## 3. Evidencia de la selección (juicio editorial explícito)

Escala 0–3. En «Riesgo de lectura», 3 = riesgo bajo. Solo son hechos las columnas de §2.3; los puntajes son criterio.

| Candidato | Comprensión | Respaldo en corpus | Riesgo de lectura (3 = bajo) | Claridad de límites | Representa la tesis | Total | Lección única |
|---|---|---|---|---|---|---|---|
| Q-0005 (CLM-0006) | 3 | 3 | 2 | 3 | 3 | **14** | Observado con alcance |
| Q-0014 (CLM-0013) | 3 | 3 | 3 | 3 | 2 | **14** | Ausencia de fuente (reserva: régimen C) |
| Q-0013 (CLM-0011) | 2 | 3 | 2 | 3 | 3 | **13** | Insuficiente / no atribuible |
| Q-0011 (sin claim) | 3 | 3 | 2 | 2 | 3 | **13** | No identificable |
| Q-0004 (CLM-0005) | 2 | 3 | 1 | 3 | 3 | **12** | Refutado en su alcance |
| Q-0003 (CLM-0002+0004) | 2 | 3 | 1 | 2 | 2 | **10** | **Multi-claim / nominal ≠ real** (único portador) |
| Q-0008 (CLM-0007) | 3 | 3 | 0 | 2 | 2 | **10** | (reserva) |
| Q-0001 (CLM-0001) | 3 | 2 | 1 | 2 | 1 | **9** | (reserva) |

Q-0003 entra con 10 porque es el **único portador de la lección «más de un claim»** y del contraste nominal/real completo; la regla 4 de §2.1 lo admite con las mitigaciones de §2.4. Q-0014 empata en puntaje pero repite la lección de «insuficiente» que ya enseña Q-0013 y no agrega estados nuevos; queda como primera reserva.

---

## 4. Criterios de aceptación de la V1

La V1 está lista para el **lanzamiento público** cuando:

1. Todos los gates `CORE_BUILD` pasan y todos los gates `RELEASE` pasan **en modo bloqueante** (`WEB-0-INTEGRITY-GATES.md` §1.1), incluidos `verify:pin` y el backup verificado (`G-SRC-06`).
2. Las **5 fichas completas** tienen editorial auditada y las **13 mínimas** solo contienen cadenas auditadas; **ningún enlace del mapa queda muerto** y el régimen C es visible en el mapa, `/limites` y sus fichas.
3. Las 72 limitaciones canónicas de claims tienen disposición (`SHOWN`, o `AUDIT_ONLY` solo para `PROCEDURAL`).
4. No existe ningún literal numérico en editorial fuera de directivas; cada cifra visible es una Figure con Encuadre.
5. **Revisión legal cerrada (OD-03, obligatoria):** licencias y atribuciones resueltas; regla por defecto aplicada a toda fuente sin licencia de redistribución registrada (sin crudos, enlace al publicador, sin permiso asumido, solo derivados compatibles); registro de revisión fechado (`G-LEG-03`).
6. **Responsive/mobile verificado (OD-02, gate de release):** reflow a 320 px y comportamiento mobile real comprobados. **Hasta entonces la V1 no se publica y no se declara WCAG 2.2 AA** (`G-A11Y-01…06`).
7. Presupuestos, SEO, vistas previas (OG), seguridad/CSP, manifest de versión/correcciones y link check completo en verde.
8. **El hero fue elegido por la prueba de comprensión/lectura (OD-06) y auditado.** Mientras OD-06 esté abierta, el hero no se congela.
9. `/versiones` muestra el manifest real y coincide con el release.

---

## 5. Hero

> **OD-06 permanece abierta por diseño.** WEB-0 está congelado, pero **el hero definitivo no se congela**. Candidatos: **`CLM-0006` (candidato primario para la prueba)** y `CLM-0005`. La elección sale de una **prueba de comprensión/lectura**, no de la estética.

### 5.1 Criterios de selección

| # | Criterio | Pregunta que lo decide |
|---|---|---|
| K-1 | Comprensión inmediata | ¿Se entiende sin formación estadística en pocos segundos? |
| K-2 | Respaldo exacto en el corpus | ¿Cada cifra es una Figure con origen estructurado y ancla textual? |
| K-3 | Potencial de Apertura | ¿Hay un número que nace sellado y **otra lectura del mismo dato** (Charter §4)? |
| K-4 | Limitaciones claras | ¿Se puede mostrar el alcance y los límites **en el mismo pliegue**? |
| K-5 | Bajo riesgo de lectura causal | ¿Es difícil leerlo como causa, culpa o mérito? |
| K-6 | Representa la tesis | ¿Ilustra «lo que el dato dice y lo que no»? |
| K-7 | Divulgación manejable | ¿Su exposición previa a los datos puede mostrarse sin romper el hero? |
| K-8 | Neutralidad de ventana | ¿La ventana temporal evita una lectura partidaria evidente? |

### 5.2 Candidatos

| Candidato | Cifras (Figures) | Apertura | K-1 | K-2 | K-3 | K-4 | K-5 | K-6 | K-7 | K-8 | Total /24 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **HC-1** `CLM-0006`: ingreso laboral medio, nominal → real (2025-Q1→2026-Q1) | `35,48 %` → `2,10 %` (brecha `33,38 pp`) | **Natural**: sellado nominal → lectura real | 3 | 3 | 3 | 3 | 2 | 3 | 2 | 2 | **21** |
| **HC-2** `CLM-0005`: proporción de asalariados sin descuento jubilatorio (refutado) | `36,29 %` → `37,90 %` (`+1,61 pp` vs umbral `5 pp`) | Posible: «esperábamos ≥ 5 pp; no ocurrió» | 2 | 3 | 2 | 2 | 1 | 3 | 2 | 2 | **17** |
| HC-3 `CLM-0004`: masa salarial real CGI | `−14,75 %` / `−11,73 %` vs `218,46 %` / `234,30 %` (2024-Q1/Q2) | Natural (nominal → real) pero cifras múltiples y extremas | 2 | 3 | 3 | 2 | 1 | 2 | 2 | 0 | **15** |
| HC-4 `CLM-0001`: composición SIPA 2012→2026 | 3 cifras en pp | Débil (tres números) | 3 | 2 | 1 | 2 | 1 | 1 | 1 | 1 | **12** |
| HC-5 `CLM-0007`: participación del Monotributo | `14,60 → 19,44 %` | Posible | 3 | 3 | 2 | 1 | 0 | 2 | 3 | 1 | **15** |
| HC-6 Conteos del corpus (`18` preguntas, `14` claims, `0` establecidos) | derivados del manifest | **No cumple** (no es «otra lectura del mismo dato») | 3 | 3 | 0 | 3 | 3 | 3 | 3 | 3 | descartado por K-3 |

Notas de hecho que pesan en la puntuación: HC-1 y HC-2 descansan sobre hipótesis con **exposición previa INDIRECT** (divulgación obligatoria, K-7); HC-5 tiene exposición NONE pero el mayor riesgo de lectura (`REL-PR-005`); HC-3 usa dos trimestres de 2024 y valores nominales de magnitud extrema (K-8, riesgo de lectura partidaria y sensacionalista); HC-1 usa la ventana más reciente. El prototipo usó `+35,48 % → +2,10 %` **solo como demostración del lenguaje visual** (Charter §18.1): no es una decisión.

### 5.3 Recomendación

| Pasa a prueba visual/editorial | Motivo |
|---|---|
| **HC-1** (candidato primario para la prueba) | Mejor puntaje; Apertura natural; origen estructurado exacto; ventana reciente; el alcance (EPH, 32 aglomerados urbanos, una ventana, IPC como deflactor) cabe en la cota |
| **HC-2** (alternativa de tesis) | Representa lo más característico de ALETHEIA (lo esperado no ocurrió, dentro de un alcance); exige tratar el riesgo `REL-PR-009` |
| HC-3 | **No recomendado** como hero; sí como hallazgo (H-2) |
| HC-4, HC-5 | No recomendados como hero |
| HC-6 | Descartado (no cumple K-3); se puede usar como texto estructural del mapa |

### 5.4 Condiciones para cualquier hero elegido
1. Cifras como Figures con Encuadre completo (fuente, período, alcance).
2. El texto usa **«ingreso laboral medio declarado en la EPH»**, no «salarios»; menciona los **32 aglomerados urbanos** (HC-1); nunca «Argentina» sin calificar (`REL-PR-013`).
3. Divulgación de exposición previa y limitaciones visibles en el mismo pliegue.
4. Ninguna frase con causa (`creció por…`).
5. Superar la auditoría editorial (Editorial §4) y la prueba de lectura.

### 5.5 Prueba propuesta (no se ejecuta en WEB-0)
Maquetar HC-1 y HC-2 con el lenguaje visual del prototipo y probarlos con al menos 5 lectores sin formación estadística: qué dijo el número; qué **no** dijo; si atribuyeron causa. Umbrales iniciales propuestos: ≥ 80 % distingue nominal de real; 0 atribuye causa; ≥ 80 % recuerda al menos un límite. Los resultados y la elección se registran en el decision log. No se modifica el prototipo en esta fase.
