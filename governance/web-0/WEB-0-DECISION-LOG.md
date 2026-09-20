# WEB-0 · DECISION LOG

| | |
|---|---|
| **Estado** | **FROZEN** — WEB-0 v1.0, 2026-09-19 (excepción declarada: OD-06 abierta por diseño) |
| **Fecha** | 2026-09-19 |
| **Contenido** | §1 Decisiones (ADR) · §2 Revisión adversarial y correcciones al plan (incluye §2.11, revisión de la Enmienda 1) · §3 Decisiones abiertas y resueltas · §4 Freeze |

Este registro es solo-append una vez congelado WEB-0. Toda decisión posterior se agrega como ADR nuevo con fecha.

---

## 1. Decisiones (ADR)

| ID | Decisión | Alternativas consideradas | Consecuencia principal |
|---|---|---|---|
| **D-001** | Repo de producción independiente `C:\Proyectos\ALETHEIA-WEB` (a crear **después** de WEB-0). Los repos científicos son solo lectura | Vivir dentro de V1 o de LABOR | La web nunca puede modificar la ciencia; una sola dirección de flujo |
| **D-002** | La autoridad de cada fuente es el **commit** pineado (el tag se verifica contra él). Dos pins: LABOR y V1 (V1 solo para `provenance.json`) | Pinear por nombre de tag | Un tag movido no cambia el corpus web en silencio |
| **D-003** | **Vendorizar** byte a byte los archivos consumidos en `corpus-src/` | Leer LABOR en vivo en cada build | Reproducible sin LABOR (que no tiene remoto); `verify:pin` prueba no-drift cuando hay acceso |
| **D-004** | El corpus web derivado (`generated/`) **se commitea**, y un gate exige que coincida con la regeneración | Regenerar siempre y no commitear | Diff auditable; CI sin acceso a LABOR |
| **D-005** | Determinismo estricto: JSON canónico, sin tiempo real (`SOURCE_DATE_EPOCH` = fecha del commit fijado), sin rutas, sin red | — | Mismos bytes en cualquier máquina |
| **D-006** | Nada se calcula en la capa web; toda cifra es una **Figure** con origen estructurado preferente y ancla textual | Cifras tipeadas en prosa; parseo de `RESULT` | Ninguna cifra existe solo como texto editorial |
| **D-007** | `Question.resolution` y `Claim.epistemic_state` son campos **distintos**; la resolución no se deduce en silencio de los claims | Un solo campo «estado» | Sin mezcla pregunta/claim |
| **D-008** | `Question → 0..N Claims` congelado; el generador **falla** si los claims de una pregunta discrepan | Elegir/promediar | Sin agregación de estados (`REL-PR-001/-010`) |
| **D-009** | Editorial = Markdown + YAML + directivas restringidas. **No MDX** | MDX | Un editor no puede ejecutar código ni saltarse gates |
| **D-010** | Texto público atado a su canónico por `canonical_hash`; si el canónico cambia, el texto queda obsoleto y bloquea | Confiar en la revisión humana | Sin copy apoyado en un canónico que ya no existe |
| **D-011** | Cobertura obligatoria de limitaciones: 72 canónicas de claims con `class`+`disposition`; `AUDIT_ONLY` solo `PROCEDURAL` | Limitaciones condensadas sin trazabilidad | Nadie se salta una limitación en silencio |
| **D-012** | **Una página canónica por pregunta**; hallazgo = página Tier A; el claim es un ancla; Tier B (**ficha mínima generada, decidido en OD-05**) para el resto | Páginas separadas de hallazgo y de pregunta; páginas de claim | Un URL por contenido; ningún enlace del mapa queda muerto |
| **D-013** | Rutas V1: `/`, `/hallazgos`, `/explorar`, `/limites`, `/metodo`, `/sobre`, `/versiones`, `/labor/preguntas/[id]`, `/labor/rastro/[claim]`, `/v/[release]/…`; **`/preguntar` reservada** | Rastro en el header | Respeta la navegación fijada por el Charter; namespacing por módulo |
| **D-014** | Hallazgos V1: **Q-0005, Q-0003, Q-0004, Q-0013, Q-0011** (criterio: lecciones distintas; puntajes en `WEB-0-MVP.md` §3) | Q-0008, Q-0001, Q-0014 | Cubre observado, multi-claim, refutado, insuficiente y no identificable |
| **D-015** | Hero **sin elegir**; candidatos a prueba: **HC-1** (`CLM-0006`) y **HC-2** (`CLM-0005`) | Elegir el del prototipo | La elección la decide una prueba, no la estética |
| **D-016** | Stack objetivo: Next.js App Router estático (`output: 'export'`) + RSC + TS strict + Zod (solo build) + SVG propio (+ d3 en build) + CSS con tokens (**sin Tailwind**) + búsqueda propia bajo demanda + Vitest + Playwright + axe. **Condicionado a un spike** que mida el JS de línea base (OD-01) | Astro con islas | JS muy bajo; el contenido no depende de JS |
| **D-017** | Presupuestos B-*/A-* como gates medibles que solo pueden endurecerse | Presupuestos indicativos | Rendimiento y accesibilidad dejan de ser aspiración |
| **D-018** | Módulos: contrato, namespace y versión propios; **relaciones entre módulos denegadas por defecto**; `CrossModuleRelation` con ruling en ambos módulos | Corpus único mezclado | Federación sin contaminación de evidencia |
| **D-019** | Ask: deployment aislado; el modelo solo emite **referencias a Figures**; validador determinista rechaza cualquier dígito fuera de una referencia. **Ask no escribe cifras de memoria** | RAG libre | Ask no puede alucinar una cifra por construcción |
| **D-020** | Releases inmutables (`web-x.y.z`); política de correcciones C1–C4; changelog público append-only; cita generada desde el manifest | Sobrescribir el sitio | Trazabilidad y citabilidad |
| **D-021** *(enmendada, OD-02)* | Responsive/mobile es un **gate de release**: no bloquea el freeze ni la creación del repo, **sí bloquea el release público**; **no se declara WCAG 2.2 AA** hasta verificar reflow a 320 px y comportamiento mobile real | Declarar AA sin verificar; bloquear el repo hasta tener responsive | Honestidad de conformidad sin frenar el desarrollo inicial |
| **D-022** | Los vínculos raíz→fuente sin registro directo se declaran `UNRESOLVED` y no se enlazan | Inferir por nombre | Sin proveniencia inventada |
| **D-023** | La reconciliación aceptada del prototipo es **fixture de regresión**, no fuente: si difiere, gana el tag | Usarla como fuente | Independencia del verificador |
| **D-024** | WEB-0 **no enmienda** el Design Charter: lo referencia. Propuestas de enmienda en OD-10 | Duplicar/editar el Charter | Una sola autoridad visual |
| **D-025** *(OD-12)* | **Backup verificable** de V1 y LABOR fuera de la máquina principal: `git bundle` + SHA-256 + `BACKUP-MANIFEST`, ≥ 2 copias, prueba de restauración. **El backup no es fuente de verdad**: la autoridad sigue siendo repo + tag + commit + manifest/hash. No modifica los repos | Confiar en la copia vendorizada; backup sin verificación | Continuidad ante pérdida de la única máquina (V1 y LABOR no tienen remoto) |
| **D-026** | **Clasificación de gates** por momento de activación: `CORE_BUILD` (bloquean desde WEB-1) · `RELEASE` (bloquean el lanzamiento público) · `FEATURE_GATED` (por disparador automático). Se conservan los 88 originales y se agregan 8 (RELEASE/FEATURE_GATED) | Todos bloqueantes desde el día uno; eliminar gates | MVP sin sobreingeniería, sin perder ningún gate; ninguna feature llega sin sus gates (tripwires) |
| **D-027** *(OD-05)* | MVP = **5 fichas completas + 13 mínimas generadas**; ningún enlace del mapa queda muerto; la ficha mínima usa el mismo contrato de datos y de estados | Solo 5 páginas + mapa con paneles sin enlace | 18 permalinks citables; deuda editorial acotada a cadenas ya auditadas |
| **D-028** *(OD-13)* | El **régimen C** queda fuera de las cinco fichas destacadas del Home y **sigue visible** en el mapa, `/limites`, sus fichas mínimas y el Método cuando sea relevante | Destacarlo; ocultarlo | No se fuerza una vitrina cuantitativa donde no hubo corpus empírico (0 avisos, 0 fuentes admitidas, 0 raíces) |
| **D-029** *(OD-03)* | **Revisión legal obligatoria antes de publicar.** Regla por defecto para fuentes sin licencia de redistribución registrada: sin crudos, enlace al publicador, sin permiso asumido, solo derivados compatibles con el contrato y sujetos a revisión | Asumir permiso por ser datos públicos | Ninguna redistribución implícita (`G-LEG-03`) |
| **D-030** *(OD-06)* | El **hero no se congela**: candidatos `CLM-0006` (primario para la prueba) y `CLM-0005`; la elección sale de una prueba de comprensión/lectura | Elegir por estética o por el demo del prototipo | El hero queda abierto por diseño aun con WEB-0 congelado |

