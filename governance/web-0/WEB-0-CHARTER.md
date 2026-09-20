# WEB-0 · CHARTER

| | |
|---|---|
| **Fase** | ALETHEIA WEB — **WEB-0** (contrato de producto, arquitectura, corpus y gobernanza) |
| **Estado** | **FROZEN** — WEB-0 v1.0, 2026-09-19, con **una excepción declarada**: OD-06 (hero) permanece abierta por diseño (§10; `WEB-0-DECISION-LOG.md` §4) |
| **Fecha** | 2026-09-19 |
| **Cierra** | La fase de prototipo visual (V2.1 aprobada; Design Charter v1.2) |
| **No es** | Desarrollo de la Home, repo de producción, Next.js, deploy, Vercel ni Ask ALETHEIA |
| **Documentos** | `WEB-0-CHARTER.md` (este) · `WEB-0-DATA-CONTRACT.md` · `WEB-0-EDITORIAL-CONTRACT.md` · `WEB-0-ARCHITECTURE.md` · `WEB-0-MVP.md` · `WEB-0-INTEGRITY-GATES.md` · `WEB-0-DECISION-LOG.md` |

---

## 1. Propósito

Definir y congelar **antes** de escribir la implementación de producción:

1. **Qué producto es** y qué entra en su primera versión pública.
2. **De dónde salen los datos** y cómo se prueba que no derivaron.
3. **Qué puede y qué no puede hacer el lenguaje público** con lo que dice el corpus.
4. **Cómo se arma, se verifica, se versiona y se corrige** el sitio.

El resultado es un plan ejecutable y auditable: cada regla tiene un gate que la hace cumplir (`WEB-0-INTEGRITY-GATES.md`) y cada decisión no resuelta tiene dueño y bloqueo (`WEB-0-DECISION-LOG.md`).

**Método de escritura.** Los conteos y hallazgos se midieron contra los tags congelados (`git show`/`git ls-tree`), no se tomaron de resúmenes. Las puntuaciones de selección (`WEB-0-MVP.md` §3, §5) son juicio editorial declarado como tal.

---

## 2. Qué NO es WEB-0

No se implementan componentes, no se crea el repo, no se instala nada, no se despliega, no hay Ask, no se copian datos a páginas, no se modifica el prototipo ni el Design Charter, y no se elige el hero. Lo único que se crea es la carpeta `web-0/`.

---

## 3. Invariantes del producto (congelados con WEB-0)

| ID | Invariante | Se hace cumplir con |
|---|---|---|
| **INV-01** | Los repos científicos congelados **nunca** se modifican desde la web. | D-001, `G-SRC-04/05` |
| **INV-02** | Todo hecho publicado remite a un registro del corpus con provenance completa. | Data Contract §5, `G-PRV-*` |
| **INV-03** | **QUESTION** es la unidad pública principal; **CLAIM** es la unidad de afirmación/auditoría, **0..N por pregunta**. | Design Charter §2, §20; `G-REF-04` |
| **INV-04** | La **resolución de la pregunta** y el **estado epistemológico del claim** son capas distintas; nunca se mezclan ni se derivan una de la otra en silencio. | Data Contract §8; `G-STA-*` |
| **INV-05** | Ninguna cifra sustantiva publicada existe solo como texto editorial: toda cifra es una **Figure** del corpus. | Data Contract §9; `G-FIG-*` |
| **INV-06** | La capa editorial no cambia significado, población, período, causalidad, fuerza epistemológica, estados ni cifras. | Editorial Contract §1; `G-EDI-*`, `G-STA-04` |
| **INV-07** | **Ausencia ≠ resultado negativo.** Solo `REFUTED_WITHIN_SCOPE` es negativo, y solo dentro de su alcance. | Editorial §7.3; `G-STA-05` |
| **INV-08** | Ninguna limitación canónica se omite en silencio; el límite se muestra junto al dato. | Editorial §5; `G-LIM-*` |
| **INV-09** | Ninguna relación entre claims, regímenes o módulos que el corpus no autorice; las relaciones entre módulos se deniegan por defecto. | Data Contract §7.9, §11; `G-MOD-*`, `G-EDI-05` |
| **INV-10** | Cada build es **determinista** y reproducible desde los pins; nada depende de una persona, un scratchpad o una ruta local. | Data Contract §4; `G-GEN-*` |
| **INV-11** | Los releases publicados son **inmutables**; las correcciones son visibles. | Architecture §8; `G-REL-*` |
| **INV-12** | **Ask nunca escribe una cifra desde la memoria del modelo.** | Architecture §7; `G-ASK-*` |
| **INV-13** | El contenido se lee **sin JavaScript**; el JS inicial es mínimo y presupuestado. | Architecture §4, §10; `G-UX-05`, `G-PERF-*` |
| **INV-14** | El **Design Charter es la única autoridad visual**; WEB-0 lo referencia y no lo duplica. Si algo contradice el Charter: STOP. | §5 de este documento |
| **INV-15** | **La autoridad canónica es repo + tag + commit + manifest/hash.** Los backups y las copias vendorizadas son copias verificables, **nunca** fuente de verdad. | Data Contract §3.4; `G-SRC-01/02/03/06` |
| **INV-16** | Sin licencia de redistribución registrada: **no se redistribuye crudo, se enlaza al publicador y no se asume permiso**; solo contenido derivado compatible con el contrato y sujeto a revisión legal, **obligatoria antes de publicar**. | Data Contract §13.2; `G-PRV-05`, `G-LEG-02/03` |
| **INV-17** | **No se declara WCAG 2.2 AA** hasta verificar reflow y comportamiento mobile real; responsive/mobile **bloquea el release público**. | Architecture §10.2; `G-A11Y-05` |

