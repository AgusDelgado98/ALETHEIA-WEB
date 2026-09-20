# WEB-0 · EDITORIAL CONTRACT

| | |
|---|---|
| **Estado** | **FROZEN** (WEB-0 v1.0, 2026-09-19; ver `WEB-0-DECISION-LOG.md` §4). Enmienda 1: fichas mínimas, régimen C visible, regla de licencias |
| **Fecha** | 2026-09-19 |
| **Alcance** | Separación canónico/público, límites de la edición, auditoría y versionado de textos públicos, narrativa con cifras, vocabulario público de estados, reglas de voz |
| **Autoridad visual** | `ALETHEIA-WEB-DESIGN-CHARTER.md` v1.2. Este documento **no** define forma, color, glifo ni movimiento; los referencia. |
| **Precedente** | `reconciliation/public-question-editorial-audit.md` (auditoría de las 18 `public_question`): es el formato de auditoría que este contrato generaliza. |

---

## 1. Dos capas

```text
CANONICAL LAYER                              PUBLIC / EDITORIAL LAYER
extraída del corpus científico               lenguaje para personas
generated/<module>/*.json                    editorial/<module>/**
inmutable para la web                        editable, versionada, auditada
contiene estados, cifras, alcance, límites   contiene palabras
```

La capa editorial **transforma lenguaje**. No es una fuente de hechos.

### 1.1 Lo que la capa editorial NO puede hacer (invariantes)

| # | Prohibido | Cómo se impide |
|---|---|---|
| E-1 | Cambiar el significado de un enunciado canónico | Auditoría con equivalencia semántica obligatoria (§4) |
| E-2 | Ampliar la población | Auditoría; lint de términos de población contra el `scope_statement` |
| E-3 | Ampliar el período | Auditoría; los períodos salen de Figures/Encuadre |
| E-4 | Introducir causalidad | Lint de conectores causales; auditoría; `REL-PR-005`/`-009` |
| E-5 | Subir la fuerza epistemológica | El estado se lee **solo** de `generated/`; no existe campo de estado en editorial |
| E-6 | Cambiar estados | Ídem; `G-STA-04` falla si un registro editorial contiene un campo de estado |
| E-7 | Cambiar cifras | Las cifras no están en el texto: son directivas a Figures (§6) |
| E-8 | Omitir una limitación de alcance | Matriz de cobertura de limitaciones (§5) |
| E-9 | Convertir un proxy en medición directa | Auditoría (dimensión "tipo de medición") |
| E-10 | Convertir categoría administrativa en relación económica, o stock en flujo | Auditoría; `REL-CONF-002`/`-003` |
| E-11 | Presentar como respondible una pregunta no identificable | Auditoría; `answer_kind` derivado (Data Contract §12) |
| E-12 | Afirmar una relación no autorizada entre claims/módulos | Solo se referencian `Relation` de categoría `AUTHORIZED`/`JUXTAPOSITION` con su texto |

---

## 2. Reglas de la transformación permitida

Se permite: simplificar jerga; reordenar cláusulas; reemplazar identificadores por palabras corrientes (`WAGE_BILL` → «masa salarial»); traducir; agregar una glosa **definicional** que no afirme nada nuevo (p. ej. «real (descontada la inflación)»).

No se permite: quitar precisión sustantiva (p. ej. «trabajo visible» → «trabajo registrado» amplía o cambia la pregunta); omitir el «dentro de …» de un alcance; reemplazar un término administrativo por uno económico (`registro dependiente formal` → «asalariado»).

`editorial_transform` (registro por texto): `false` = traducción literal; `true` = redactado en lenguaje común. Cuando es `true`, el texto canónico se conserva visible en el nivel de auditoría de la fila (Design Charter §20.7).

---

## 3. Unidades editoriales

Cada unidad tiene una única fuente de verdad, un estado de aprobación y un requisito de auditoría antes de publicarse.

