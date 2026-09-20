# WEB-0 · INTEGRITY GATES

| | |
|---|---|
| **Estado** | **FROZEN** (WEB-0 v1.0, 2026-09-19; ver `WEB-0-DECISION-LOG.md` §4). Enmienda 1: clasificación por momento de activación |
| **Fecha** | 2026-09-19 |
| **Alcance** | Gates automáticos de producción: qué verifican, cuándo corren, qué esperan para `labor@1.0.0` y cómo se prueba que los propios gates funcionan |
| **Implementación** | No en WEB-0. Este documento es la especificación; WEB-1 la implementa |

Convenciones: **B** = bloquea (según su clasificación, §1.1); **W** = advierte y queda en el reporte. Momentos de ejecución: **PC** pre-commit · **CI** integración · **CR** corte de release. (El momento de ejecución no es lo mismo que la clasificación de §1.1: un gate `CORE_BUILD` puede ejecutarse solo en el corte de release, p. ej. `G-SRC-01`, que necesita acceso a los tags.) «Esperado» para `labor@1.0.0` se lee de `modules/labor.contract.json` (`WEB-0-DATA-CONTRACT.md` §14), no está incrustado en el gate.

---

## 1. Reglas generales

1. **Ningún gate se omite en modo release.** Una excepción solo procede como *waiver* registrado en el decision log con motivo, alcance y fecha de vencimiento; el reporte de release lista los waivers vigentes.
2. **Cada gate emite un resultado legible por máquina** (`reports/gates/<gate>.json`); el release guarda el hash del reporte agregado.
3. **Fallar es la conducta por defecto**: la ausencia de un dato exigido es un fallo, no un `undefined` silencioso.
4. **Los gates se prueban a sí mismos** (§18): cada gate tiene un *fixture defectuoso* que debe fallarlo.
5. Los presupuestos solo pueden endurecerse (*ratchet*).

### 1.1 Clasificación por momento de activación (Enmienda 1)

Cada gate tiene una clasificación que dice **desde cuándo bloquea**. Se conservan los **88 gates originales** (Anexo A) y esta enmienda agrega **8** (marcados «Enmienda 1») para dar lugar a categorías que el autor nombró y que no tenían gate. Los 8 nuevos son `RELEASE` o `FEATURE_GATED`: **no agregan carga a `CORE_BUILD`**.

| Clasificación | Bloquea | Cuándo aplica | Modo en CI |
|---|---|---|---|
| **`CORE_BUILD`** | **Desde WEB-1** (merge y release) | Siempre; los que verifican HTML/rutas se evalúan sobre el **contenido implementado** (no exigen rutas todavía no construidas) | Bloqueante |
| **`RELEASE`** | El **lanzamiento público**, no el desarrollo inicial | Corte de release; pueden correrse en modo informativo en CI desde que exista la pieza que verifican | Informativo (opcional) · **bloqueante en el corte** |
| **`FEATURE_GATED`** | Cuando **existe** la funcionalidad correspondiente | Se activan por **disparador automático** (abajo) | Inactivo hasta el disparador; luego bloqueante |

**Disparadores automáticos (no se activan a mano).** El ejecutor de gates busca en cada corrida estas señales; si detecta una y el gate correspondiente está inactivo, **la corrida falla** («tripwire»). Así una funcionalidad no puede llegar al repo sin sus gates.

| Familia | Se activa cuando… |
|---|---|
| `G-MOD-*` | `modules.lock.json` lista más de un módulo, o alguna entidad referencia el namespace de otro módulo, o existe algún registro `CrossModuleRelation` |
| `G-ASK-*` | existe la ruta `/preguntar`, un directorio/deployment `ask/`, o algún código fuera del esquema/generador consume `answerability` |
| `G-DL-01` | existe cualquier ruta o artefacto que sirva datos descargables o un endpoint de API (`/api/*`, `/descargas/*`, archivos `.json`/`.csv` en `public/` fuera de la lista blanca de manifests e índice de búsqueda) |
| `G-BHV-01` | existe código de cliente que calcula o verifica hashes del corpus en el navegador |

