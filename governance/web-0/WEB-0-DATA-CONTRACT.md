# WEB-0 · DATA CONTRACT

| | |
|---|---|
| **Estado** | **FROZEN** (WEB-0 v1.0, 2026-09-19; ver `WEB-0-DECISION-LOG.md` §4). Enmienda 1: respaldo verificable (OD-12) y regla de licencias por defecto (OD-03) |
| **Fecha** | 2026-09-19 |
| **Alcance** | Cadena de datos, reproducibilidad, entidades, provenance, cifras, relaciones, módulos y preparación para Ask |
| **No cubre** | Copy público (→ `WEB-0-EDITORIAL-CONTRACT.md`), stack y rutas (→ `WEB-0-ARCHITECTURE.md`), gates (→ `WEB-0-INTEGRITY-GATES.md`) |
| **Fuentes leídas para escribirlo** | Solo `ALETHEIA-LABOR @ aletheia-labor-v1.0.0` (commit `ca6a85e12b05df28e73e60ac406c90ad16352ed3`) y `ALETHEIA V1 @ aletheia-research-foundation-v1.0.0` (commit `2da6a2b59cf08ef23b0fc68dce394b46626b5f12`), por `git show` / `git ls-tree`. Ningún repo científico fue modificado. |

Los conteos y hallazgos de este documento (§13) se midieron contra esos tags; no se infirieron de resúmenes.

---

## 1. Principios

1. **El corpus científico es la única fuente de hechos.** La web solo lo extrae, normaliza, valida, presenta y (en la capa editorial) lo traduce a lenguaje para personas.
2. **Cada objeto lleva su origen.** Sin provenance suficiente, no entra al corpus web.
3. **Nada se calcula en la web.** No hay aritmética nueva (diferencias, razones, promedios, redondeos de otro tipo) sobre valores del corpus. Solo se formatean valores ya registrados.
4. **Nada se infiere por parecido de nombres.** Toda relación entre objetos viene de un registro directo del corpus; si no existe, el vínculo se declara `UNRESOLVED` y se muestra como tal.
5. **Estado de pregunta y estado de claim son campos distintos** y nunca se derivan uno del otro en silencio.
6. **Los módulos no se tocan entre sí** sin una relación gobernada (§11).
7. **Determinismo.** Mismas entradas fijadas → mismos bytes de salida, en cualquier máquina.

---

## 2. Cadena canónica

```text
frozen research corpus   (git objects de los tags fijados; nunca el working tree)
        │  S0 PIN         pins/*.pin.json                      [manual, revisado]
        ▼
      extract             corpus-src/<repo>@<commit>/…          [copia byte a byte, verificada por blob sha]
        │
        ▼
     normalize            tipos canónicos, IDs, Figures, Limitations, Relations
        │
        ▼
      validate            esquemas + integridad referencial + conteos + invariantes   [gates G-SRC, G-GEN, G-SCH, G-REF, G-STA, G-PRV]
        │
        ▼
     web corpus           generated/<module>/*.json + manifest.json                    [determinista, commiteado]
        │
        ▼
  editorial layer         editorial/<module>/**  (+ audit records atados por canonical_hash)   [gates G-EDI, G-LIM, G-FIG]
        │
        ▼
      render              sitio estático + índice de búsqueda + release.json           [gates G-UX, G-A11Y, G-PERF, G-SEC, G-REL]
```

### 2.1 Clases de artefacto

| Clase | Qué es | Quién puede escribirlo | Ejemplos | ¿Versionado en git? | ¿Editable a mano? |
|---|---|---|---|---|---|
| **Fuente científica** | Corpus congelado en sus repos de origen | Nadie desde la web (solo lectura) | `ALETHEIA-LABOR @ tag`, `ALETHEIA V1 @ tag` | En su propio repo | No |
| **Pin** | Declaración de qué versión exacta de la fuente se consume y qué archivos | Humano, con revisión | `pins/labor.pin.json` | Sí | Sí (cambio = ADR) |
| **Fuente vendorizada** | Copia byte a byte de los archivos consumidos | Solo `extract` | `corpus-src/labor@ca6a85e/metadata/claims/claim-ledger.json` | Sí | **No** |
| **Respaldo verificable** | Copia de recuperación de un repo fuente (`git bundle`) y su manifest. **No es fuente de verdad** (§3.4) | Herramienta de backup + autor | `backup/manifests/BACKUP-MANIFEST.json` | Manifests: sí · bundles: **no** (fuera del repo) | **No** |
| **Derivado reproducible** | Corpus web normalizado | Solo `normalize`/`validate` | `generated/labor/questions.json` | Sí | **No** |
| **Copy editorial** | Lenguaje público, auditado | Humanos (autor + revisor) | `editorial/labor/questions/LAB-Q-0005.yml` | Sí | Sí, con auditoría |
| **Registro de auditoría editorial** | Prueba de que un texto público fue revisado contra su canónico | Humanos | `editorial/labor/audit/…` | Sí | Solo append |
| **Assets visuales** | Fuentes, tokens, sprite de glifos, SVG de figuras | Humanos / build | `public/fonts/*.woff2`, `design/tokens.css` | Sí (fuentes y tokens) | Sí (tokens: por enmienda del Charter) |
| **Manifests** | Inventario con hashes de cada capa | Solo herramientas | `generated/labor/manifest.json`, `editorial/manifest.json`, `releases/web-1.0.0.json` | Sí | **No** |
| **Hashes** | Sumas de verificación | Solo herramientas | dentro de los manifests | — | **No** |
| **Build artifacts** | Sitio, índice de búsqueda, reportes de gates | CI | `out/`, `reports/gates/` | **No** (efímeros) salvo el release manifest | No |