---

## 2. Revisión adversarial

Se intentó romper el plan **antes** de declararlo listo. Cada hallazgo se contrasta con el corpus o el prototipo cuando fue posible medirlo. «Corrección» = cambio ya incorporado a los documentos de WEB-0.

### 2.1 Dónde puede aparecer drift

| # | Hallazgo | Sev. | Corrección incorporada |
|---|---|---|---|
| F-01 | La primera formulación del plan leía LABOR en cada build. **LABOR no tiene remoto** (cierre final §15): un solo disco es la única copia | Alta | D-003: vendorización + `verify:pin` opcional pero obligatorio en release; OD-12 (preservación) |
| F-02 | Un nuevo pin puede cambiar un canónico sin que el copy se entere | Alta | D-010: `canonical_hash` + `G-EDI-01` |
| F-03 | **Medido:** el Home del prototipo tiene 27 tokens numéricos escritos a mano (`+35,48 %` ×2, `+2,10 %` ×2, `−7,97`, `36,29`, `37,90`, `+1,61`, años). En `build_map.py`, los titulares de claims tipean cifras; el chequeo mecánico contra el texto del claim no pudo trazar 9 tokens (todos correctos tras revisión **humana**) | Alta | D-006, `G-FIG-01/02/03` |
| F-04 | **Medido:** V1 tiene un archivo *untracked* en su working tree; un extractor que lea el working tree mezclaría contenido ajeno al freeze | Media | `G-SRC-05` + lectura solo de objetos git |
| F-05 | Las etiquetas documentales (`BLOCKED_BY_DESIGN`, `OUTSIDE_LAB_A`) no están en los ledgers, solo en S0 y en el cierre del régimen A | Media | Doble testigo en `G-STA-02` |
| F-06 | El golden fixture podría convertirse en la verdad | Media | D-023: gana el tag; hash del fixture fijado (`G-GEN-05`) |
| F-07 | Dos copias del Design Charter (prototipo y repo web) pueden divergir | Media | D-024 + hash de la copia vendorizada; OD-10 define el traspaso |
| F-08 | Un mismo contenido con dos URLs (hallazgo y pregunta) genera citas ambiguas | Media | D-012: una página por pregunta |
| F-09 | Tiempo, locale, rutas y orden del filesystem cambian los bytes | Media | D-005 + `G-GEN-04` |