**Notas de clasificación (juicios del autor de WEB-0, marcados †, que se pueden revisar por ADR):**
- `G-PERF-03`† (lista blanca de islas cliente) es `CORE_BUILD` aunque viva en la familia de rendimiento: es una guarda estructural barata, no un presupuesto.
- `G-LEG-01`† (sin datos crudos en el repo) es `CORE_BUILD`: un dato crudo que entra al historial de git no se puede sacar después (es el modo de fallo que la política de almacenamiento de LABOR documenta para V1: un CSV de 2,96 GB committeado en el historial; hoy el pack de V1 mide 1,64 GiB).
- `G-UX-05`† (contenido sin JS) y `G-UX-06`† (conformidad estática con el Charter) son `CORE_BUILD` por barato y para no reescribir después.
- `G-UX-08`† (anti-dashboard) es `RELEASE` porque su parte de visibilidad depende de viewports (responsive); el chequeo de nombres de componente corre en `PC` junto con `G-UX-06`.
- `G-SEC-01`† (escáner de PII) es `RELEASE`: el corpus no contiene PII conocida; se verifica antes de publicar.
- `G-ASK-*` y `G-MOD-*` son `FEATURE_GATED`; **los campos** `answerability` y los IDs con namespace se generan y validan por esquema en `CORE_BUILD` (`G-SCH-01/02`), de modo que el corpus ya nace listo.

**Regla sobre los gates `RELEASE`:** el responsive, WCAG 2.2 AA completo, legal/licencias, presupuestos, SEO, OG, seguridad/CSP, manifest de correcciones/versión y link check completo **bloquean el lanzamiento público**. Ninguno bloquea crear el repo ni el desarrollo inicial.


---

## 2. Dónde corre cada familia

| Momento | Familias |
|---|---|
| **PC** (segundos) | G-GEN-04, G-EDI-06/07, G-FIG-02, G-UX-06 (estático), G-LEG-01, tipos/lint |
| **CI** | Todos los `CORE_BUILD` (G-SRC-02/03, G-GEN, G-SCH, G-CNT, G-REF, G-STA, G-PRV-01…04/06, G-LIM, G-FIG, G-EDI, G-UX-01…06, G-PERF-03, G-LEG-01) · los `RELEASE` en modo informativo cuando exista la pieza que verifican · los `FEATURE_GATED` solo si su disparador está activo |
| **CR** (corte de release) | Todo CI + `G-SRC-01/04/05` (`verify:pin`, requiere acceso de solo lectura a los tags; lo ejecuta el autor y adjunta el reporte) + `G-SRC-06` (backup) + todos los `RELEASE` en modo bloqueante |

---

## 3. G-SRC · Fuente y pins

| ID | Verifica | Modo | Sev. | Cuándo |
|---|---|---|---|---|
| **G-SRC-01** `CORE_BUILD` | Cada tag pineado resuelve **exactamente** al commit del pin (`labor` → `ca6a85e12b05df28e73e60ac406c90ad16352ed3`; `v1` → `2da6a2b59cf08ef23b0fc68dce394b46626b5f12`) | `git rev-parse <tag>^{commit}` | B | CR |
| **G-SRC-02** `CORE_BUILD` | El `blob_sha` de cada archivo consumido coincide con el pin | `git ls-tree` / hash de `corpus-src/` | B | CI (offline con blob shas del pin) / CR |
| **G-SRC-03** `CORE_BUILD` | `corpus-src/` es **byte-idéntico** a los objetos del tag (sha256) | comparación con `git cat-file` cuando hay acceso; con `extracted_sha256` del manifest cuando no | B | CI/CR |
| **G-SRC-04** `CORE_BUILD` | Los repos fuente no cambiaron por causa del pipeline: `HEAD`, refs y `git status --porcelain` idénticos antes y después (se **tolera** el estado sucio previo de V1: se compara el *cambio*) | snapshot antes/después | B | CR |
| **G-SRC-05** `CORE_BUILD` | La extracción lee **objetos git, no el working tree**. Prueba: con un archivo *untracked* o modificado en el working tree, el resultado no cambia (caso real: V1 tiene hoy `ALETHEIA_FORENSIC_AUDIT_2026-09-17.md` sin trackear) | fixture de working tree sucio | B | CR/CI (fixture) |
| **G-SRC-06** `RELEASE` *(Enmienda 1)* | **Backup verificable** (OD-12): por cada repo fuente, existe `BACKUP-MANIFEST` con bundle `git bundle`, `sha256`, salida de `git bundle verify`, ≥ 2 copias fuera de la máquina principal y una **prueba de restauración** (clon desde el bundle en una carpeta nueva) donde el tag resuelve al commit del pin, coincide el árbol y coinciden los `blob_sha` de los archivos consumidos. **El backup nunca es fuente de verdad**: un repo restaurado solo se acepta si cumple `G-SRC-01/02` | modo backup | B | CR |

## 4. G-GEN · Determinismo y no-drift