### 2.2 Qué deja de existir

- **Números tipeados a mano en el contenido editorial.** Ver §9 (Figures) y el hallazgo F-03 del `WEB-0-DECISION-LOG.md`.
- **Scripts que dependan de un scratchpad, una ruta de usuario o el orden del filesystem.** Ver §4.
- **Lectura del working tree de un repo científico.** Ver §3.3.

---

## 3. Pins y vendorización

### 3.1 Pins

Dos pins independientes (cada repo científico tiene su propio commit):

```text
pins/labor.pin.json
  repo_id:        "ALETHEIA-LABOR"
  tag:            "aletheia-labor-v1.0.0"
  commit:         "ca6a85e12b05df28e73e60ac406c90ad16352ed3"     ← autoridad
  tree:           <tree sha, registrado por la herramienta en el primer pin>
  files:          [ { path, blob_sha, bytes } … ]                   ← lista exacta de archivos consumidos

pins/v1.pin.json
  repo_id:        "ALETHEIA-V1"
  tag:            "aletheia-research-foundation-v1.0.0"
  commit:         "2da6a2b59cf08ef23b0fc68dce394b46626b5f12"
  files:          [ solo los provenance.json de fuentes referenciadas ]
```

- La **autoridad es el commit**, no el nombre del tag: el tag se verifica contra el commit, no al revés.
- El pin lista **cada archivo consumido** con su `blob_sha` de git. Agregar un archivo al consumo cambia el pin y exige ADR.
- V1 se lee solo para `data/raw/*/provenance.json` (URL oficial, licencia, sha256 recorded). Nunca se copian datos crudos, `standardized/` ni `evidence/` de V1.

### 3.2 Vendorización (S1 `extract`)

`extract` copia byte a byte los archivos del pin a `corpus-src/<repo>@<commit-corto>/<ruta original>`, verifica `blob_sha` contra git y `sha256` contra el manifest de extracción, y falla ante cualquier diferencia.

**Por qué vendorizar.** LABOR no tiene remoto (`docs/storage-policy.md` del corpus: el repo vive en una sola máquina). Sin copia, la reproducibilidad de la web depende de que esa máquina exista y sea accesible. Con la copia (~1 MB de JSON/MD; sin datos crudos), el repo web es autocontenido:

- **Offline:** `normalize → validate → manifest` se reejecuta solo desde `corpus-src/`. La integridad se verifica contra los `blob_sha`/`sha256` del pin.
- **Con acceso a LABOR:** `verify:pin` además compara `corpus-src/` contra los git objects del tag (prueba de no-drift contra la fuente).

### 3.3 Reglas de lectura de los repos científicos

1. Solo `git rev-parse`, `git cat-file`, `git ls-tree`, `git show` sobre objetos. **Nunca checkout, nunca lectura del working tree**, nunca escritura.
2. **Motivo verificado, no teórico:** hoy el working tree de V1 contiene un archivo *untracked* (`ALETHEIA_FORENSIC_AUDIT_2026-09-17.md`) que no pertenece al tag. Un extractor que leyera el working tree mezclaría contenido ajeno al freeze.
3. Antes y después de `extract`/`verify:pin` se registra `HEAD`, `refs` y `git status --porcelain` de cada repo. La corrida falla si algo cambió respecto del estado previo (se tolera el estado sucio previo de V1; no se tolera *cambio*). Gate `G-SRC-04`.
4. La herramienta rechaza escribir bajo la ruta de cualquier repo fuente.

### 3.4 Respaldo verificable de las fuentes (OD-12, aprobada)

**Principio.** Un backup es una **copia de recuperación, no una fuente**. La autoridad canónica sigue siendo **repo + tag + commit + manifest/hash** (§3.1). Un repo restaurado desde un backup solo es aceptable como acceso de solo lectura **si cumple `G-SRC-01/02`** (mismo commit, mismos `blob_sha`): la identidad es el contenido, no la ruta ni la copia. Los repos congelados **no se modifican** para respaldarlos.

**Estrategia (preferencia aprobada: `git bundle` + SHA-256 + manifest de backup).**

1. Por cada repo fuente (LABOR, V1): un `git bundle` completo (`--all`: tag y ramas), creado con acceso de solo lectura y escrito **fuera** de los repos.
2. `sha256` de cada bundle y salida de `git bundle verify`.
3. `BACKUP-MANIFEST.json` con la autoridad (repo, tag, commit, tree), los archivos, sus hashes, las versiones de herramientas y los resultados de verificación.
4. **≥ 2 copias en ubicaciones independientes, fuera de la máquina principal** (destinos a elegir por el autor). Si el destino es nube: cifrar en reposo y registrar por separado el hash del bundle **sin cifrar** y el del artefacto cifrado.
5. **Prueba de restauración:** clonar el bundle en una carpeta nueva y verificar que el tag resuelve al commit de autoridad, `git fsck`, mismo `tree` y mismos `blob_sha` de los archivos pineados. El resultado queda en el manifest.
6. **Cadencia:** antes del primer pin real (precondición de WEB-1), en cada corte de release y ante cualquier pin nuevo.

**Forma de los comandos** (solo lectura sobre los repos; con `GIT_OPTIONAL_LOCKS=0`, y snapshot de `HEAD`/refs/`status` antes y después, `G-SRC-04`). *WEB-0 no ejecuta el backup:*

```text
git -C <repo> bundle create <destino>/<repo>-<fecha>.bundle --all
git bundle verify <destino>/<repo>-<fecha>.bundle
sha256sum <destino>/<repo>-<fecha>.bundle
git clone <destino>/<repo>-<fecha>.bundle <carpeta-nueva>        # prueba de restauración
```