### 2.2 Dónde puede mezclarse pregunta con claim

| # | Hallazgo | Sev. | Corrección |
|---|---|---|---|
| F-10 | Inferir la resolución de una pregunta a partir de sus claims (o de su cantidad) | Alta | D-007/D-008: campo separado; el generador falla ante discrepancia |
| F-11 | Una etiqueta documental (`NOT_IDENTIFIABLE`) con ■, o presentada como «claim» | Alta | `G-STA-03`; Charter §20.3 |
| F-12 | **Q-0004:** «Refutada dentro de su alcance» (etiqueta de *pregunta*) se lee como «se refutó la pregunta»; la `public_question` es amplia y el claim mide una sola variable indirecta en dos trimestres. Lo mismo, en menor grado, en Q-0001, Q-0005, Q-0008 | Alta | Regla nueva: **nota de brecha pregunta–claim** obligatoria cuando el `scope_statement` del claim es más estrecho que la pregunta (Editorial §5.7); `G-LIM-03` |
| F-13 | Q-0003: dos claims fusionados en un solo número/estado en una tarjeta resumen | Media | Un ■ por claim; `REL-PR-010`; `G-REF-04`, `G-UX-04` |
| F-14 | Resultados de búsqueda que muestran el titular de un claim bajo la pregunta como si fueran equivalentes | Baja | Los resultados etiquetan el tipo (pregunta / claim) y muestran ambas capas |

### 2.3 Dónde podría inventarse una cifra