| ID | Verifica | Sev. | Cuándo |
|---|---|---|---|
| **G-GEN-01** `CORE_BUILD` | Dos corridas de `corpus:build` producen `manifest.json` idéntico (mismos hashes) | B | CI |
| **G-GEN-02** `CORE_BUILD` | `generated/` commiteado == regenerado desde `corpus-src/` (sin drift) | B | CI |
| **G-GEN-03** `CORE_BUILD` | `generator_version` y `generator_source_sha256` presentes y coherentes con el árbol de `tools/corpus/` | B | CI |
| **G-GEN-04** `CORE_BUILD` | Ningún archivo generado contiene timestamps de ejecución, rutas absolutas, nombre de usuario/host ni ordenamiento dependiente del entorno | B | PC/CI |
| **G-GEN-05** `CORE_BUILD` | Golden test: IDs, mapeo pregunta→claims, estados de claim, resolución de pregunta e `hypothesis_ids` de la salida == reconciliación aceptada del prototipo (`reconciliation/question-map-reconciled.json`, hash fijado) para las 18 preguntas y 14 claims. **Gana el tag**: una diferencia abre investigación, no se «corrige» el fixture | B | CI |

## 5. G-SCH y G-CNT · Esquemas y conteos

| ID | Verifica | Sev. |
|---|---|---|
| **G-SCH-01** `CORE_BUILD` | Toda entidad valida contra su esquema Zod/JSON Schema; sin campos desconocidos | B |
| **G-SCH-02** `CORE_BUILD` | IDs `CORPUS` cumplen su patrón; IDs `DERIVED` se recomputan idénticos | B |
| **G-CNT-01** `CORE_BUILD` | Conteos == contrato del módulo. `labor@1.0.0`: Q 18 (A7·B6·C5) · C 14 (A6·B5·C3) · H 9 · Evidence 25 (15/10) · Roots 7 · Sources 15 · Objects 26 · LAB-GOV 7 · Relations 34 (3/7/6/18) · KEEP 15 · Limitations 72 + 19 | B |
| **G-CNT-02** `CORE_BUILD` | Manifest de módulo: cantidad y hash de cada archivo == archivos presentes | B |

## 6. G-REF · Integridad referencial y mapeo Question → 0..N Claims

| ID | Verifica | Sev. |
|---|---|---|
| **G-REF-01** `CORE_BUILD` | **Todos los IDs resuelven** (question↔claim↔hypothesis↔evidence↔root↔object↔source↔relation↔ruling) | B |
| **G-REF-02** `CORE_BUILD` | **Ningún claim huérfano**: cada claim apunta a exactamente 1 pregunta existente y esa pregunta lo lista | B |
| **G-REF-03** `CORE_BUILD` | Ninguna evidencia huérfana, salvo las 10 `DIAGNOSTIC_ONLY` (explícitas) | B |
| **G-REF-04** `CORE_BUILD` | **Mapeo cerrado**: 13 preguntas con ≥ 1 claim · 5 sin claim (Q-0006, 0007, 0011, 0015, 0017) · solo Q-0003 con 2 (CLM-0002, CLM-0004) · suma de `claim_ids` = 14 · ningún claim mapeado dos veces | B |
| **G-REF-05** `CORE_BUILD` | Toda hipótesis pertenece a una pregunta; `RELATED_HYPOTHESES` == `hypothesis-registry` | B |
| **G-REF-06** `CORE_BUILD` | Toda relación `Relation` referencia claims/preguntas existentes | B |

## 7. G-STA · Estados (la capa de pregunta y la de claim no se mezclan)

| ID | Verifica | Sev. |
|---|---|---|
| **G-STA-01** `CORE_BUILD` | Estados de claim ⊂ vocabulario de ciclo de vida; tally `labor@1.0.0` = 10 `OBSERVED_IN_SOURCE` · 1 `REFUTED_WITHIN_SCOPE` · 3 `INSUFFICIENT_EVIDENCE` · **0 `ESTABLISHED_WITHIN_SCOPE` · 0 `CONVERGENT` · 0 `DIVERGENT`** | B |
| **G-STA-02** `CORE_BUILD` | **Toda pregunta tiene resolución pública**; con claims, coincide con ellos (y si N>1 con estados distintos, el generador falla); sin claims, coincide con S0 **y** con el segundo testigo (cierre del régimen) | B |
| **G-STA-03** `CORE_BUILD` | `BLOCKED_BY_DESIGN` y `OUTSIDE_LAB_A` no aparecen jamás como estado de un Claim; `NOT_IDENTIFIABLE`/`BLOCKED`/`OUTSIDE_LAB_A` nunca llevan ■ | B |
| **G-STA-04** `CORE_BUILD` | **La capa editorial no altera estados**: ningún registro de `editorial/` contiene campo de estado; el render lee el estado solo de `generated/`; el estado renderizado (DOM) == estado generado para cada ID | B |
| **G-STA-05** `CORE_BUILD` | `absent_vs_negative` coherente: solo `REFUTED_WITHIN_SCOPE` es `NEGATIVE_WITHIN_SCOPE` | B |
| **G-STA-06** `CORE_BUILD` | Vocabulario público: todo código presente tiene etiqueta; ninguna etiqueta pública para un código ausente; la palabra «establecido/a» **no aparece sin calificador** (colisión `ESTABLISHED` de celda vs `ESTABLISHED_WITHIN_SCOPE`) | B |
| **G-STA-07** `CORE_BUILD` | El calificador «Hallazgo documental: no es una medición del mercado laboral» está presente en los claims `claim_kind` ≠ medición (CLM-0008, 0009, 0010, 0012) | B |