| Unidad | Fuente de verdad | Estado hoy | Requisito antes de publicar |
|---|---|---|---|
| `public_question` (18) | `editorial/<m>/questions/*.yml` (semilla: `reconciliation/question-map-reconciled.json`) | **Aprobado para V1** (Charter v1.2 §20.7; 9 sin cambios, 9 corregidas) | Registro de auditoría vigente; atado a `canonical_hash` |
| Título público de claim (14) | `editorial/<m>/claims/*.yml` | **Provisorio, sin auditar** (redactado en el prototipo con cifras tipeadas) | Reescribir con directivas a Figures + auditoría |
| `Lo que sí podemos decir` | `editorial/<m>/findings/*.md` | No escrito (el prototipo tiene texto ilustrativo) | Auditoría; solo afirmaciones del claim; cifras vía Figure |
| `Lo que esto NO significa` | ídem | No escrito | Cada ítem cita una limitación o una `prohibited_inference`; ver §5 |
| Limitaciones públicas | `editorial/<m>/limits/*.yml` | **Provisorias**: 53 viñetas a nivel pregunta en el prototipo (frente a 72 limitaciones canónicas de claims) | Matriz de cobertura completa (§5) + auditoría |
| Textos de resultado documental (sin claim) | `editorial/site/states.yml` | Provisorio (3 textos + 1 nota de Q-0004) | Auditoría |
| Etiquetas de estado | `editorial/site/states.yml` | Propuestas (Charter §20.4) | Auditoría (§7) |
| Introducciones, Método, Sobre, Límites globales | `editorial/site/*.md` | No escritos | Auditoría |
| **Hero** | `editorial/site/hero.yml` | **No elegido** (criterios y candidatos en `WEB-0-MVP.md` §5) | Prueba visual/editorial + auditoría |
| Alias y `semantic_id` | `editorial/<m>/…` | No escritos | Auditoría (no pueden cambiar el sentido) |

**Deuda editorial medida (prototipo → V1):** 14 títulos de claim + 53 viñetas de límites + 4 textos de resultado documental + etiquetas + toda la prosa de Home, hallazgos, Método y Sobre. Ninguno de estos textos puede publicarse sin registro de auditoría. Solo las 18 `public_question` lo tienen.

**Fichas mínimas (OD-05).** Las 13 fichas mínimas del MVP usan **únicamente cadenas ya auditadas** (`public_question`, titular de claim, resultado documental, límites `SHOWN`, calificadores, avisos de alcance). No requieren prosa nueva. Las cifras que muestren son Figures con Encuadre, o no se muestran. Sus 9 titulares de claim (los de `CLM-0001`, `0003`, `0007`, `0008`, `0009`, `0010`, `0012`, `0013`, `0014`) son parte del lote de auditoría pendiente (OD-07).

---

## 4. Auditoría y versionado

### 4.1 Registro de auditoría (uno por texto público)

```text
audit_record
  string_id            p. ej. labor/LAB-Q-0005#public_question
  canonical_ref        global_id del objeto canónico
  canonical_hash       sha256 del texto canónico extraído (atadura)
  text_hash            sha256 del texto público auditado
  revision             entero, monótono
  dimensions           semantics · causality · population · period · measurement_type · evidence_strength   → PASS|FAIL
  figures_ok           todas las cifras son directivas a Figure existentes
  state_unchanged      el texto no contiene ni implica cambio de estado
  reviewer, date       quién y cuándo
  verdict              APPROVED | REVISED_AND_APPROVED | REJECTED
  notes                una línea por corrección (qué se corrigió)
```

### 4.2 Atadura por hash (detección de drift)

Cada texto público lleva el `canonical_hash` del canónico del que deriva. Si un nuevo pin cambia el canónico, el registro queda **obsoleto** (`stale`) y el gate `G-EDI-01` bloquea el build hasta reauditar. Así el copy no puede quedar apoyado en un canónico que ya no es el vigente.

### 4.3 Versionado

- Git es el historial; además cada unidad lleva `revision` explícita.
- Las revisiones anteriores **no se borran**: el registro de auditoría es solo-append.
- `editorial/manifest.json` (hash de cada archivo editorial y de cada registro) entra al `release.json`.
- Cambiar un texto aprobado requiere repetir la auditoría; cambiar su significado es una corrección de clase C2/C4 (`WEB-0-ARCHITECTURE.md` §8.3).

### 4.4 Independencia del revisor