**Medido hoy (para planificar; el bundle aún no existe):**

| Repo | Refs | Remoto | `size-pack` | Tag → commit / tree |
|---|---|---|---|---|
| ALETHEIA-LABOR | `main` + `aletheia-labor-v1.0.0` | ninguno | 758 KiB | `ca6a85e…` / `6150649a…` |
| ALETHEIA V1 | `main` + `aletheia-research-foundation-v1.0.0` | ninguno | **1,64 GiB** (1 pack + 146 objetos sueltos) | `2da6a2b…` / `05932955…` |

El bundle de V1 será del orden del pack (estimación); conviene prever capacidad en cada destino. V1 incluye sus datos crudos en el historial; LABOR no.

**Artefacto referenciado pero no versionado (hallazgo).** `ALETHEIA_FORENSIC_AUDIT_2026-09-17.md` está en V1 como archivo *untracked* (fuera del tag) y el tag de LABOR lo referencia en 9 archivos (p. ej. `metadata/v1/v1-reference.json` → `V1_AUDIT_REPORT`). **Un bundle no lo incluye** y **LABOR no registra su hash**. El manifest lo lista en `referenced_untracked` con un `sha256` **calculado al respaldar** y etiquetado como tal (no es un hash original ni retroactivo). Medición del 2026-09-19: 43.178 bytes, `80c565289cc072bc9c5615425b7199fe00165f691e1472ef27cbcb94fdc5afee`.

**Esquema de `BACKUP-MANIFEST.json`** (campos; sintaxis final en WEB-1):

```text
schema, purpose: "recuperación ante desastres; NO es fuente de verdad"
authority[]:        { repo_id, tag, commit, tree }                    ← leído de git al respaldar
items[]:            { repo_id, bundle_file, bundle_bytes, bundle_sha256, bundle_kind: "git bundle --all",
                      refs[] (git bundle list-heads), verify_result, git_version, created_utc }
referenced_untracked[]: { path, sha256 (computed_at_backup), bytes, referenced_by[] }
copies[]:           { location_label, medium, copied_utc, sha256_reverified_utc, sha256_match }
restore_test:       { performed_utc, tag_resolves_to_authority_commit, tree_equal, fsck_ok, pinned_blobs_checked, mismatches }
```

Los **manifests** viven en `backup/manifests/` de `ALETHEIA-WEB` (solo *append*); los bundles **no** entran al repo (`G-LEG-01` los rechaza). Gate: `G-SRC-06` (`RELEASE`).

---

## 4. Reproducibilidad

### 4.1 El problema concreto que resuelve

El generador del prototipo (`reconciliation/build_map.py`) quedó obsoleto y **no puede sobrevivir**:

| Defecto | Por qué es inaceptable | Cómo lo cierra WEB-0 |
|---|---|---|
| Lee `scratchpad/frozen/LAB-S0-inventory.json`, ruta temporal de una sesión | Depende de una persona/sesión | Todo insumo sale de `corpus-src/` con pin |
| El copy editorial (textos, **cifras**) está incrustado como diccionarios Python en el generador | Mezcla derivación y edición; las cifras están tipeadas | Editorial vive en `editorial/`, atado por hash; las cifras salen de Figures |
| `reconcile.py` lee LABOR directamente, sin pin | No verifica qué versión leyó más allá del tag | Pin por commit + blob shas |
| Sin versión de generador ni manifest | No se puede probar qué produjo qué | `generator_version` + hash del código fuente del generador en el manifest |
| Salida no verificada contra una fuente independiente | Sin prueba de no-drift | Golden test contra la reconciliación aceptada (§4.4) |

### 4.2 Reglas de determinismo

1. **JSON canónico**: UTF-8 sin BOM, `\n`, claves ordenadas, sin espacios finales, sin `NaN`/`Infinity`; números representados como recorded (cadena o número según §9); arrays ordenados por ID salvo que el orden sea semántico (y entonces se documenta y se conserva el orden del corpus).
2. **Sin tiempo real.** Ningún `now()`. Si hace falta una fecha, se usa `SOURCE_DATE_EPOCH` = fecha del commit fijado. `generated_at` no existe en el corpus; las fechas de build viven solo en el release manifest.
3. **Sin rutas absolutas, nombres de host, usuario ni locale** en ningún archivo generado.
4. **Sin red.** El generador corre con red deshabilitada; falla si intenta abrirla.
5. **Herramientas fijadas**: lockfile, versión de runtime en `.nvmrc`/`engines`, `npm ci --ignore-scripts`.
6. **Orden explícito** de todo (no orden del filesystem, no orden de inserción de un diccionario no especificado).

### 4.3 Versionado del generador

`generator_version` (semver) + `generator_source_sha256` (hash del árbol de `tools/corpus/`). No se usa el commit de git del repo web dentro de archivos que ese commit contiene (circular).

### 4.4 Prueba de equivalencia con el prototipo (golden test)

La reconciliación aceptada (`reconciliation/question-map-reconciled.json`, sha256 en `SHA256SUMS.txt`) se importa como **fixture de regresión, no como fuente**: la salida del generador nuevo debe coincidir, para las 18 preguntas y 14 claims, en IDs, mapeo pregunta→claims, estados de claim, resolución de pregunta y `hypothesis_ids`. Si difiere, gana el tag y se investiga la diferencia.

### 4.5 Criterio de reproducibilidad (definición operativa)

> Desde un checkout limpio de `ALETHEIA-WEB` **sin** acceso a LABOR: `corpus:build` produce `generated/labor/` con hashes idénticos a los commiteados.
> Desde un checkout limpio **con** acceso de solo lectura a los tags: además `verify:pin` confirma que `corpus-src/` es idéntico a los objetos del tag.
> Dos corridas consecutivas, en máquinas distintas, producen el mismo `manifest.json`.