## 8. G-PRV · Provenance

| ID | Verifica | Sev. |
|---|---|---|
| **G-PRV-01** `CORE_BUILD` | Todo objeto tiene el envelope completo (repo, tag, commit, ruta, ID, pointer, blob_sha, generator_version) | B |
| **G-PRV-02** `CORE_BUILD` | **Ningún hash inventado**: cada `*_hash`/`*_sha256` proviene del pin, de un `recorded_hashes` del corpus o de `extracted_sha256` etiquetado como tal | B |
| **G-PRV-03** `CORE_BUILD` | Cada `Source` mostrada tiene `original_url` **con origen en un registro del corpus** o `NOT_RECORDED`; ningún vínculo raíz→fuente sin `link_basis` (`SHA256_EQUALITY`/`EXPLICIT_RECORD`) | B |
| **G-PRV-04** `CORE_BUILD` | Anotaciones de reemplazo de evidencia (`ClaimSupersession`, p. ej. CLM-0007) citan texto del corpus como base | B |
| **G-PRV-05** `RELEASE` | Cada `Source` mostrada exhibe `license.status`. **Regla por defecto** (OD-03): sin licencia de redistribución registrada ⇒ no se redistribuyen datos crudos, se enlaza al publicador (`original_url` del corpus), no se asume permiso y solo se admite contenido **derivado** compatible con el contrato de datos y sujeto a revisión legal (`G-LEG-03`) | B |
| **G-PRV-06** `CORE_BUILD` | **No se muestra ningún conteo de raíces ni «N fuentes»** (el IPC como deflactor no cuenta; `CLM-0007` cita dos raíces no independientes). Se muestra `lineage_independence` y los nodos de deflactor van diferenciados | B |

## 9. G-LIM · Límites (nadie se los salta)

| ID | Verifica | Sev. |
|---|---|---|
| **G-LIM-01** `CORE_BUILD` | **Todo claim publicado tiene ≥ 1 límite público** | B |
| **G-LIM-02** `CORE_BUILD` | **Matriz de cobertura completa**: toda `Limitation` canónica de claim (hoy 72) tiene `class` y `disposition`; `AUDIT_ONLY` solo con `class = PROCEDURAL`; `SHOWN` remite a un texto público existente | B |
| **G-LIM-03** `CORE_BUILD` | Toda pregunta muestra sus limitaciones públicas, la divulgación de exposición previa (`disclosure_required`) cuando aplica y, cuando el `scope_statement` del claim es más estrecho que la pregunta, la **nota de brecha pregunta–claim** (Editorial §5.7) | B |
| **G-LIM-04** `CORE_BUILD` | **Límite junto al dato**: en el DOM, cada Figure de un claim tiene, en la misma sección, el bloque de límites del claim (relación `aria-describedby`/contenedor común) | B |
| **G-LIM-05** `CORE_BUILD` | Las limitaciones `SHOWN` no fueron editadas fuera de auditoría (hash del texto público == auditado) | B |

## 10. G-FIG · Cifras

| ID | Verifica | Sev. |
|---|---|---|
| **G-FIG-01** `CORE_BUILD` | Toda Figure resuelve a un origen del corpus; el valor formateado (`display`) **reproduce el ancla textual** (`text_anchor`) | B |
| **G-FIG-02** `CORE_BUILD` | **Editorial sin literales numéricos** fuera de directivas y de la lista versionada de excepciones (IDs de entidad, versiones, `{{count}}`) | B |
| **G-FIG-03** `CORE_BUILD` | **Escaneo del HTML renderizado**: todo token numérico está dentro de un elemento de Figure, es un ID/versión/fecha de release, o es un numeral estructural derivado del manifest. Ninguna cifra existe solo como texto. **El escaneo incluye atributos** (`aria-label`, `alt`, `title`, `<title>` de SVG), `<meta>`, JSON-LD y **el índice de búsqueda** | B |
| **G-FIG-04** `CORE_BUILD` | Toda Figure exhibe fuente y período (Encuadre) y tiene alternativa en tabla y descripción textual | B |
| **G-FIG-05** `CORE_BUILD` | **Sin aritmética en la capa web**: ninguna Figure con `origin: DERIVED`; ninguna prosa que compare magnitudes entre claims (`REL-PR-012`); **ningún porcentaje, razón, puntaje o índice construido sobre estados o claims** (solo conteos por estado, `REL-PR-010`) | B |
| **G-FIG-06** `CORE_BUILD` | Las Figures de tipo `CLAIM_TEXT` (sin origen estructurado) tienen doble testigo (claim + evidencia) y figuran en el reporte | B |