---

## 4. Boundary del producto

### 4.1 Qué pertenece a cada repositorio

| | **ALETHEIA V1** | **ALETHEIA-LABOR** | **Prototipo visual** | **ALETHEIA-WEB** (producción) |
|---|---|---|---|---|
| **Ruta** | `C:\Proyectos\ALETHEIA` | `C:\Proyectos\ALETHEIA-LABOR` | `C:\Proyectos\ALETHEIA-WEB-PROTOTYPE\ALETHEIA-WEB-V2.1-for-Claude-Code` | `C:\Proyectos\ALETHEIA-WEB` *(a crear después de WEB-0)* |
| **Estado** | Cerrado / fundación congelada | `CLOSED / FROZEN` | Fase cerrada por WEB-0 | Por crear |
| **Referencia** | tag `aletheia-research-foundation-v1.0.0`, commit `2da6a2b59cf08ef23b0fc68dce394b46626b5f12` | tag `aletheia-labor-v1.0.0`, commit `ca6a85e12b05df28e73e60ac406c90ad16352ed3` | Design Charter v1.2; `reconciliation/` (33/33) | — |
| **Es dueño de** | Datos crudos y estandarizados, gobernanza V1 (`GOV-*`), `provenance.json` de fuentes (URL oficial, licencia, sha256) | Ledgers de preguntas/claims/hipótesis, evidencia, raíces, fuentes, objetos, LAB-GOV, síntesis LAB-S, reportes con resultados | Identidad visual, Design Charter, reconciliación aceptada, semilla editorial (`public_question` aprobado), capturas | Pins, corpus vendorizado y derivado, capa editorial, herramientas, esquemas, código de sitio, releases |
| **La web lo lee** | Solo `data/raw/*/provenance.json` del tag | Solo archivos pineados del tag | Charter, tokens, semilla editorial, fixture de regresión | — |
| **La web puede escribir** | **Nunca** | **Nunca** | **Nunca** (queda como referencia) | Sí, todo |
| **No entra a la web** | Datos crudos, `standardized/`, `evidence/` (PDFs), historial | Código `src/`, tests, datos | Reconciliación como fuente (es fixture) | — |

### 4.2 Flujos permitidos

```text
ALETHEIA V1  ─┐  (solo lectura de objetos git en el commit pineado)
              ├──►  ALETHEIA-WEB  ──►  releases
ALETHEIA-LABOR ┘
Prototipo   ──►  ALETHEIA-WEB     (copia única y unidireccional: Charter con hash fijado, tokens, semilla editorial, fixture golden)
ALETHEIA-WEB ──►  (nada aguas arriba)
```

### 4.3 Reglas de frontera

1. **Solo objetos git, nunca el working tree** (V1 tiene hoy un archivo *untracked* ajeno al tag).
2. La herramienta rechaza escribir bajo la ruta de un repo fuente.
3. Antes y después de cada extracción se compara `HEAD`, refs y `git status`; un cambio bloquea (`G-SRC-04`).
4. El repo web no contiene datos crudos ni archivos de más de un límite fijado (`G-LEG-01`).
5. Un error científico no se corrige en la web: exige un nuevo corpus fuente y, entre tanto, un aviso visible (Architecture §8.3).

### 4.4 Respaldo de las fuentes (OD-12)

V1 y LABOR no tienen remoto: cada uno existe en una sola máquina. La estrategia aprobada es un **backup verificable fuera de la máquina principal** (`git bundle` + SHA-256 + `BACKUP-MANIFEST`, ≥ 2 copias, prueba de restauración; detalle en `WEB-0-DATA-CONTRACT.md` §3.4). El backup **no cambia la autoridad**: sigue siendo repo, tag, commit y manifest/hash (INV-15). No modifica los repos congelados.

---

## 5. Relación con el Design Charter