Regla: autor ≠ revisor. Como el proyecto hoy tiene una sola persona autora, hasta que exista un segundo revisor humano se exige: (a) auditoría mecánica completa (gates), (b) revisión adversarial documentada en el registro, y (c) declaración explícita en `notes` de que el revisor coincide con el autor. Ver OD-14.

---

## 5. Límites: nada se omite en silencio

Las limitaciones canónicas no llevan clasificación (son texto). La clasificación y la disposición son **editoriales, auditadas y obligatorias**.

```text
limit_disposition (por Limitation canónica)
  limitation_id
  class:        SCOPE | POPULATION | PERIOD | MEASUREMENT | CAUSAL | INDEPENDENCE | COMPARABILITY | DATA_QUALITY | PROCEDURAL
  disposition:  SHOWN | AUDIT_ONLY
  public_ref:   id del texto público que la cubre (si SHOWN; varias limitaciones pueden compartir un texto)
  waiver_reason (solo AUDIT_ONLY)
```

Reglas:

1. **Cobertura total:** toda `Limitation` canónica de un claim tiene disposición. Hoy hay 72 (claims) + 19 (preguntas). El prototipo muestra 53 viñetas condensadas a nivel pregunta: **no alcanza** para cubrir 72.
2. **`AUDIT_ONLY` solo para `PROCEDURAL`** (p. ej. «Single Evidence Root; not eligible for CONVERGENT…»): informa al auditor y aparece en el nivel Auditoría del Rastro; nunca desaparece. Las clases `SCOPE`, `POPULATION`, `PERIOD`, `MEASUREMENT`, `CAUSAL`, `INDEPENDENCE`, `COMPARABILITY` y `DATA_QUALITY` son **siempre `SHOWN`**.
3. **Condensar es válido; omitir no.** Un texto público puede cubrir varias limitaciones canónicas si cada una queda expresada en él; la auditoría lo verifica.
4. **Junto al dato** (Charter §17): las limitaciones `SHOWN` de un claim se renderizan en la misma pantalla que sus cifras; no en un pie de página.
5. **Ninguna ficha sin al menos un límite** (Charter §11.1) y **ninguna Figure sin su Encuadre**.
6. **Divulgación de exposición previa a los datos.** Las hipótesis con `PRIOR_DATA_EXPOSURE` `DIRECT` o `INDIRECT` (5 de 9) exigen divulgación en la página del claim (`disclosure_required`). No se presenta la preinscripción como salvaguarda (`REL-PR-011`).
7. **Brecha pregunta–claim.** Cuando el `scope_statement` de un claim es más estrecho que la pregunta que resuelve, la página lo dice explícitamente junto a la resolución. Caso medido: **Q-0004** (la pregunta es la composición global del trabajo observable al sumar la EPH; el claim mide una variable indirecta, en asalariados, en dos trimestres), y en menor grado Q-0001, Q-0005 y Q-0008. La etiqueta «Refutada dentro de su alcance» es de la pregunta pero se refiere a la hipótesis; el aviso de alcance es obligatorio (Charter §20.3, regla 6).
8. **Sin conteo de raíces.** No se muestra «N fuentes» ni número de raíces: el IPC es deflactor (no cuenta como raíz) y hay raíces no independientes (`CLM-0007`). Se muestra el texto `lineage_independence` y los deflactores se distinguen (`G-PRV-06`).

---

## 6. Narrativa con cifras

**Principio congelado:** ninguna cifra sustantiva existe solo como texto editorial. El texto público referencia el ID de una Figure; el valor y su formato los pone el renderizador.

- **Regla del editor:** el texto editorial no contiene literales numéricos. Un lint (`G-FIG-02`) rechaza dígitos fuera de directiva, con una lista de excepciones versionada (IDs de entidad como `Q-0003`, números de versión de release, y numerales estructurales provistos por `{{count …}}` desde el manifest: «18 preguntas», «14 claims»).
- Los **períodos** también son datos sustantivos: se toman del período de la Figure/Encuadre; años sueltos en prosa requieren directiva (regla exacta en WEB-1).
- **Sintaxis no congelada.** Ejemplo conceptual (no vinculante): `El ingreso medio creció {{fig:…nominal}} nominal y {{fig:…real}} una vez descontada la inflación.`
- El renderizador agrega, junto a la cifra, lo que la Figure declara: nominal/real, período, fuente, alcance (Encuadre).
- Una prosa que **compare** magnitudes entre claims está prohibida (`REL-PR-012`); la yuxtaposición solo procede si existe una `Relation` `JUXTAPOSITION_ONLY` o `AUTHORIZED` que la habilite, con su texto.