| # | Hallazgo | Sev. | Corrección |
|---|---|---|---|
| F-15 | Cifras solo en texto (sin JSON estructurado), p. ej. `CLM-0001` | Media | Doble testigo + contabilizadas (`G-FIG-06`) |
| F-16 | Diferencias de redondeo entre valor estructurado y texto | Media | Ancla textual reproducida por `display` (`G-FIG-01`) |
| F-17 | Aritmética en la web (diferencias, razones, promedios, ejes compartidos) | Alta | `origin: DERIVED` prohibido; `G-FIG-05` |
| F-18 | Cifras filtradas por **atributos** (`aria-label`, `alt`, `<title>` de SVG, `<meta>`), JSON-LD o el índice de búsqueda | Media | `G-FIG-03` extendido a atributos, meta y al índice |
| F-19 | Numerales estructurales («18 preguntas», «14 claims») y años tipeados | Media | `{{count}}` desde el manifest; períodos por directiva |
| F-20 | Imágenes de compartir (OG) con cifras | Baja | No se generan imágenes de compartir en V1 |

### 2.4 Dónde podría subir la fuerza de evidencia

| # | Hallazgo | Sev. | Corrección |
|---|---|---|---|
| F-21 | «Observado en la fuente» leído como «confirmado/verdadero» | Media | Verbos protegidos (`G-EDI-03`); Método; `not_eligible_for` visible |
| F-22 | **IPC como «segunda fuente»**: `CLM-0004` y `CLM-0006` usan IPC como deflactor, que **no cuenta como raíz**; y `CLM-0007` cita dos raíces no independientes (SIPA/ARCA) | Alta | Rastro distingue nodos de deflactor; **V1 no muestra conteo de raíces ni «N fuentes»**; se muestra `lineage_independence` (Editorial §5, `G-PRV-06`) |
| F-23 | Tallies convertidos en puntuaciones («10 de 14 observados = 71 %») → composite prohibido (`REL-PR-010`) | Media | Solo conteos por estado, sin porcentajes/razones/scores (`G-FIG-05`) |
| F-24 | **«Real» en español ambiguo:** «nominal vs real» invita a leer lo nominal como irreal; el verdigris de la Apertura resalta la lectura revelada como «la verdadera» | Media | Regla de voz: «real» siempre con «(descontada la inflación)»; nunca «el número real/verdadero»; la lectura revelada es «otra lectura» (Editorial §8.8) |
| F-25 | Cuatro claims `OBSERVED_IN_SOURCE` no son mediciones (`CLM-0008/0009/0010/0012`) | Media | Calificador obligatorio (`G-STA-07`) |
| F-26 | Divulgar/omitir exposición previa: 3 de los 5 hallazgos descansan en hipótesis `INDIRECT` | Media | Divulgación obligatoria (`G-LIM-03`); no presentar la preinscripción como salvaguarda (`REL-PR-011`) |
| F-27 | **`ESTABLISHED` (celda regulatoria) vs `ESTABLISHED_WITHIN_SCOPE` (0 claims):** «11 establecidas» sugiere claims establecidos | Media | `G-STA-06`; OD-09 |
| F-28 | Rastro de `CLM-0007` muestra `LAB-EVD-0015` («NOT COMPUTABLE», reemplazada) como respaldo vigente | Media | `ClaimSupersession` con cita del corpus (`G-PRV-04`) |

### 2.5 Dónde podría mezclarse evidencia entre módulos

| # | Hallazgo | Sev. | Corrección |
|---|---|---|---|
| F-29 | Colisión de IDs (otro módulo con `Q-0001`) | Media | `global_id = <module>/<id>` |
| F-30 | Un módulo futuro («inflación») reemplazando en silencio el deflactor IPC de LABOR, o compartiendo raíces | Alta | Relaciones denegadas por defecto; `G-MOD-01/03` |
| F-31 | Un Home que yuxtapone módulos con eje compartido (ingresos vs inflación) | Media | Solo yuxtaposición de piezas independientes; sin eje ni métrica derivada (`REL-PR-010/-012`) |
| F-32 | Vocabularios de estado que divergen entre módulos | Baja | Vocabulario por módulo + núcleo común; ampliar = enmienda |

### 2.6 Dónde un editor podría saltarse una limitación

| # | Hallazgo | Sev. | Corrección |
|---|---|---|---|
| F-33 | **Medido:** 72 limitaciones canónicas de claims vs 53 viñetas públicas a nivel pregunta; el prototipo **no puede demostrar cobertura** (no hay mapeo limitación→texto) | Alta | D-011: matriz de cobertura + `G-LIM-02` |
| F-34 | Marcar todo como «solo auditoría» | Media | `AUDIT_ONLY` solo `PROCEDURAL`; la distribución por clase se reporta |
| F-35 | MDX/JS en el contenido para saltarse componentes | Alta | D-009 |
| F-36 | Límites en un pie de página, lejos de la cifra | Media | `G-LIM-04` |
| F-37 | Las fichas Tier B generadas omiten «lo que NO significa» | Media | Límites `SHOWN` siempre; `G-LIM-03` |
| F-38 | Un nuevo pin agrega una limitación y nadie la cubre | Media | `G-LIM-02` falla (cobertura incompleta) |