`ALETHEIA-WEB-DESIGN-CHARTER.md` (v1.2) es la **fuente visual**. WEB-0 no define formas, colores, tipografías, glifos ni movimiento. Puntos de contacto:

| Charter | Qué toma WEB-0 de él | Mecanismo |
|---|---|---|
| §2, §20 Unidades y modelo real de datos | `Question → 0..N Claims`; dos capas de estado; vocabulario público | Data Contract §8; Editorial §7; `G-REF-04`, `G-STA-*` |
| §3.3 Densidad baja; §14 prohibiciones | Sin dashboards, KPIs, tarjetas | `G-UX-08`, `G-UX-06` |
| §5 Encuadre (fuente + período + alcance) | Cada Figure lleva fuente/período/alcance; sin `*` pendiente en producción | `G-FIG-04`, `G-EDI-06` |
| §8 Estados por forma | Las formas se usan tal cual; no se agregan | Editorial §7.4 |
| §9 Progressive disclosure | Método en profundidad, nunca primero | MVP §1, `/metodo` |
| §11.1 Sí / No | Ninguna ficha sin límite | `G-LIM-01/02` |
| §11.4 Mapa | 18 preguntas, sin selección, ■ por claim | IA §2; `G-UX-04` |
| §13 Movimiento; §15 Accesibilidad | `prefers-reduced-motion`, WCAG 2.2 AA como restricción | Budgets A-*, `G-A11Y-*` |
| §15.4 Alternativa en tabla | `table_alt` en cada Figure | Data Contract §9.1 |
| §16 Voz | Base de las reglas editoriales | Editorial §8 |
| §17 Checklist | Cada ítem tiene un gate | `WEB-0-INTEGRITY-GATES.md` |
| §18 NOT FROZEN | WEB-0 resuelve **6 (implementación)** y **7 (corpus pipeline)**, y prepara **8 (Ask)** | ADRs; enmiendas propuestas en OD-10 (no aplicadas) |
| §19 Control de cambios | WEB-0 **no** enmienda el Charter | D-024 |

### 5.1 Verificación de conflictos (condición de STOP)

Resultado de contrastar WEB-0 contra el Charter: **ninguna decisión de arquitectura o de producto contradice el Charter.** Se registran tres tensiones que **no** son contradicciones de WEB-0, pero deben conocerse:

| # | Tensión | Naturaleza | Tratamiento |
|---|---|---|---|
| **C-01** | El Charter §3.1 dice «Sin gradientes»; el prototipo usa un gradiente real en `.hero__cue i` y implementa el rayado del §8 con `repeating-linear-gradient` | Prototipo vs. Charter (no WEB-0) | `G-UX-06` con lista blanca de patrones; aclaración propuesta en OD-10(a) |
| **C-02** | WCAG 2.2 AA exige *reflow* a 320 px (SC 1.4.10); el Charter declara el responsive *no congelado* (§18.4) | Dependencia de diseño | **Resuelta como gate de release (OD-02):** no bloquea el freeze de WEB-0 ni la creación del repo; **bloquea el release público**; no se declara AA hasta verificar reflow y comportamiento mobile real (INV-17) |
| **C-03** | El Charter define componentes, no plantillas de página (pregunta Tier A/B, Límites, Método, Sobre, Versiones); tampoco un Rastro para preguntas sin claim (§11.3 arranca en la afirmación) | Vacío de diseño | OD-19 y OD-08: se compone solo con componentes aprobados; si falta uno, **enmienda del Charter antes** de implementarlo |

---

## 6. Cobertura de los 21 puntos del encargo

| # | Punto | Dónde se resuelve |
|---|---|---|
| 1 | Boundary del nuevo producto | Este documento §4 |
| 2 | Source of truth (cadena canónica y clases de artefacto) | Data Contract §2 |
| 3 | Reproducibilidad (generador determinista desde el tag) | Data Contract §3–§4; Decision Log D-002…D-005 |
| 4 | Data contract del módulo `labor` | Data Contract §5–§9, §13–§14 |
| 5 | Editorial contract | Editorial Contract |
| 6 | Contrato de referencia numérica | Data Contract §9; Editorial §6 |
| 7 | Vocabulario público de estados y semántica visual | Editorial §7 (+ Charter §8, §20) |
| 8 | Arquitectura de información | Architecture §2 |
| 9 | MVP | MVP §1–§4 |
| 10 | Hero | MVP §5 |
| 11 | Arquitectura técnica | Architecture §3–§4, §11 |
| 12 | Arquitectura de contenido | Architecture §5 |
| 13 | Federación de módulos | Data Contract §11; Architecture §6 |
| 14 | Preparación para Ask | Data Contract §12; Architecture §7 |
| 15 | Integrity gates | Integrity Gates |
| 16 | Correcciones y versionado | Architecture §8 |
| 17 | Seguridad, privacidad y legal | Architecture §9 |
| 18 | Presupuestos de rendimiento y accesibilidad | Architecture §10; Integrity Gates §15 |
| 19 | Relación con el Design Charter | Este documento §5 |
| 20 | Outputs de WEB-0 | Este documento (tabla de documentos) |
| 21 | Revisión adversarial | Decision Log §2 |