---

## 7. Vocabulario público de estados

Las etiquetas son **traducciones editoriales** de valores que ya existen en el corpus; no crean estados. La forma visual de cada estado la define el Design Charter §8 (no se redefine aquí); la mecánica de etiquetas y reglas está en el Charter §20.3–§20.4, que este documento ratifica.

### 7.1 Estado de claim (`claim_epistemic_state`)

| Código | Etiqueta pública | Forma (Charter §8) | `absent_vs_negative` |
|---|---|---|---|
| `OBSERVED_IN_SOURCE` | Observado en la fuente | hilo sólido → ■ macizo | `OBSERVATION_WITHIN_SCOPE` (o `NOT_A_MEASUREMENT_OF_THE_LABOUR_MARKET` si `claim_kind` no es medición) |
| `REFUTED_WITHIN_SCOPE` | Refutado dentro de su alcance | ■ de borde discontinuo | `NEGATIVE_WITHIN_SCOPE` |
| `INSUFFICIENT_EVIDENCE` | Evidencia insuficiente | corte → punteado → ■ hueco | `ABSENT_NOT_NEGATIVE` |
| `ESTABLISHED_WITHIN_SCOPE` · `CONVERGENT` · `DIVERGENT` | (etiquetas reservadas; **0 casos en `labor@1.0.0`**) | — | — |

Calificador de texto para `OBSERVED_IN_SOURCE` con `claim_kind` ≠ medición (`CLM-0008`, `0009`, `0010`, `0012`): «Hallazgo documental: no es una medición del mercado laboral». Misma forma; el calificador va en texto.

### 7.2 Resolución de pregunta / estado documental (`question_resolution`)

| Código | Capa | Etiqueta pública | Forma |
|---|---|---|---|
| `OBSERVED_IN_SOURCE` / `REFUTED_WITHIN_SCOPE` / `INSUFFICIENT_EVIDENCE` | derivada de claim(s) | las de §7.1, en femenino cuando aplica («Refutada dentro de su alcance») | según §7.1 |
| `NOT_IDENTIFIABLE` | documental (pregunta) | No identificable con las fuentes conocidas | zona rayada, sin ■ |
| `BLOCKED_BY_DESIGN` | documental (pregunta) | Bloqueada por diseño (sin métrica preregistrada) | tope ▎, sin ■ |
| `OUTSIDE_LAB_A` (+ `NO_DESIGN`) | documental (pregunta) | Abierta: no ejecutada (sin diseño de identificación) | hilo punteado → ▽, sin ■ |

### 7.3 Reglas de uso

1. **Dos capas, nunca mezcladas:** un estado documental de pregunta no aparece como estado de claim ni recibe ■.
2. **Longitud completa:** «Observado en la fuente», nunca «Observado» (Charter §16).
3. **Modo de fallo de nombre:** la palabra «establecido/a» **no puede** aparecer sin calificador. `ESTABLISHED` es además el estado de una *celda de mapeo regulatorio* de `CLM-0009` (11 celdas), distinto de `ESTABLISHED_WITHIN_SCOPE` (0 claims). Mostrar «11 establecidas» sin contexto sugeriría claims establecidos: `G-STA-06` lo bloquea y el rótulo de celda queda pendiente (OD-09).
4. **Absent ≠ negative** se explicita en el texto de toda ausencia: «Ausencia, no resultado negativo».
5. **Cero** `ESTABLISHED_WITHIN_SCOPE`, `CONVERGENT`, `DIVERGENT` para `labor@1.0.0` (invariante de módulo, `G-STA-01`).