## 11. G-EDI · Capa editorial

| ID | Verifica | Sev. |
|---|---|---|
| **G-EDI-01** `CORE_BUILD` | Todo texto público tiene registro de auditoría vigente cuyo `canonical_hash` == hash del canónico actual (si no, **obsoleto ⇒ bloquea**) | B |
| **G-EDI-02** `CORE_BUILD` | Las 18 `public_question` == texto auditado y aprobado (hash) | B |
| **G-EDI-03** `CORE_BUILD` | Lint de verbos protegidos («establece», «confirma», «demuestra», «prueba», «corrobora», «explica», «causa», «impulsa», «consistente con», «el mercado laboral argentino muestra») sin alcance explícito | B |
| **G-EDI-04** `CORE_BUILD` | Términos de población/período/causalidad en el texto público ⊂ los del `scope_statement` del canónico (heurística; positivos a revisión humana obligatoria) | W→revisión |
| **G-EDI-05** `CORE_BUILD` | Solo se referencian `Relation` `AUTHORIZED`/`JUXTAPOSITION_ONLY` y con su texto; ninguna `PROHIBITED`/`GOVERNANCE_REQUIRED` como afirmación | B |
| **G-EDI-06** `CORE_BUILD` | Sin marcadores de dato pendiente (`*`), TODO, lorem ni placeholders | B |
| **G-EDI-07** `CORE_BUILD` | Sin HTML crudo en Markdown; componentes solo de la lista blanca de directivas | B |
| **G-EDI-08** `CORE_BUILD` | Toda cadena mostrada en el sitio (incluida la búsqueda) proviene de `generated/` o de un texto con auditoría vigente | B |

## 12. G-MOD y G-ASK

| ID | Verifica | Sev. |
|---|---|---|
| **G-MOD-01** `FEATURE_GATED` | **Aislamiento**: ninguna entidad de un módulo referencia otro módulo salvo mediante `CrossModuleRelation` con `governance_ruling_id` resoluble en ambos | B |
| **G-MOD-02** `FEATURE_GATED` | Un módulo se construye y valida solo (`corpus:build --module labor`); cambiar otro módulo no cambia sus hashes | B |
| **G-MOD-03** `FEATURE_GATED` | No hay raíces de evidencia ni Figures compartidas entre módulos sin relación gobernada | B |
| **G-MOD-04** `FEATURE_GATED` *(Enmienda 1)* | **Sin inferencia multi-módulo**: toda afirmación o Figure que dependa de más de un módulo exige `CrossModuleRelation` gobernada, provenance de ambos módulos y auditoría editorial; ninguna se deriva de la yuxtaposición | B |
| **G-DL-01** `FEATURE_GATED` *(Enmienda 1)* | **Descargas / API**: todo artefacto descargable o endpoint expone el hash del manifest, la licencia de la fuente, el provenance y la versión de esquema; nunca datos crudos sin licencia de redistribución registrada | B |
| **G-BHV-01** `FEATURE_GATED` *(Enmienda 1)* | **Verificación de hash en el navegador**: el hash mostrado == el del manifest del mismo release; el verificador no agrega dependencias de terceros y queda bajo `G-SEC-04` | B |
| **G-ASK-01** `FEATURE_GATED` | `answerability` presente y coherente con el estado (`NOT_IDENTIFIABLE` ⇒ `NOT_ANSWERABLE`) en todas las Question/Claim/Figure | B |
| **G-ASK-02** `FEATURE_GATED` | `semantic_id` únicos y estables entre releases; alias no contradicen el canónico | B |
| **G-ASK-03** `FEATURE_GATED` | Toda cita (`global_id` + permalink versionado) resuelve | B |

## 13. G-UX · Contenido renderizado, enlaces y conformidad con el Charter