---

## 7. Fases posteriores (propuesta, no comprometida)

| Fase | Objetivo | Entrada obligatoria |
|---|---|---|
| **Precondición de WEB-1** | Ejecutar el **backup verificable** de V1 y LABOR y registrar el `BACKUP-MANIFEST` con prueba de restauración (OD-12) | WEB-0 congelado; autorización explícita para ejecutarlo |
| **WEB-1 · hito 0** | Crear `ALETHEIA-WEB`; pins; **spike de framework y de presupuestos** (OD-01) | Precondición |
| **WEB-1 · hito 1** | Pipeline `extract → normalize → validate → manifest` + gates `CORE_BUILD` (G-SRC/GEN/SCH/CNT/REF/STA/PRV) con golden test | Hito 0 |
| **WEB-E** | Lote editorial (OD-07) y prueba de lectura del hero (OD-06) | Hito 1 (Figures y matriz de límites) |
| **WEB-1 · hito 2** | **Especificación responsive/mobile y plantillas de página** (OD-02, OD-19, OD-08; con las enmiendas del Charter que hagan falta) → componentes y páginas MVP: **5 fichas completas + 13 mínimas**, sin enlaces muertos | Hito 1 |
| **WEB-1 · release** | Todos los gates `RELEASE` en modo bloqueante: responsive/reflow y WCAG 2.2 AA, **revisión legal (OD-03)**, presupuestos, SEO, OG, CSP, manifest de versión/correcciones, link check completo → `web-1.0.0` | Todo lo anterior |

Cada fase requiere autorización explícita; WEB-0 no autoriza ninguna. **Responsive/mobile no bloquea crear el repo ni el desarrollo inicial; bloquea el release público.**

---

## 8. Protocolo de freeze y enmiendas

1. **Freeze candidate → Frozen:** el autor revisó, resolvió o aceptó las decisiones y aprobó el freeze el **2026-09-19** (registrado en `WEB-0-DECISION-LOG.md` §4.3). **Aplicado.**
2. **Después del freeze**, cambiar un invariante (§3), un contrato o un gate exige una **enmienda fechada** con motivo y aprobación explícita (mismo régimen que el Design Charter §19). Las decisiones abiertas se cierran con ADR nuevos, sin reabrir el freeze.
3. WEB-0 es **solo-append** una vez congelado.

---

## 9. Glosario mínimo

| Término | Significado en este proyecto |
|---|---|
| **Corpus** | Registro científico congelado (ledgers, evidencia, reportes) de un módulo |
| **Pin** | Declaración de commit y archivos exactos consumidos de un repo fuente |
| **Vendorizar** | Copiar byte a byte lo consumido a `corpus-src/` con verificación de hash |
| **Corpus web** | Derivado normalizado y validado (`generated/`) |
| **Figure** | Cifra con origen, período, alcance y formato; única forma de mostrar un número |
| **Canonical / Public layer** | Texto extraído del corpus / texto para personas, auditado |
| **Resolución de pregunta** | Cómo terminó una pregunta (capa de pregunta) |
| **Estado del claim** | Estado epistemológico de una afirmación (capa de claim) |
| **Tier A / Tier B** | Página de pregunta con editorial completa / ficha generada con solo textos auditados |
| **Gate** | Verificación automática que bloquea o advierte |
| **Release** | Snapshot público inmutable del sitio |

---

## 10. Estado del freeze

```text
WEB-0: FROZEN            versión v1.0 · 2026-09-19

Decisiones resueltas:    OD-12 (backup verificable) · OD-05 (5 fichas completas + 13 mínimas)
                         OD-13 (régimen C fuera de las cinco destacadas, visible en el resto)
                         OD-02 (responsive/mobile = gate de release) · OD-03 (revisión legal obligatoria pre-release)

Excepción declarada:     OD-06 (hero) — ABIERTA POR DISEÑO. Candidatos: CLM-0006 (primario para la prueba), CLM-0005.
                         La elección sale de una prueba de comprensión/lectura, no de la estética.

Restantes abiertas:      OD-01, 04, 07, 08, 09, 10, 11, 14, 15, 16, 17, 18, 19 (cada una con fase y bloqueo en el Decision Log)
```

El freeze fija invariantes (§3), contratos, gates y arquitectura objetivo. No crea `C:\Proyectos\ALETHEIA-WEB` ni autoriza WEB-1. Integridad de los documentos: `web-0/SHA256SUMS.txt`.