### 7.4 Semántica visual
Sin rediseño: todas las formas, rellenos y cortes salen del Charter §8; el verdigris sigue reservado a *abrir/revelar/activo* (§10) y nunca codifica estado. Cualquier estado nuevo de un módulo futuro requiere una enmienda del Charter **antes** de mostrarse.

---

## 8. Voz y lenguaje

Base: Charter §16 (español rioplatense neutro, oraciones cortas, voz activa; nombres por lo que el usuario entiende). Reglas editoriales adicionales:

1. **Verbos protegidos.** Sin alcance explícito dentro del claim, no se usan: *establece, confirma, demuestra, prueba, corrobora, explica, causa, impulsa, «es consistente con»* (entre claims o regímenes), *«el mercado laboral argentino muestra»* (lista heredada de `LAB-S0-synthesis-rules.json`, `LANGUAGE_GUARDRAILS`; documentación de LAB-S, no texto del Charter del corpus).
2. **Cada afirmación lleva su alcance** (fuente, período, población) junto a ella.
3. **Ningún régimen A cubre «el mercado laboral»** (`REL-PR-013`): p. ej. la EPH cubre 32 aglomerados urbanos; se dice.
4. **Sin tono partidario o sensacionalista**; sin adjetivación de magnitud («se disparó», «se desplomó»).
5. **Preguntas que despiertan curiosidad sin prometer más de lo que el corpus resuelve.**
6. **Ausencia**: «no se identificó…», nunca «no existe…» (`REL-CONF`, `KEEP-003`).
7. **Prometer una función futura** (Ask, nuevos módulos) es una afirmación pública: requiere auditoría y no puede prometer plazo (OD-17).
8. **«Real» es ambiguo en español.** «Nominal vs real» invita a leer lo nominal como irreal. «Real» se escribe siempre con su glosa («real, descontada la inflación») y nunca «el número real/verdadero». La lectura revelada por la Apertura es **otra lectura del mismo dato**, no «la verdadera».
9. **Conteos sí, puntajes no.** Se permiten conteos por estado (con `{{count}}`), nunca porcentajes, razones, índices ni rankings de claims (`REL-PR-010`; `G-FIG-05`).
10. **Régimen C visible y sin maquillaje (OD-13).** Se muestra tal cual en el mapa, `/limites`, sus fichas mínimas y el Método cuando sea relevante: no produjo corpus empírico (0 avisos, 0 fuentes admitidas, 0 raíces). No se convierte en vitrina cuantitativa ni se lo describe como «no existe»: «no se identificó una fuente admisible dentro del alcance evaluado».
11. **Fuentes sin licencia de redistribución registrada (OD-03).** El texto público no ofrece descarga ni redistribución de datos crudos, enlaza al publicador y no afirma ni insinúa permisos: solo contenido derivado compatible con el contrato de datos y revisado legalmente (`G-LEG-03`).

---

## 9. Hero

El hero es contenido editorial de máximo riesgo. Reglas:

1. Se elige **después** de una prueba visual/editorial entre los candidatos preseleccionados (`WEB-0-MVP.md` §5); no por estética.
2. Su cifra es una **Figure** con Encuadre completo (fuente, período, alcance).
3. Las **limitaciones y la divulgación de exposición previa** se muestran en el hero, no debajo del pliegue.
4. Debe superar la auditoría de §4 más una prueba de lectura causal («¿qué entendió alguien sin formación?»).
5. Los datos del hero siguen **fuera de congelamiento** (Charter §18.1) hasta esa decisión. **OD-06 permanece abierta por diseño** aun con WEB-0 congelado.

---

## 10. Control de cambios

| Cambio | Clase | Qué se exige |
|---|---|---|
| Tipografía, puntuación, sin cambio de sentido | C1 | Diff + gate de hashes |
| Redacción de un texto aprobado | C2 | Auditoría completa (§4) + entrada de changelog |
| Corrección de un error de significado publicado | C4 | Reauditoría + aviso público de corrección (`WEB-0-ARCHITECTURE.md` §8.3) |
| Nuevo tipo de unidad editorial o nueva sintaxis de cifras | Enmienda de este contrato | ADR |

Las decisiones de este contrato se modifican solo por enmienda fechada y aprobación explícita del autor (mismo régimen que el Design Charter §19).