| ID | Verifica | Sev. |
|---|---|---|
| **G-UX-01** `CORE_BUILD` | **Ningún `undefined`, `NaN`, `[object`, `null` ni plantilla sin resolver** en el HTML de ninguna ruta ni estado | B |
| **G-UX-02** `CORE_BUILD` | Todos los enlaces internos y anclas del **contenido implementado** resuelven (rastreo del sitio construido; el rastreo completo, con `/v/` y enlaces externos, es `G-LNK-01`) | B |
| **G-UX-03** `CORE_BUILD` | **Ningún `href="#"`** ni enlace vacío | B |
| **G-UX-04** `CORE_BUILD` | Las 18 preguntas y 14 claims son alcanzables desde el mapa; **ningún enlace del mapa queda muerto** (cada uno resuelve a una ficha implementada: 5 completas + 13 mínimas); cada ■ corresponde a un claim existente; `/limites` incluye los resultados preservados de los tres regímenes y, en particular, los del régimen C (`KEEP-003`, `-004`, `-006`, `-007`) | B |
| **G-UX-05** `CORE_BUILD`† | **Sin JavaScript**: el contenido íntegro se lee y todas las puertas del mapa se abren | B |
| **G-UX-06** `CORE_BUILD`† | **Conformidad estática con el Charter**: sin literales de color fuera de `design/tokens.css`; sin sombras; sin gradientes suaves (los patrones de rayado/corte del Charter §8 se permiten por lista blanca); sin fotografías; sin `*` de pendiente | B |
| **G-UX-07** `RELEASE` | Prueba de identidad sin logotipo (`?nologo`) del Charter §1: verificación **manual** en cada release (anotada en el reporte) | W→manual |
| **G-UX-08** `RELEASE`† | **Anti-dashboard** (Charter §3.3, §14): en la primera mitad del Home, ≤ 1 Figure visible a la vez (≤ 2 durante la Apertura); ningún componente llamado `card`/`kpi`/`tile`/`metric`; `/hallazgos` y `/explorar` son índices tipográficos, no grillas de tarjetas | B |
| **G-SEO-01** `RELEASE` *(Enmienda 1)* | `<title>` y descripción únicos por ruta, **derivados de cadenas auditadas**; `lang="es-AR"`; URL canónica coherente con el release; sitemap == rutas implementadas; `/preguntar` no está indexada ni en el sitemap; ningún número en metadatos fuera de una Figure (`G-FIG-03`) | B |
| **G-OG-01** `RELEASE` *(Enmienda 1)* | **Preservación de contexto en vistas previas** (Open Graph / tarjetas): `og:title`/`og:description` llevan la `public_question` aprobada, la etiqueta de resolución y, cuando aplica, el aviso de alcance; **nunca una cifra sin su calificador** (nominal/real, período, alcance) ni un estado sin su etiqueta; **sin imágenes de compartir** en V1 | B |
| **G-LNK-01** `RELEASE` *(Enmienda 1)* | **Link check completo**: todas las rutas y anclas, incluidos los archivos `/v/<release>/…`; los enlaces externos a publicadores (`original_url` del corpus) se verifican. Los internos rotos **bloquean**; un externo caído **se reporta y no se elimina en silencio** (decisión humana) | B (internos) · W (externos) |

## 14. G-A11Y

| ID | Verifica | Sev. |
|---|---|---|
| **G-A11Y-01** `RELEASE` | axe: 0 violaciones en todas las rutas y estados (mapa abierto/cerrado; Rastro en 3 profundidades) | B |
| **G-A11Y-02** `RELEASE` | Teclado completo, foco visible, `inert`/no focalizable en paneles cerrados | B |
| **G-A11Y-03** `RELEASE` | Contrastes según Charter §15; texto en `mute`/`hair-2` prohibido | B |
| **G-A11Y-04** `RELEASE` | `prefers-reduced-motion` respetado; nada esencial depende de animación | B |
| **G-A11Y-05** `RELEASE` | Objetivos táctiles ≥ 24×24 px CSS; **reflow a 320 px sin scroll horizontal y comportamiento mobile real verificado**. OD-02 está resuelta como **gate de release**: **bloquea el lanzamiento público** y, hasta que pase, **no se declara WCAG 2.2 AA** | B |
| **G-A11Y-06** `RELEASE` | Revisión manual con lector de pantalla por release (Charter §15: pendiente de verificar) | manual |

## 15. G-PERF · Presupuestos

Definidos en `WEB-0-ARCHITECTURE.md` §10.