### 2.7 Dónde Ask podría alucinar

| # | Hallazgo | Sev. | Corrección |
|---|---|---|---|
| F-39 | El modelo escribe una cifra de memoria | Alta | D-019: solo referencias a Figures; validador rechaza dígitos fuera de ellas |
| F-40 | Inyección de instrucciones vía texto externo dentro del corpus (citas normativas, resúmenes de plataformas) | Media | El corpus se trata como datos; sin herramientas con efectos; aislamiento |
| F-41 | Parafrasear un estado («probablemente establecido») | Media | Etiquetas de estado insertadas desde el vocabulario; lint de verbos protegidos sobre la salida |
| F-42 | Responder «plausiblemente» una pregunta `NOT_IDENTIFIABLE` | Alta | `answer_kind = NOT_ANSWERABLE` derivado; respuesta fija de ausencia |
| F-43 | Síntesis entre claims/regímenes | Alta | `forbidden_inferences`; respuestas por entidad; solo yuxtaposición ya registrada |
| F-44 | Recuperar cadenas sin auditar | Media | `G-EDI-08`: solo cadenas auditadas están indexadas |

### 2.8 Dónde el diseño podría degenerar en dashboard

| # | Hallazgo | Sev. | Corrección |
|---|---|---|---|
| F-45 | Fichas Tier B + mapa → grilla de tarjetas/KPIs; `/hallazgos` como tarjetas | Media | `/hallazgos` es un **índice tipográfico** (Charter §11.4); nuevo `G-UX-08` (una cifra visible a la vez en la primera mitad del Home; sin componentes `card`/`kpi`/`tile`) |
| F-46 | Hero de conteos (`18/14/0`) | Baja | Descartado (`WEB-0-MVP.md` §5.2 HC-6) |
| F-47 | **Medido:** el prototipo usa un gradiente real (`.hero__cue i`) y el Charter §3.1 dice «Sin gradientes»; el rayado del §8 se implementa con `repeating-linear-gradient` | Baja | `G-UX-06` con lista blanca de patrones; aclaración propuesta en OD-10 |
| F-48 | Falta de plantillas de página de pregunta / Límites / Método / Sobre / Versiones: el Charter define componentes, no páginas | Media | OD-19: solo composición de componentes aprobados; un componente nuevo exige enmienda |

### 2.9 Qué depende de una persona o del scratchpad y no es reproducible

| # | Hallazgo | Sev. | Corrección |
|---|---|---|---|
| F-49 | **Medido:** `build_map.py` lee `scratchpad/frozen/…` (ruta temporal de sesión) y no puede correrse sin ella | Alta | §`WEB-0-DATA-CONTRACT.md` 4.1: pins + vendorización; prohibidas rutas absolutas (`G-GEN-04`) |
| F-50 | `reconcile.py` tiene rutas absolutas y no verifica más que el tag | Media | Pin por commit + blob shas |
| F-51 | El copy vivió como diccionarios Python dentro del generador | Alta | `editorial/` separado + auditoría atada por hash |
| F-52 | La aprobación de la reconciliación y del copy vive en una conversación | Media | Registros de auditoría y este log dentro del repo |
| F-53 | `verify:pin` necesita acceso a los tags (una máquina): puede omitirse | Media | El release exige adjuntar su reporte (hash en el release manifest) |
| F-54 | Regresión visual depende del navegador local | Baja | Línea base generada en un entorno fijado (contenedor/lockfile de Playwright) |

### 2.10 Correcciones aplicadas al plan como resultado

P-01 vendorización (D-003) · P-02 atadura por `canonical_hash` (D-010) · P-03 MDX → directivas (D-009) · P-04 una página por pregunta y Tier B (D-012) · P-05 matriz de cobertura (D-011) · P-06 reflow como prerrequisito y no declarar AA (D-021) · P-07 validador de Ask (D-019) · P-08 `G-SRC-05` · P-09 `G-FIG-03` extendido · P-10 `G-UX-08` anti-dashboard · P-11 sin conteo de raíces (`G-PRV-06`) · P-12 sin porcentajes ni scores de estados · P-13 regla «real» · P-14 módulos denegados por defecto (D-018) · P-15 `UNRESOLVED` (D-022) · P-16 sin imágenes de compartir · P-17 nota de brecha pregunta–claim (Editorial §5.7).