---

## 5. Envelope de provenance

Todo objeto del corpus web lleva:

```text
provenance:
  source_repo:      "ALETHEIA-LABOR" | "ALETHEIA-V1"
  tag:              "aletheia-labor-v1.0.0"
  commit:           "ca6a85e12b05df28e73e60ac406c90ad16352ed3"
  source_path:      "metadata/claims/claim-ledger.json"          ← ruta dentro del repo fuente
  source_id:        "LAB-CLM-0006"                                ← ID del registro dentro del archivo, si existe
  source_pointer:   "/5"                                          ← JSON Pointer / posición, para localizar sin ambigüedad
  blob_sha:         "<git blob sha del archivo en el tag>"        ← intrínseco de git, no inventado
  recorded_hashes:  [ { file, sha256 } ]                          ← SOLO si el propio corpus los registra
  extracted_sha256: "<sha256 de los bytes extraídos>"             ← calculado por el generador
  generator_version:"…"
```

### 5.1 Política de hashes (no se inventan hashes retroactivos)

| Campo | Origen | Qué significa | Qué NO significa |
|---|---|---|---|
| `blob_sha` | git, del pin | Identidad del archivo en el tag | — |
| `recorded_hashes` | El corpus (p. ej. `EVIDENCE.INPUT_HASH`, `DATASET_RELEASE`) | Hash que **los autores del corpus registraron** de un insumo | No lo recalcula la web; si el corpus no lo registró, el campo está **vacío** |
| `extracted_sha256` | Generador, en la extracción | Los bytes que la web leyó | **No** es el hash del dato crudo original ni de la publicación del organismo |

Regla dura: ningún campo con nombre `*_hash` puede llenarse con un valor que no provenga de una de esas tres fuentes. Gate `G-PRV-02`.

---

## 6. IDs

```text
global_id = "<module>/<id>"            p. ej.  labor/LAB-Q-0003
id_origin = CORPUS | DERIVED
```

- `CORPUS`: el ID existe tal cual en el corpus (`LAB-Q-0003`, `LAB-CLM-0004`, `LAB-HYP-0009`, `LAB-EVD-…`, `LAB-ROOT-…`, `LAB-SRC-…`, `LAB-OBJ-…`, `REL-…`, `KEEP-…`, `LAB-GOV-…`).
- `DERIVED`: el corpus **no** trae ID y el generador lo asigna de forma determinista. Aplica a `Limitation` y `Figure`. Se marcan `id_origin: DERIVED` y **nunca** se presentan como IDs del corpus.
- Regla de derivación de `Limitation`: `lim.<owner_id>.<sha256(texto verbatim)[:8]>`. Es estable ante reordenamientos y cambia solo si cambia el texto.
- Los IDs de `CORPUS` se validan por patrón; los `DERIVED` por recomputación.

---

## 7. Entidades

Convención: `canonical` = extraído del corpus; nada editorial vive en estas entidades. Todas llevan `global_id`, `id_origin`, `provenance` (§5).

### 7.1 Question

| Campo | Origen |
|---|---|
| `id`, `regime` (A/B/C), `class` (DESCRIPTIVE/COMPARATIVE/CAUSAL) | `metadata/questions/question-ledger.json` |
| `canonical_text`, `canonical_title` | ídem (`TEXT`, `TITLE`) |
| `ledger_status` | ídem (`STATUS`). **Registrado, nunca mostrado como resultado.** |
| `claim_ids[]` (**0..N**, orden por ID) | derivado de `claim-ledger.json` por `QUESTION_ID` (registro directo del lado del claim) |
| `hypothesis_ids[]` | `hypothesis-registry.json` por `QUESTION_ID`; se verifica que coincida con `RELATED_HYPOTHESES` |
| `object_ids[]`, `identification_requirements[]`, `known_breaks[]`, `causal_identification_status` | ledger de preguntas |
| `limitation_ids[]` | `KNOWN_LIMITATIONS` → `Limitation` |
| `resolution` | **ver §8** — campo separado |
| `absent_vs_negative` | S0 (`ABSENT_VS_NEGATIVE`), verificado contra el mapeo por estado de `LAB-S0-synthesis-rules.json` |
| `preserved_result_ids[]` | `LAB-S0-preserved-results.json` |

### 7.2 Claim

| Campo | Origen |
|---|---|
| `id`, `question_id` (**exactamente 1**), `hypothesis_id?` | `claim-ledger.json` |
| `epistemic_state` | `STATE` (**ver §8**) |
| `claim_kind` | S0 (`STATISTICAL_MEASUREMENT`, `SCOPING_OR_EXISTENCE_FINDING`, `REGULATORY_TEXT_MAPPING`, `DESIGN_STAGE_ANALYSIS_NOT_A_MEASUREMENT`, `HYPOTHESIS_NOT_COMPUTABLE`, `SOURCE_AVAILABILITY_FINDING`) — etiqueta documental de S0, no estado de ciclo de vida |
| `canonical_text`, `scope_statement`, `what_would_unseat` | ledger |
| `limitation_ids[]` | `LIMITATIONS` → `Limitation` |
| `evidence_ids[]`, `object_ids[]`, `root_ids[]`, `deflator_root_ids[]` | ledger / S0 |
| `lab_gov[]`, `v1_gov[]`, `not_eligible_for[]`, `lineage_independence`, `scope_coverage_adequacy`, `shared_coverage_bias` | ledger |
| `source_label` | `SOURCE` tal cual (`"EPH+IPC"`); **es texto, no una clave de join** |
| `figure_ids[]` | derivado (§9) |