| ID | Verifica | Sev. |
|---|---|---|
| **G-PERF-01** `RELEASE` | B-JS-1/2/3/4, B-HTML, B-CSS, B-REQ, B-TOT | B |
| **G-PERF-02** `RELEASE` | B-LCP, B-FCP, B-CLS, B-INP/TBT (Lighthouse, perfil móvil, caché fría) | B |
| **G-PERF-03** `CORE_BUILD`† | Lista blanca de islas cliente: todo Client Component figura en `islands/` aprobados | B |
| **G-PERF-04** `RELEASE` | B-FONT, B-IMG, B-SVG; sin solicitudes a terceros | B |

## 16. G-SEC y G-LEG

| ID | Verifica | Sev. |
|---|---|---|
| **G-SEC-01** `RELEASE`† | Escáner de PII en `generated/` y `editorial/`; positivos a revisión humana | B |
| **G-SEC-02** `RELEASE` | Cabeceras (CSP, Referrer-Policy, Permissions-Policy, HSTS) presentes en el sitio servido | B |
| **G-SEC-03** `RELEASE` | Auditoría de dependencias; lockfile; sin `postinstall`; dependencias directas de producción ≤ 5 | B |
| **G-SEC-04** `RELEASE` | **Red bloqueada**: el sitio funciona sin ninguna solicitud a otro origen; cualquier solicitud externa falla | B |
| **G-LEG-01** `CORE_BUILD`† | No hay datos crudos en el repo (denegación por extensión y tamaño, espejo de la política de almacenamiento del corpus) | B |
| **G-LEG-02** `RELEASE` | Atribuciones y licencias exigidas por cada `Source` mostrada presentes en `/sobre` y en la cota | B |
| **G-LEG-03** `RELEASE` *(Enmienda 1)* | **Revisión legal obligatoria antes de publicar** (OD-03): existe un registro fechado de revisión que cubre cada `Source` mostrada y cada tipo de contenido derivado, con la decisión sobre licencias registradas (p. ej. CC BY-SA 4.0 de CGI: atribución y *ShareAlike*) y sobre las `NOT_RECORDED`. Sin ese registro no hay release público | B |

## 17. G-REL · Releases y versionado

| ID | Verifica | Sev. |
|---|---|---|
| **G-REL-01** `RELEASE` | `releases/<release>.json` completo (módulos, manifests, editorial, Charter, generador, `build_id`, rutas con hash) | B |
| **G-REL-02** `RELEASE` | La versión y el commit visibles en el pie y en `/versiones` == release manifest == manifests generados | B |
| **G-REL-03** `RELEASE` | **Releases anteriores inmutables**: el hash de cada release manifest previo no cambió | B |
| **G-REL-04** `RELEASE` | Todo cambio en algún hash de `generated/` o `editorial/` respecto del release previo tiene entrada de changelog con clase (C1–C4) | B |
| **G-REL-05** `RELEASE` | La cadena de cita generada resuelve y coincide con el manifest | B |
| **G-REL-06** `RELEASE` | Un cambio C4 incluye aviso de corrección visible y conserva la versión anterior | B |

---

## 18. Los gates se prueban a sí mismos (fixtures defectuosos)

Cada gate tiene un caso sembrado que **debe** fallarlo. Sin ese fixture rojo, el gate no se considera implementado.