Ningún hallazgo contradice el Design Charter. Las tensiones con el Charter (F-47, F-48, dependencia de OD-02) son **entre el prototipo y el Charter o dependencias de diseño**, no una contradicción de la arquitectura de WEB-0 con el Charter; por eso no se activa la condición de STOP.

### 2.11 Revisión adversarial de la Enmienda 1 (2026-09-19)

Se revisó lo que las decisiones finales podrían romper. Ninguno de estos hallazgos reabre un invariante; todos quedan resueltos en los documentos.

| # | Hallazgo | Sev. | Corrección |
|---|---|---|---|
| F-55 | **Medido:** el tag de LABOR referencia en 9 archivos un artefacto de V1 (`ALETHEIA_FORENSIC_AUDIT_2026-09-17.md`) que está **untracked** y cuyo hash LABOR **no registra**: un `git bundle` no lo preserva | Media | `referenced_untracked` en el `BACKUP-MANIFEST`, con `sha256` **calculado al respaldar** y etiquetado como tal (Data Contract §3.4) |
| F-56 | Si los gates `RELEASE` solo se corren al final, los fallos (responsive, AA, legal) se descubren tarde | Media | Modo informativo en CI desde que exista la pieza; la especificación responsive se produce en WEB-1 hito 2 (no al final); fixtures defectuosos para cada gate |
| F-57 | Las fichas mínimas heredan titulares de claim **con cifras**: sin regla, mostrarían números sin Encuadre (Charter §17) | Media | Regla: cifra ⇒ Figure con Encuadre; si no puede, no se muestra (`WEB-0-MVP.md` §1.3) |
| F-58 | El bundle de V1 pesa del orden del pack (1,64 GiB medido) y V1 incluye datos crudos en su historial | Baja | Prever capacidad en cada destino; cifrar en nube y registrar hash sin cifrar y del artefacto cifrado |
| F-59 | Una funcionalidad `FEATURE_GATED` podría evadir sus gates simplemente no activándolos | Media | **Disparadores automáticos** (tripwires): el ejecutor detecta la señal y falla si el gate está inactivo; fixtures para cada uno (Gates §1.1, §18) |
| F-60 | «Régimen C visible» podría degradarse a una sola fila del mapa | Baja | `G-UX-04` exige los resultados preservados de C en `/limites` (`KEEP-003/004/006/007`) y las cinco fichas mínimas |
| F-61 | «Ningún enlace del mapa muerto» obliga a construir el mapa **después** de las 13 fichas | Baja | Regla de secuenciación en Architecture §2.3 y MVP §1.3 |
| F-62 | 8 gates nuevos podrían leerse como sobreingeniería | Baja | Todos son `RELEASE` o `FEATURE_GATED`: **cero carga nueva en `CORE_BUILD`** (59 gates, los mismos de antes) |

**Consistencia interna** verificada por script sobre los 7 documentos: cada gate, ADR, hallazgo y decisión abierta referenciado está definido; los 88 gates originales están presentes; ningún documento conserva el estado «candidato»; la clasificación cubre el 100 % de los gates.

---

## 3. Decisiones: resueltas y abiertas

**Resueltas el 2026-09-19 (5):** OD-12 · OD-05 · OD-13 · OD-02 · OD-03. **Abierta por diseño (1):** OD-06. **Abiertas con fase asignada (13):** el resto. Ninguna cambia un invariante congelado.