### 7.3 Hypothesis

`id`, `question_id`, `prior_data_exposure` (`DIRECT`/`INDIRECT`/`NONE`), `disclosure_required`, `metric`, `operational_definition`, `expected_observation`, `failure_condition`, `candidate_sources`, `known_breaks`, `registry_status` (marcador de categoría congelado al registrar, **no un resultado**), `claim_ids[]`, `effective_outcome[]` (S0). No existe un "estado" de hipótesis distinto de estos campos; la web no lo inventa.

### 7.4 Source

`id` (`LAB-SRC-####`), `name`, `type`, `admission_status`, `v1_reference?`, `retrieved_files[] { url, retrieved_at, file_name, size_bytes, recorded_sha256 }` (de `source-admission-result.json`), `original_url`, `license { url | NOT_RECORDED, origin }`, `redistribution` (**siempre `NOT_ASSUMED` en el corpus web**: un permiso solo se registra después de la revisión legal, `G-LEG-03`).

- `original_url` y `license` provienen de un registro del corpus o de un `provenance.json` de V1; si no existen: `url_status: NOT_RECORDED` / `license.status: NOT_RECORDED`. **Nunca** se completan desde memoria ni desde la web.

### 7.5 EvidenceRoot

`id`, `publication`, `dataset_release` (texto tal cual, incluye hash recorded si lo hay), `primary_producer`, `collection_instrument`, `frame_population`, `period`, `transformations`, `statistical_object`, `independence_class`, `relative_to_root_id`, `shared_coverage_bias`, `is_deflator` (derivado de `DEFLATOR_ROOT_ID` en claims), `source_links[]`.

`source_links[]` = `{ source_id, link_basis }` con `link_basis ∈ { SHA256_EQUALITY, EXPLICIT_RECORD }`. Sin registro directo: lista vacía y `source_link_status: UNRESOLVED` (ver §13.1, medido).

### 7.6 Evidence

`id`, `claim_id?`, `diagnostic_only`, `hypothesis_id?`, `object_ids[]`, `source` (texto), `root_ids[]`, `recorded_hashes[] (INPUT_HASH)`, `method`, `metric`, `result_text` (**texto libre, no estructurado**), `limitation_ids[]`, `reproducibility`, `status`. Base de los nodos ▲ del Rastro. Evidencia con `diagnostic_only: true` (10 registros) nunca se muestra como respaldo de un claim.

### 7.7 StatisticalObject (◆)

`id`, `name`, `unit`, `population`, `universe`, `grain`, `producer`, `observation_mechanism`, `is`, `is_not`, `status`, `v1_references`.

### 7.8 Limitation

`id` (DERIVED), `owner_kind` (`claim`/`question`/`evidence`), `owner_id`, `ordinal`, `text` (verbatim), `origin_path`. **No lleva clasificación ni disposición pública**: eso es editorial (§`WEB-0-EDITORIAL-CONTRACT.md` §5). Hoy: 72 limitaciones de claims + 19 de preguntas.

### 7.9 Relation

De `reports/lab_s/LAB-S2-relation-register.json` (34 relaciones). Campos: `id`, `category` (`AUTHORIZED_EXISTING_RELATION` · `JUXTAPOSITION_ONLY` · `GOVERNANCE_REQUIRED` · `PROHIBITED`), `title`, `claim_ids`, `context_claim_ids`, `question_ids`, `hypothesis_ids`, `object_ids`, `root_ids`, `deflator_root_ids`, `regimes`, `scope_of_relation`, `rule_or_ruling`, `independence`, `permitted_comparison`, `prohibited_inference`, `reason`.

Política de uso derivada de `category`, aplicada por gates (no por criterio editorial):

| Categoría | La web puede | La web no puede |
|---|---|---|
| `AUTHORIZED_EXISTING_RELATION` | Mostrar la relación **dentro de su alcance**, con el texto de `permitted_comparison` | Extenderla más allá de `scope_of_relation` |
| `JUXTAPOSITION_ONLY` | Colocar los ítems adyacentes, cada uno con su estado, alcance y límites | Eje compartido, métrica derivada o lenguaje conectivo ("consistente con", "explica", "confirma") |
| `GOVERNANCE_REQUIRED` | Listarla como **pendiente** en Método/Límites | Afirmarla o insinuarla |
| `PROHIBITED` | Citar el texto de `prohibited_inference` como "lo que ALETHEIA no afirma" | Presentarla como relación |

### 7.10 Figure

Ver §9.

### 7.11 Entidades auxiliares

`GovernanceRuling` (7 `LAB-GOV-*`), `PreservedResult` (15 `KEEP-*`; base de la página Límites y del gate "no suavizar"), `ClaimSupersession`/anotaciones de riesgo de modelado (§13.5).

### 7.12 CorpusModule y Manifest

```text
CorpusModule (modules/<module>.contract.json + generated/<module>/manifest.json)
  module_id, title, version (semver del corpus; labor → 1.0.0 = aletheia-labor-v1.0.0)
  status: FROZEN | LIVE
  pins[]               (refs a pins/*.pin.json)
  schema_version
  expected_counts{}    (contrato revisado por humano; ver §14)
  vocabularies{}       (estados válidos del módulo)
  files[]              (path, sha256, bytes) — todos los generated/<module>/*
  generator_version, generator_source_sha256
  invariants{}         (p. ej. labor: established=0, convergent=0, divergent=0)

Manifest de sitio (modules.lock.json)
  modules[] { module_id, version, manifest_sha256 }
  editorial_manifest_sha256
  charter { version, sha256 }
```

---

## 8. Estado de pregunta vs. estado de claim (no se mezclan)