| Falla sembrada | Debe fallar |
|---|---|
| Cambiar un byte de `corpus-src/…/claim-ledger.json` | G-SRC-03, G-GEN-02 |
| Working tree sucio en el repo fuente | (debe **no** cambiar el resultado) G-SRC-05 |
| Apuntar el pin a otro commit | G-SRC-01 |
| Cambiar el estado de `LAB-CLM-0005` en `generated/` | G-STA-01, G-GEN-05, G-CNT-01 |
| Poner `BLOCKED_BY_DESIGN` como estado de un Claim | G-SCH-01, G-STA-03 |
| Agregar un claim a Q-0006 | G-REF-04, G-CNT-01, G-STA-02 |
| Quitar `LAB-CLM-0004` de Q-0003 | G-REF-04 |
| Escribir «35,48 %» a mano en un `.md` editorial | G-FIG-02, G-FIG-03 |
| Cambiar `value_raw` de una Figure sin cambiar su ancla | G-FIG-01 |
| Borrar una limitación pública de CLM-0007 | G-LIM-02, G-LIM-01 |
| Clasificar como `AUDIT_ONLY` una limitación de clase `SCOPE` | G-LIM-02 |
| Cambiar el canónico (nuevo pin) sin reauditar `public_question` | G-EDI-01 |
| Editar un texto aprobado sin nuevo registro | G-EDI-02, G-LIM-05 |
| Añadir un campo `state` en un archivo de `editorial/` | G-STA-04 |
| Escribir «demuestra» o «causa» en un texto | G-EDI-03 |
| Referenciar una `Relation` `PROHIBITED` como afirmación | G-EDI-05 |
| Insertar `href="#"` | G-UX-03 |
| Producir `undefined` en un panel | G-UX-01 |
| Referencia de una entidad de `labor` a otra de un módulo ficticio | G-MOD-01 |
| Agregar un script de tercero | G-SEC-04, G-PERF-04 |
| Superar el presupuesto de JS por 1 KB | G-PERF-01 |
| Modificar un release publicado | G-REL-03 |
| Escribir «11 establecidas» sin calificador | G-STA-06 |
| Mostrar «10 de 14 claims (71 %)» | G-FIG-05 |
| Renderizar «2 fuentes independientes» en un claim | G-PRV-06 |
| Un número dentro de un `aria-label` o del índice de búsqueda | G-FIG-03 |
| Un bloque de tarjetas de KPI en el Home | G-UX-08 |
| Un enlace del mapa hacia una ficha inexistente | G-UX-04, G-UX-03 |
| `/limites` sin ningún resultado preservado del régimen C | G-UX-04 |
| Bundle con sha256 distinto al del manifest de backup | G-SRC-06 |
| Restauración de prueba donde el tag resuelve a otro commit | G-SRC-06 |
| Release público sin registro de revisión legal | G-LEG-03 |
| Fuente `NOT_RECORDED` presentada como redistribuible | G-PRV-05, G-LEG-03 |
| Viewport de 320 px con scroll horizontal | G-A11Y-05 |
| `og:description` con «35,48 %» sin calificador | G-OG-01, G-FIG-03 |
| `<title>` duplicado entre dos rutas | G-SEO-01 |
| Un enlace interno roto dentro de un archivo `/v/<release>/` | G-LNK-01 |
| **Tripwire:** agregar un segundo módulo a `modules.lock.json` con los `G-MOD-*` inactivos | la corrida falla (activación automática) |
| **Tripwire:** agregar la ruta `/preguntar` o un `ask/` con `G-ASK-*` inactivos | la corrida falla |
| **Tripwire:** publicar un `.csv` en `public/` fuera de la lista blanca | G-DL-01 se activa y falla |
| Página de Q-0004 sin nota de brecha pregunta–claim | G-LIM-03 |

---

## 19. Protocolo ante un fallo

1. El build se detiene; el reporte identifica gate, IDs afectados y valor esperado/observado.
2. **Nunca se «arregla» el fixture ni el contrato para que pase**: primero se decide si el error está en la fuente, el generador, el editorial o el gate.
3. Un fallo de `G-SRC-*` o `G-GEN-05` se trata como **posible drift del corpus**: se investiga contra el tag antes de tocar nada.
4. Si el fallo es de contenido publicado, se aplica la política de correcciones (`WEB-0-ARCHITECTURE.md` §8.3).

---

## Anexo A · Inventario de los 88 gates originales (ninguno eliminado)

| Clasificación | Originales | Agregados por la Enmienda 1 | Total |
|---|---|---|---|
| `CORE_BUILD` | 59 | 0 | 59 |
| `RELEASE` | 23 | 5 | 28 |
| `FEATURE_GATED` | 6 | 3 | 9 |
| **Total** | **88** | **8** | **96** |

IDs originales, por familia:

- `G-SRC`: 01, 02, 03, 04, 05
- `G-GEN`: 01, 02, 03, 04, 05
- `G-SCH`: 01, 02
- `G-CNT`: 01, 02
- `G-REF`: 01, 02, 03, 04, 05, 06
- `G-STA`: 01, 02, 03, 04, 05, 06, 07
- `G-PRV`: 01, 02, 03, 04, 05, 06
- `G-LIM`: 01, 02, 03, 04, 05
- `G-FIG`: 01, 02, 03, 04, 05, 06
- `G-EDI`: 01, 02, 03, 04, 05, 06, 07, 08
- `G-MOD`: 01, 02, 03
- `G-ASK`: 01, 02, 03
- `G-UX`: 01, 02, 03, 04, 05, 06, 07, 08
- `G-A11Y`: 01, 02, 03, 04, 05, 06
- `G-PERF`: 01, 02, 03, 04
- `G-SEC`: 01, 02, 03, 04
- `G-LEG`: 01, 02
- `G-REL`: 01, 02, 03, 04, 05, 06

Agregados por la Enmienda 1: `G-BHV-01` (FEATURE_GATED), `G-DL-01` (FEATURE_GATED), `G-LEG-03` (RELEASE), `G-LNK-01` (RELEASE), `G-MOD-04` (FEATURE_GATED), `G-OG-01` (RELEASE), `G-SEO-01` (RELEASE), `G-SRC-06` (RELEASE).