| ID | Decisión | Estado | Resolución / recomendación | Bloquea |
|---|---|---|---|---|
| **OD-01** | Framework: Next.js estático vs Astro con islas, según el JS de línea base medido | **ABIERTA** — WEB-1 hito 0 | Next.js **si** cumple B-JS-1/2 en el spike; si no, ADR a Astro | Cierre del hito 0 |
| **OD-02** | Responsive/mobile y motion (Charter §18.4/§18.5) | **RESUELTA** — gate de release de WEB-1 | **No** bloquea el freeze de WEB-0 ni la creación del repo; **sí bloquea el release público**; no se declara WCAG 2.2 AA hasta verificar reflow y comportamiento mobile real | Release público |
| **OD-03** | Licencias y revisión legal | **RESUELTA** (regla) — **obligatoria pre-release** | Revisión legal antes de publicar. Sin licencia de redistribución registrada: no se redistribuye crudo, se enlaza al publicador, no se asume permiso; solo derivados compatibles con el contrato y sujetos a revisión (`G-LEG-03`). La revisión misma está pendiente | Release público |
| **OD-04** | Registros puente raíz→fuente (EPH/IPC/ARCA/SIPA/MLER/SRT) | **ABIERTA** — WEB-1 | V1 sin enlaces donde no hay registro directo; opcional: puentes auditados con base documentada | Enlaces a fuentes en el Rastro |
| **OD-05** | Fichas de las otras 13 preguntas | **RESUELTA** | **5 completas + 13 mínimas generadas**; ningún enlace del mapa muerto; mismo contrato de datos y de estados | — |
| **OD-06** | **Hero definitivo** | **ABIERTA POR DISEÑO** | **No se congela.** Candidatos: `CLM-0006` (primario para la prueba) y `CLM-0005`. La elección sale de una prueba de comprensión/lectura, no de la estética | Contenido del Home |
| **OD-07** | Lote de auditoría editorial: 14 titulares de claim, matriz de 72 limitaciones, textos documentales, Método, Sobre | **ABIERTA** — WEB-E | Fase editorial propia; los 9 titulares de las fichas mínimas son el primer subconjunto | Publicación |
| **OD-08** | Rastro para preguntas sin claim | **ABIERTA** — WEB-1 hito 2 | V1 no lo tiene; decisión de diseño | H-5 tal como está; futuro |
| **OD-09** | Rótulo público de los estados de celda regulatoria (11/3/5) sin colisión con `ESTABLISHED_WITHIN_SCOPE` | **ABIERTA** — WEB-E | Redactar y auditar antes de mostrar `CLM-0009` en detalle | Detalle de `CLM-0009` |
| **OD-10** | Enmiendas propuestas al Charter (no aplicadas): (a) «sin gradientes» vs patrones/`hero__cue`; (b) cerrar §18 ítems 6 y 7 por referencia a WEB-0; (c) traspaso de la copia del Charter al repo web; (d) la etiqueta «Preguntar o buscar» promete Ask | **ABIERTA** — post-freeze, con aprobación del autor | Tratarlas como enmiendas del Charter, no de WEB-0 | Consistencia documental |
| **OD-11** | Mecanismo de URLs de releases | **ABIERTA** | A (archivo dentro del sitio, independiente del host) | Diseño de releases |
| **OD-12** | Preservación de las fuentes congeladas | **RESUELTA** (estrategia aprobada) — **ejecución = precondición de WEB-1** | `git bundle` + SHA-256 + `BACKUP-MANIFEST` + prueba de restauración; ≥ 2 copias fuera de la máquina principal; el backup **no** es fuente de verdad; no modifica los repos. La ejecución requiere autorización explícita y destinos elegidos por el autor | Hito 0 de WEB-1 |
| **OD-13** | Régimen C en las fichas destacadas | **RESUELTA** | Fuera de las cinco del Home en el MVP V1; **visible** en mapa, `/limites`, fichas mínimas y Método | — |
| **OD-14** | Revisor editorial independiente del autor | **ABIERTA** | Al menos un revisor humano antes de publicar | Publicación |
| **OD-15** | Dominio, hosting, analítica (ninguna por defecto) | **ABIERTA** — deploy | Decidir en la fase de deploy | Deploy |
| **OD-16** | Sintaxis de `figure_id`, directivas y períodos; reglas exactas del lint numérico | **ABIERTA** — WEB-1 | Especificar en WEB-1 | Implementación de `G-FIG-02` |
| **OD-17** | Promesas públicas de funciones futuras (Ask) | **ABIERTA** | Auditar; sin plazos | Copy del header/overlay |
| **OD-18** | Origen estructurado de las cifras de `CLM-0002` | **ABIERTA** — WEB-1 | Confirmar (probable `reports/lab_a/cgi-national-quarterly.json`) | Figures de H-2 |
| **OD-19** | Plantillas de página (pregunta Tier A/B, Límites, Método, Sobre, Versiones) | **ABIERTA** — WEB-1 hito 2 | Componer solo con componentes aprobados; si falta uno, enmienda del Charter | Diseño de páginas |

---

## 4. Freeze

### 4.1 Lista de verificación final