```text
Question.resolution                                  Claim.epistemic_state
  value          ← qué terminó siendo la pregunta      value ← estado de ciclo de vida del claim
  vocabulary     ← de dónde sale el valor              (vocabulario congelado, 13 valores;
  basis          ← CLAIM | QUESTION_LEDGER |            labor@1.0.0 usa solo 3)
                   REGIME_CLOSEOUT
  basis_refs[]   ← IDs o rutas que lo respaldan
```

| `resolution.value` | `vocabulary` | `basis` | Preguntas (labor@1.0.0) |
|---|---|---|---|
| `OBSERVED_IN_SOURCE` | `CLAIM_LIFECYCLE_STATE` | `CLAIM` | 9 |
| `REFUTED_WITHIN_SCOPE` | `CLAIM_LIFECYCLE_STATE` | `CLAIM` | 1 (Q-0004) |
| `INSUFFICIENT_EVIDENCE` | `CLAIM_LIFECYCLE_STATE` | `CLAIM` | 3 (Q-0013, 0014, 0018) |
| `NOT_IDENTIFIABLE` | `CLAIM_LIFECYCLE_STATE_RECORDED_AS_QUESTION_LEDGER_STATUS` | `QUESTION_LEDGER…` | 3 (Q-0011, 0015, 0017), **sin claim** |
| `BLOCKED_BY_DESIGN` | `DOCUMENTED_REGIME_A_CLOSEOUT_LABEL_NOT_A_LIFECYCLE_STATE` | `QUESTION_LEDGER_AND_REGIME_CLOSEOUT` | 1 (Q-0006), **sin claim** |
| `OUTSIDE_LAB_A` | ídem | ídem | 1 (Q-0007), **sin claim** |

Reglas del contrato:

1. `Claim.epistemic_state ∈ vocabulario de ciclo de vida`. `BLOCKED_BY_DESIGN` y `OUTSIDE_LAB_A` **no pertenecen** a ese vocabulario: el esquema los rechaza en un Claim.
2. `Question.resolution` para preguntas con claims se **deriva** del/los claim(s); si con N>1 los claims tuvieran estados **distintos**, el generador **falla** (no agrega, no promedia, no elige): requeriría una regla gobernada (`REL-PR-001`, `REL-PR-010`).
3. Las etiquetas documentales viven en un solo lugar (`LAB-S0-inventory.json` + `LAB-S0-preserved-results.json`, con el cierre del régimen A como segundo testigo); no están en los ledgers. La derivación se cruza contra ambos y contra el texto del cierre (`G-STA-02`).
4. `ledger_status` se conserva y se ignora para mostrar (los ledgers no reescriben el estado registrado al resolverse una pregunta: convención del corpus).
5. `absent_vs_negative` acompaña a ambos: solo `REFUTED_WITHIN_SCOPE` es `NEGATIVE_WITHIN_SCOPE`; el resto de ausencias es `ABSENT_NOT_NEGATIVE`.

---

## 9. Contrato numérico: Figure

> **Principio congelado:** ninguna cifra sustantiva publicada puede existir solo como texto editorial. Toda cifra visible es la renderización de una `Figure` del corpus.

### 9.1 Estructura

```text
Figure  (id_origin: DERIVED; sintaxis del ID no congelada)
  figure_id
  claim_id, evidence_id, question_id
  metric_key           p. ej. nominal_growth | real_growth | gap | share | threshold …
  label                (canónico, verbatim del METRIC/registro cuando existe)
  value_raw            valor tal como está registrado (número o cadena; nunca recomputado)
  unit                 pct | pp | ars | count | ratio-as-recorded
  period               { start, end, granularity }
  nominal_real         NOMINAL | REAL | NA
  stock_flow           STOCK | FLOW | NA
  scope_ref            → scope_statement del claim (para el Encuadre)
  source_ids/root_ids  (para la cota de alcance)
  origin               STRUCTURED_REPORT | EVIDENCE_TEXT | CLAIM_TEXT
  origin_path/pointer  + blob_sha del archivo
  text_anchor          cadena tal como aparece en el corpus (p. ej. "35.48%")
  display              { decimals, locale: "es-AR", sign: "explicit|none" }   ← formato, no cálculo
  table_alt            fila para la alternativa en tabla (Charter §15.4)
```

### 9.2 Reglas

1. **Origen estructurado primero.** Precedencia: `STRUCTURED_REPORT` (JSON de `reports/…`, p. ej. `reports/lab_a3_1/eph-hyp0004-real-income-growth.json`) > `EVIDENCE_TEXT` > `CLAIM_TEXT`. Medido: existen JSON estructurados con `NOMINAL_GROWTH_PCT`, `REAL_GROWTH_PCT`, `GAP_PP` (CLM-0006), `SHIFT_…_PP` (CLM-0005), tabla trimestral (CLM-0004) y `COMPUTED_RESULTS` (CLM-0007). El `RESULT` de `evidence-registry.json` es **texto libre**: no se parsea como fuente primaria.
2. **Ancla textual (doble testigo).** El valor formateado según `display` debe coincidir con la cifra escrita en el texto del corpus (`text_anchor`). Si un JSON estructurado trae `35.4832…` y el corpus dice `35.48%`, el redondeo de `display` debe reproducir `35.48`. Falla → bloqueo (`G-FIG-01`).
3. **Sin aritmética nueva.** No hay `origin: DERIVED`. Diferencias como "brecha de 33,38 pp" solo se muestran si el corpus **las registra** (CLM-0006 lo hace). Prohibido restar, promediar, comparar magnitudes entre claims (`REL-PR-012`).
4. **Figuras solo de texto** (`CLAIM_TEXT` únicamente) se permiten en V1 si el valor figura textualmente en dos testigos (claim + evidencia); el manifest las cuenta y la lista es visible para el revisor.
5. **Cada Figure trae fuente y período** (Encuadre, Charter §5). Sin ellos, no se publica.
6. **Formato determinista**: `es-AR`, menos tipográfico `−` (Charter §3.2), lining/tabular es CSS. El formato es función pura de `(value_raw, display)`.
7. **Nominal ≠ real** y **stock ≠ flujo** viajan como atributos de la Figure; el renderizador los muestra siempre junto a la cifra.
8. La narrativa referencia el ID (no un valor). El editor no ve números; ve directivas (`WEB-0-EDITORIAL-CONTRACT.md` §6).

### 9.3 Qué NO se congela todavía
La sintaxis del ID, la sintaxis de la directiva y el esquema exacto de `period` (WEB-1).

---

## 10. Provenance por capa (resumen)

| Capa | Provenance obligatoria |
|---|---|
| Corpus web (`generated/`) | §5 completo |
| Editorial | `canonical_id` + `canonical_hash` (hash del canónico del que deriva), `revision`, `audit_ref` |
| Render | `release.json`: versiones de módulos, hashes de manifests, hash editorial, hash del Charter, `build_id` |

---

## 11. Módulos y federación

ALETHEIA no termina en LABOR (precios, inflación, costo efectivo, combustible…). Cada módulo cumple, desde V1:

1. **Contrato propio** (`modules/<module>.contract.json`): versión, pins, conteos esperados, vocabularios, invariantes.
2. **Espacio de nombres**: `global_id = <module>/<id>`; rutas de entidad bajo `/<module>/…`; carpetas `generated/<module>/`, `editorial/<module>/`.
3. **Versionado y congelamiento independientes**: cambiar un módulo no cambia los hashes de otro.
4. **Carga independiente**: el módulo se construye y valida solo (`corpus:build --module labor`); el sitio lo consume desde `modules.lock.json`.
5. **Trazabilidad**: todo objeto remite a su módulo, pin y manifest.
6. **Vocabularios por módulo**: un módulo declara su vocabulario de estados; la web mantiene un núcleo común mínimo. Ampliar el núcleo requiere enmienda.

**Relaciones entre módulos: denegadas por defecto.** Una referencia de una entidad del módulo A a otra del módulo B solo se admite mediante un registro `CrossModuleRelation` con `governance_ruling_id` resoluble en **ambos** módulos, `scope`, `permitted_comparison` y `prohibited_inference`. Sin ese registro, `G-MOD-01` bloquea el build (los `G-MOD-*` son `FEATURE_GATED`: se activan automáticamente cuando existe un segundo módulo). Esto replica, a escala de módulos, la regla de LAB-S: cero relaciones nuevas sin gobernanza (`REL-PR-014`).

Consecuencias explícitas:
- Las **raíces de evidencia no se comparten** entre módulos sin gobernanza (riesgo: contar como independientes fuentes que comparten linaje; ver `REL-PR-002`).
- Un **Figure de un módulo no puede usarse como insumo de otro**.
- Un **agregado transversal** (índice, ranking, "puntaje global") está **prohibido** salvo módulo dedicado y gobernado (`REL-PR-010`).

---

## 12. Preparación para Ask ALETHEIA (contrato del corpus)

Ask **no se implementa** en V1. Lo que el corpus web debe traer desde V1 para que sea posible después:

| Requisito | Dónde vive | Estado en V1 |
|---|---|---|
| `answerability` por Question/Claim/Figure | canónico + editorial | Obligatorio |
| Citas resolubles | `global_id` + permalink versionado | Obligatorio |
| IDs de limitación que **deben acompañar** cualquier respuesta | `Limitation.id` + `required_qualifiers[]` | Obligatorio |
| Provenance | §5 | Obligatorio |
| Redacción pública | `editorial/…` | Obligatorio |
| Identificadores semánticos y alias | `editorial/…` (`semantic_id`, `aliases[]`) | Obligatorio |
| Inferencias prohibidas | `Relation` `PROHIBITED` + `prohibited_inference` | Derivado |

```text
answerability
  answer_kind:            MEASUREMENT | DOCUMENTARY_FINDING | ABSENCE | NOT_ANSWERABLE
  answerable_from_corpus: true|false
  required_qualifiers[]:  limitation ids que toda cita debe llevar
  forbidden_inferences[]: relation ids (PROHIBITED / GOVERNANCE_REQUIRED) que la respuesta no puede afirmar
  citation:               { global_id, permalink_version }
```

Estos campos se **generan y validan por esquema en `CORE_BUILD`** (`G-SCH-01`); los gates `G-ASK-*` son `FEATURE_GATED` y se activan por disparador automático cuando exista la funcionalidad.

`answer_kind` se **deriva** del estado/resolución y de `claim_kind` (p. ej. `NOT_IDENTIFIABLE` → `NOT_ANSWERABLE`), no lo decide un editor.

**Principio congelado: Ask nunca escribe una cifra desde la memoria del modelo.** Mecanismo (detalle en `WEB-0-ARCHITECTURE.md` §7): el modelo solo puede emitir *referencias a Figures*; el renderizador inserta el valor. Un dígito fuera de una referencia invalida la respuesta.

---

## 13. Hallazgos medidos sobre el corpus (condicionan el diseño)

Ninguno se supuso: se midieron contra los tags.

### 13.1 Vínculo raíz → fuente: solo 2 de 7 raíces tienen registro directo