| # | Verificación | Estado |
|---|---|---|
| 1 | Los 7 documentos existen en `web-0/` y reflejan las decisiones finales | ✔ |
| 2 | ALETHEIA V1 y ALETHEIA-LABOR intactos (HEAD, tag, working tree) antes y después de la Enmienda 1 | ✔ (ver entrega) |
| 3 | El Design Charter y el HTML del prototipo no fueron modificados; solo se creó/modificó `web-0/` | ✔ (Charter sha256 abajo) |
| 4 | Sin contradicciones internas (gates, ADR, hallazgos, decisiones abiertas, clasificación, estados «candidato») | ✔ (script) |
| 5 | Sin contradicciones con el Design Charter (§4.3) | ✔ |
| 6 | Los 88 gates originales preservados y clasificados; 8 agregados (RELEASE/FEATURE_GATED) | ✔ (Gates, Anexo A) |
| 7 | OD-06 explícitamente abierta | ✔ |
| 8 | **Aprobación explícita del autor** | ✔ (2026-09-19) |

### 4.2 Qué significa congelar WEB-0
Congelar fija los **invariantes** (`WEB-0-CHARTER.md` §3, INV-01…INV-17), el contrato de datos, el contrato editorial, los gates y su clasificación, y la arquitectura objetivo. Las decisiones abiertas se resuelven en las fases indicadas sin reabrir el freeze, salvo que contradigan un invariante (entonces requieren una enmienda de WEB-0). **OD-06 es la única excepción declarada** y es abierta por diseño.

### 4.3 Compatibilidad con el Design Charter (v1.2)

Contraste de cada decisión de la Enmienda 1 con `ALETHEIA-WEB-DESIGN-CHARTER.md`. Resultado: **sin contradicciones**; se registran las condiciones que mantienen la compatibilidad.

| Decisión | Charter | Veredicto | Condición |
|---|---|---|---|
| OD-05 (13 fichas mínimas) | §2 (0..N claims; sin claim se muestra el resultado documental), §11.1 (ninguna ficha sin límite), §11.4 (mapa: una fila abre resolución y claims), §17 (toda cifra con su Encuadre), §20 | Compatible | Cifra ⇒ Figure con Encuadre; el mapa se construye con las fichas |
| OD-13 (régimen C fuera de las cinco, visible en el resto) | §2, §11.4 («Sin selección»: se muestran las 18), §14 (sin muros de KPIs) | Compatible | Régimen C presente en mapa, `/limites`, fichas y Método |
| OD-02 (responsive = gate de release) | §15 (accesibilidad como restricción; «pendiente de verificar en producción»), §18.4 (responsive no congelado) | Compatible | La especificación responsive se produce con enmienda del Charter dentro de WEB-1, antes del release |
| OD-03 (regla legal por defecto) | §5 (la cota `● fuente ─── período` es la metadata mínima junto a la cifra), §14 | Compatible | El enlace al publicador cabe en la cota o en el nivel Auditoría; sin metadata suelta adicional |
| OD-12 (backup) | — (no visual) | No aplica | — |
| OD-06 (hero abierto) | §18.1 (datos del hero no congelados) | Compatible | Idéntico al estado del Charter |
| Clasificación de gates | §17 (checklist de conformidad): cada ítem tiene un gate (`G-UX-06`, `G-LIM-*`, `G-FIG-04`, `G-UX-08`, `G-A11Y-*`, …) | Compatible | — |

Design Charter v1.2 — `sha256`: `67de249a1c8db7152dfc762845d1fe5911104c7b690aeb65a2086a4200d89e2b`.

### 4.4 Aprobación

```text
Aprobado por: el autor del proyecto, mediante instrucción explícita en la sesión de trabajo
              del 2026-09-19 («WEB-0 queda aprobado conceptualmente con las siguientes decisiones finales»)
Versión congelada: WEB-0 v1.0 (incluye la Enmienda 1)
Waivers: ninguno
```

### 4.5 Declaración

```text
WEB-0: FROZEN
Excepción declarada: OD-06 (hero definitivo) — abierta por diseño
No se crea C:\Proyectos\ALETHEIA-WEB. No se autoriza WEB-1. No se implementa Next.js ni Astro.
Integridad de los documentos: web-0/SHA256SUMS.txt
```

### 4.6 Enmiendas

| Enmienda | Fecha | Contenido |
|---|---|---|
| 1 | 2026-09-19 | Integrada en v1.0 al congelar: OD-12, OD-05, OD-13, OD-02, OD-03 resueltas; clasificación de gates; OD-06 abierta por diseño; INV-15, INV-16, INV-17; ADR D-025…D-030 |