`EvidenceRoot.DATASET_RELEASE` trae un sha256 en 4 de 7 raíces; **solo 2 coinciden con un `provenance.json` de V1**: `LAB-ROOT-0001` (SIPA) y `LAB-ROOT-0002` (CGI). `LAB-ROOT-0003` (MLER) y `LAB-ROOT-0004` (SRT) traen un hash que no coincide con ningún `provenance.json`; `LAB-ROOT-0005` (EPH), `-0006` (IPC) y `-0007` (ARCA) no traen hash. Los archivos de `LAB-SRC-0001/2/3` sí están registrados en `source-admission-result.json`, pero **ningún registro dice "esta raíz proviene de esta fuente"**: vincularlos sería inferir por nombre.
**Decisión de contrato:** `source_link_status: UNRESOLVED` es un estado válido; el Rastro muestra la publicación de la raíz verbatim y omite el enlace. Cerrar la brecha requiere un registro puente auditado (OD-04).

### 13.2 Licencias: 2 de 10 `provenance.json` de V1 registran licencia

Solo `indec_cgi` y `indec_cba_cbt` traen `license_url` (CC BY-SA 4.0). Las fuentes recuperadas por LABOR (EPH, IPC, ARCA) no registran licencia. `license.status: NOT_RECORDED` es el valor por defecto.

**Regla por defecto (OD-03, aprobada).** Para toda fuente **sin licencia de redistribución registrada**: (1) **no se redistribuyen datos crudos**; (2) **se enlaza al publicador** (`original_url` del corpus); (3) **no se asume permiso**; (4) solo se admite **contenido derivado compatible con este contrato** (Figures y valores registrados en el corpus) y **sujeto a revisión legal**. La revisión legal es **obligatoria antes de publicar** (`G-LEG-03`, `RELEASE`). Una licencia registrada (p. ej. CC BY-SA 4.0) tampoco exime de esa revisión. CLM-0002 y CLM-0004 (Q-0003) usan CGI (CC BY-SA 4.0): exigen atribución y revisión de si un derivado implica *ShareAlike*.

### 13.3 El corpus no versiona datos crudos
`docs/storage-policy.md` de LABOR prohíbe versionar `data/raw/`. **La cadena de reproducibilidad de la web termina en los reportes y ledgers versionados**: la web no puede ni debe recalcular una cifra desde datos crudos.

### 13.4 Números tipeados a mano ya existen en el prototipo
El cuerpo estático del Home tiene 27 tokens numéricos escritos a mano (`+35,48 %` ×2, `+2,10 %` ×2, `−7,97`, `36,29`, `37,90`, `+1,61`, años…), y `build_map.py` tipeó cifras dentro de titulares. Un chequeo mecánico de los 14 titulares contra el texto de su claim no pudo trazar 9 tokens (años tomados del `SCOPE_STATEMENT`, montos con otro formato, `11`/`19` tomados del texto de la evidencia): tras revisión manual, todos son correctos, pero **solo por verificación humana**. Es exactamente lo que `Figure` elimina.

### 13.5 Riesgo de modelado: evidencia reemplazada
`LAB-CLM-0007` referencia `LAB-EVD-0015` (registro anterior: "NOT COMPUTABLE") y `LAB-EVD-0017` (vigente); el texto del claim dice que el segundo reemplaza al primero, pero ambos figuran `RECORDED`. Un Rastro ingenuo mostraría ambos como respaldo. **Regla:** el Rastro muestra la evidencia en el orden y con los estados registrados; cualquier anotación de reemplazo es una `ClaimSupersession` en `modules/labor.contract.json` con **cita textual del corpus** como base (`G-PRV-04`).

### 13.6 Otros
- 10 de 25 registros de evidencia son `DIAGNOSTIC_ONLY` sin claim; 15 están vinculados.
- Etiquetas documentales (`BLOCKED_BY_DESIGN`, `OUTSIDE_LAB_A`) no están en los ledgers (§8.3).
- Los ledgers no traen IDs de limitación (§6) ni URL/licencia de fuentes propias del corpus (§7.4).

---

## 14. `labor@1.0.0` — conteos esperados (contrato del módulo)

| Entidad | Esperado | Nota |
|---|---|---|
| Questions | 18 | A 7 · B 6 · C 5 |
| Claims | 14 | A 6 · B 5 · C 3 |
| Hypotheses | 9 | `PRIOR_DATA_EXPOSURE`: 2 DIRECT · 3 INDIRECT · 4 NONE |
| Questions con ≥ 1 claim / con 0 | 13 / 5 | sin claim: Q-0006, 0007, 0011, 0015, 0017 |
| Questions con > 1 claim | 1 | Q-0003 (CLM-0002, CLM-0004) |
| Suma de `claim_ids` | 14 | |
| Hipótesis sin claim | 2 | LAB-HYP-0008, LAB-HYP-0009 |
| Claim states | 10 OBSERVED · 1 REFUTED · 3 INSUFFICIENT | 0 ESTABLISHED · 0 CONVERGENT · 0 DIVERGENT |
| Resolución de pregunta | 9 · 1 · 3 · 3 NOT_IDENTIFIABLE · 1 BLOCKED_BY_DESIGN · 1 OUTSIDE_LAB_A | |
| Evidence | 25 (15 con claim · 10 diagnóstico) | |
| EvidenceRoot | 7 | |
| Source | 15 | |
| StatisticalObject | 26 | |
| GovernanceRuling (LAB-GOV) | 7 | |
| Relation | 34 | 3 AUTHORIZED · 7 JUXTAPOSITION · 6 GOVERNANCE_REQUIRED · 18 PROHIBITED |
| PreservedResult (KEEP) | 15 | |
| Limitation | 72 (claims) + 19 (preguntas) | IDs DERIVED |

Este cuadro es el contrato que `G-CNT-01` verifica; cambia solo con un nuevo pin.
