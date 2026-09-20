# WEB-0 · ARCHITECTURE

| | |
|---|---|
| **Estado** | **FROZEN** (WEB-0 v1.0, 2026-09-19; ver `WEB-0-DECISION-LOG.md` §4). Enmienda 1: OD-05, OD-13, OD-02, OD-03, OD-12 |
| **Fecha** | 2026-09-19 |
| **Alcance** | Arquitectura de información y rutas, stack, frontera de JavaScript, organización de carpetas, federación de módulos, Ask, versionado y correcciones, seguridad/privacidad/legal, presupuestos |
| **Autoridad visual** | `ALETHEIA-WEB-DESIGN-CHARTER.md` v1.2 (no se duplica) |
| **Lo que este documento no hace** | Crear el repo, instalar dependencias, escribir componentes ni desplegar |

---

## 1. Objetivo técnico

> Un sitio de lectura, estático, con **muy poco JavaScript inicial**, cuyo contenido completo se lee sin JavaScript, y donde ningún dato sustantivo puede llegar a una página sin pasar por el corpus y los gates.

Consecuencias de diseño: static-first; el estado vive en el corpus, no en el cliente; toda interacción del Charter (Apertura, puertas, Rastro, mapa) se implementa como **mejora progresiva** sobre HTML que ya contiene todo el contenido.

---

## 2. Arquitectura de información (IA) — V1

### 2.1 Rutas definitivas para V1

Convención: IDs en minúscula sin prefijo de módulo (`LAB-Q-0003` → `q-0003`); el módulo va en la ruta. La **pregunta es la entrada pública primaria**.

| Ruta | Qué es | Origen de datos | En nav (Charter) | JS de cliente |
|---|---|---|---|---|
| `/` | Home narrativa (Identidad → Apertura → Límites → Formas → Preguntas → Rastro → Todo el corpus) | editorial + Figures | wordmark | Apertura (isla pequeña) |
| `/hallazgos` | Índice de los hallazgos editoriales (5 en V1). **Lista enlaces a páginas de pregunta**; no duplica contenido | editorial | **Hallazgos** | no |
| `/explorar` | Mapa de las 18 preguntas, sin selección ni filtros (el encabezado del Charter dice «Sin selección») | generated + editorial | **Explorar** | no (`<details>`) |
| `/labor/preguntas/[id]` | **Una sola página canónica por pregunta** (18). Tier A: editorial completa (5). Tier B: ficha de corpus generada (13) con solo textos auditados | generated + editorial | — | no |
| `/labor/rastro/[claim]` | El Rastro de un claim (V1: los 5 claims de los hallazgos) | generated | — (se entra desde la pregunta) | no (radio CSS) |
| `/limites` | Límites globales: qué ALETHEIA no puede afirmar; ausencias y resultados que deben sobrevivir (`KEEP-*`); inferencias prohibidas. **Incluye los resultados preservados de los tres regímenes, en particular los del régimen C** (OD-13) | generated (`PreservedResult`, `Relation`) + editorial | **Límites** | no |
| `/metodo` | Método mínimo: estados, raíces de evidencia, exposición previa a los datos, cómo se lee un claim | editorial + generated | **Método** | no |
| `/sobre` | Qué es ALETHEIA, independencia, licencias y atribuciones, accesibilidad, privacidad | editorial | **Sobre** | no |
| `/versiones` | Manifest visible: versión del sitio y de cada módulo, hashes, changelog, cómo citar | generated | pie | no |
| `/v/[release]/…` | Release inmutable (mecanismo en §8.2) | build | — | no |
| `/preguntar` | **RESERVADA. No existe en V1.** Ver §7 | — | (el control «Preguntar o buscar» del header = búsqueda en V1) | — |

**Rastro** no es un ítem del header: el Charter fija la navegación (Hallazgos · Explorar · Límites · Método · Sobre) y prohíbe navegación adicional al recorrido principal (§14). El Rastro es un destino profundo (Charter §9, nivel 4) al que se llega desde la pregunta.

### 2.2 Decisiones de IA

1. **Una página por pregunta.** El hallazgo *es* la página de la pregunta (Tier A) enriquecida con editorial; `/hallazgos` solo la indexa. Evita dos URLs para un mismo contenido (fuente de drift y de citas ambiguas).
2. **El claim es un ancla, no una página**, en V1 (`/labor/preguntas/q-0003#clm-0004`). Una pregunta con 2 claims muestra ambos por separado en la misma página (Charter §20.6). Se puede cambiar por ADR.
3. **Todos los enlaces del mapa resuelven.** Cada una de las 18 preguntas tiene página (Tier B como mínimo); no hay `href="#"` en producción (`G-UX-03`).
4. **Búsqueda** es una superposición (Ctrl K) sobre las rutas anteriores; sin ruta propia. Sin JavaScript, `/explorar` funciona como listado completo.
5. **Namespacing por módulo** (`/labor/…`) desde el día uno para la federación (§6).
6. **Sin filtros ni ordenamientos en `/explorar`** en V1: el Charter titula el mapa «Sin selección».
7. **Índices tipográficos, no tarjetas.** `/hallazgos` y `/explorar` siguen la lógica del mapa (texto · hilo · forma; Charter §11.4); `G-UX-08` impide que degeneren en una grilla de KPIs.
8. **Sin imágenes de compartir** (Open Graph con cifras o gráficos) en V1: cada cifra visible es una Figure con su Encuadre.

### 2.3 Tiers de página de pregunta

| | Tier A — Hallazgo | Tier B — Ficha mínima |
|---|---|---|
| Cantidad V1 | 5 | 13 |
| Contenido | Apertura, «Lo que sí podemos decir / Lo que esto NO significa», límites completos, Rastro, divulgación de exposición previa, cita | `public_question` aprobada, resolución, titular(es) de claim auditado(s), alcance, límites `SHOWN`, provenance, cita |
| Prosa nueva | Sí (auditada) | **No**: solo cadenas que ya pasaron auditoría |
| Requisito | Editorial completa | Deuda editorial mínima (`WEB-0-EDITORIAL-CONTRACT.md` §3) |

**Decidido (OD-05):** 5 fichas completas + 13 mínimas generadas completan las 18 preguntas. La ficha mínima sigue **el mismo contrato de datos y de estados** y no requiere la narrativa ni la visualización de las principales (`WEB-0-MVP.md` §1.3). **Ningún enlace del mapa puede quedar muerto:** el mapa se construye con las fichas, no antes que ellas.

---

## 3. Stack: evaluación y decisión

### 3.1 Tabla de decisión

| Pieza | Decisión | Justificación | Riesgo / condición |
|---|---|---|---|
| **Next.js App Router** con `output: 'export'` | **Recomendado, condicionado a un spike medido** (WEB-1 hito 0) | Stack pedido; RSC permite renderizar todo en build; separa Ask (deployment aparte) del sitio; ecosistema | **Next envía runtime de React y de router aun con cero componentes cliente.** No se asume cuánto pesa: se mide. Si la línea base excede el presupuesto B-JS-1 (§10), se activa el **ADR de alternativa (Astro con islas)**. Además, en `export` no hay `headers()`/middleware/ISR: CSP y cabeceras van en la config del host. |
| **TypeScript `strict`** (+ `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) | **Sí** | Los contratos de datos son tipos; sin `any` en `tools/` ni `src/lib` | — |
| **Zod** | **Sí, solo en build/validación** | Esquemas del corpus y de editorial; se emite JSON Schema para consumidores no-TS (Ask). **No se envía al cliente.** | Zod no valida integridad referencial: eso lo hacen los gates propios |
| **React Server Components** | **Sí para todo el contenido** | Cero JS para contenido; datos leídos de `generated/` en build | El payload RSC viaja inline en el HTML estático: se mide su costo en el spike |
| **MDX** | **No.** Alternativa: **Markdown + frontmatter YAML + directivas restringidas** (`remark-directive`) con lista blanca de componentes | MDX permite `import` y JS arbitrario en el contenido: un editor podría saltarse gates (limitaciones, cifras, estados) o inyectar código. Las directivas (`{{fig:…}}`, `{{limit:…}}`, `{{state:…}}`) no ejecutan nada | HTML crudo en Markdown deshabilitado (`G-EDI-07`) |
| **Visualización** | **SVG propio en Server Components + d3 solo en build** (`d3-scale`, `d3-shape`, `d3-array`) | Las piezas son geométricas y fijas (glifos, hilo, ranura, Encuadre, Rastro, formas del mapa); no hay charts interactivos. Prohibido dashboard (Charter §14). D3 nunca llega al cliente | Cada SVG con descripción textual y alternativa en tabla (Charter §15.4) |
| **CSS** | **CSS con custom properties (tokens del Charter) + CSS Modules o capas `@layer`; sin Tailwind** | 7 colores y 3 familias: no hay sistema de utilidades que amortizar; Tailwind agrega build y facilita valores arbitrarios que violan «sin colores nuevos». Con tokens en un solo archivo, `stylelint` puede **prohibir literales de color fuera de él** (`G-UX-06`) | Reversible por ADR |
| **Búsqueda estática** | **Índice JSON propio generado en build** (18 preguntas, 14 claims, fuentes, alias) + buscador mínimo cargado **bajo demanda** | El corpus es diminuto: no justifica Pagefind/WASM. Menos dependencias, control total de lo indexable (solo cadenas auditadas) | Sin stemming avanzado: alias editoriales lo compensan |
| **Vitest** | **Sí** | Unit + esquemas + gates + golden test de equivalencia (Data Contract §4.4) | — |
| **Playwright** | **Sí** | E2E, JS deshabilitado, red bloqueada, foco/teclado, regresión visual de componentes críticos, escaneo del DOM | Capturas de regresión ligadas a la versión del Charter |
| **axe** (`@axe-core/playwright`) | **Sí** | Gate de accesibilidad automático en todas las rutas y estados | Automático cubre solo parte de WCAG: se complementa con lista manual |
| **Lighthouse CI / `size-limit`** | **Sí** | Presupuestos medibles (§10) | — |
| **Vercel** | **Destino posible, no dependencia.** Sitio 100 % estático, host-agnóstico | Cabeceras vía `vercel.json`; sin funciones en V1. **Ask irá en un deployment separado** | No se despliega en WEB-0 |

### 3.2 Dependencias

Objetivo: dependencias directas de producción **≤ 5** (framework + runtime); resto de desarrollo. `npm ci --ignore-scripts`, lockfile obligatorio, auditoría en CI, sin `postinstall`. Cada dependencia nueva exige ADR corto.

---

## 4. Frontera de JavaScript de cliente

Principio: **el contenido nunca depende de JS.** Todo lo de la columna «Sin JS» debe funcionar con JavaScript deshabilitado (`G-UX-05`).

| Comportamiento | Implementación base (sin JS) | Mejora con JS | Isla cliente |
|---|---|---|---|
| Páginas de contenido, límites, Método, Sobre, versiones | HTML estático | — | No |
| **Mapa de 18 preguntas**: puertas que se abren, una a la vez | `<details name="…">` (acordeón exclusivo nativo; el `<summary>` expone estado; el contenido cerrado no es focalizable) | Animación de apertura donde el navegador la soporta (Charter §13: movimiento no congelado) | No |
| **Rastro**: Resumen/Detalle/Auditoría | Radios + CSS (`:has`/`:checked`) | Persistir la elección | No |
| **Apertura** (ranura que se ensancha por scroll o clic) | Ambas lecturas presentes en el HTML, en secuencia, sin animación | Scroll + clic ensanchan la ranura | **Sí, pequeña** (prioridad del presupuesto) |
| Encuadre, cota, glifos, formas de estado, Figures | SVG/CSS estático | — | No |
| Búsqueda (Ctrl K) | `/explorar` como listado | Superposición + índice JSON perezoso | **Sí, bajo demanda** (carga al primer uso, no al inicio) |
| Copiar cita | Texto visible | Botón de portapapeles | Opcional |
| `prefers-reduced-motion` | Reglas CSS | — | No |
| **Ask** | — | — | **No existe en V1** |

Reglas: sin librerías de estado; sin hidratación de páginas de contenido; toda isla es un Client Component pequeño y **declarado en una lista blanca** (`G-PERF-03`).

---

## 5. Arquitectura de contenido (organización conceptual)

No se crea nada de esto en WEB-0. Es la estructura objetivo del repo `ALETHEIA-WEB`.

```text
ALETHEIA-WEB/
├─ pins/                 Pins de fuentes científicas (labor, v1). Solo humanos; cambio = ADR.
├─ corpus-src/           Fuentes vendorizadas byte a byte (por repo@commit). Solo `extract`. No editar.
├─ modules/              Contratos de módulo (conteos esperados, invariantes, anotaciones de modelado).
├─ tools/corpus/         extract · normalize · validate · manifest · verify:pin (TypeScript).
├─ schemas/              Zod (fuente) + JSON Schema emitido.
├─ generated/<module>/   Corpus web derivado + manifest.json. Solo herramientas. Commiteado.
├─ editorial/
│   ├─ <module>/         questions/ claims/ limits/ findings/*.md audit/
│   └─ site/             home · hero · states · metodo · sobre · limites
├─ design/               Copia vendorizada del Design Charter (hash fijado) + tokens.css.
├─ src/
│   ├─ app/              Rutas (App Router): /, /hallazgos, /explorar, /[module]/…, /limites, /metodo, /sobre, /versiones
│   ├─ components/       Server Components; islands/ = lista blanca de Client Components
│   ├─ viz/              Primitivas SVG: glifos, hilo, ranura, Encuadre, Apertura, Rastro, formas del mapa
│   └─ lib/              Loaders tipados, formateo es-AR, resolvedor de Figures, cita, búsqueda
├─ public/               fonts (woff2 subset) · favicon · assets estáticos (sin datos crudos)
├─ tests/                unit/ · e2e/ · a11y/ · fixtures/golden/ (reconciliación del prototipo)
├─ scripts/              Ejecutor de gates · release · presupuestos
├─ releases/             Release manifests inmutables + CHANGELOG
├─ backup/manifests/     BACKUP-MANIFEST (append-only). Los bundles viven FUERA del repo y del equipo (OD-12).
└─ docs/                 Copias congeladas de WEB-0 + ADRs
```

| Carpeta | Editable por | Verificada por |
|---|---|---|
| `pins/` | humano (ADR) | `G-SRC-01/02` |
| `corpus-src/` | `extract` | `G-SRC-02/03` |
| `generated/` | herramientas | `G-GEN-01/02/04`, `G-SCH`, `G-REF`, `G-CNT` |
| `editorial/` | humano + auditoría | `G-EDI`, `G-LIM`, `G-FIG` |
| `design/` | enmienda del Charter | `G-UX-06` + hash |
| `src/`, `tests/` | humano | CI completo |
| `releases/` | herramienta de release | `G-REL-03` (solo append) |
| `backup/manifests/` | herramienta de backup + autor | `G-SRC-06` (solo append; los bundles **no** entran al repo, `G-LEG-01`) |

Regla de dependencia: `src/` **lee** `generated/` y `editorial/`; nunca al revés. `tools/` no importa de `src/`. Un componente recibe props tipadas, nunca JSON crudo del corpus.

---

## 6. Federación de módulos (arquitectura)

Contrato completo en `WEB-0-DATA-CONTRACT.md` §11. Aquí, lo que impone a la arquitectura:

- **Un módulo = un directorio en `generated/`, uno en `editorial/`, un contrato en `modules/`, un pin y un namespace de rutas.**
- `modules.lock.json` lista módulos activos y sus versiones; añadir «precios» no modifica los hashes de `labor`.
- Los componentes de presentación son **genéricos**; consumen un adaptador por módulo. Un módulo nuevo entra por adaptador, no por bifurcaciones en los componentes.
- Build por módulo (`corpus:build --module labor`) y build de sitio agregado. Un módulo puede publicarse/cerrarse solo.
- **Relaciones entre módulos: denegadas por defecto.** Solo `CrossModuleRelation` con ruling resoluble en ambos módulos (`G-MOD-01`, `FEATURE_GATED`: se activa cuando existe un segundo módulo).
- El Home y `/hallazgos` pueden cruzar módulos **solo por yuxtaposición de piezas independientes**, sin ejes compartidos ni métricas derivadas.

---

## 7. Ask ALETHEIA — preparación arquitectónica (no implementado)

### 7.1 Aislamiento
Ask, cuando exista, es un **deployment separado** (otro origen, otra CSP, otro pipeline). El sitio estático no gana ninguna capacidad de servidor. Nada de Ask se importa desde `src/`.

### 7.2 Diseño para que no alucine cifras (principio congelado)

```text
consulta → recuperación SOLO en generated/ + editorial/ (índice de IDs semánticos)
        → el modelo elige IDs y arma la respuesta en un formato estructurado:
              { entity_ids[], figure_refs[], wording }   ← `wording` puede citar cifras solo como {{fig:ID}}
        → VALIDADOR (determinista, sin modelo):
              · esquema
              · todo dígito fuera de {{fig:…}} → RECHAZO
              · required_qualifiers[] de cada entidad presentes
              · forbidden_inferences[] no afirmadas
              · etiquetas de estado tomadas del vocabulario, no del modelo
              · answer_kind = NOT_ANSWERABLE → respuesta fija de rechazo/ausencia
        → RENDERIZADOR inserta valores de Figures y limitaciones
```

- Sin navegación web, sin herramientas con efectos secundarios, sin escritura.
- El contenido del corpus se trata como **datos, no instrucciones** (hay texto externo dentro: citas normativas, resúmenes de términos de plataformas).
- Entrada de usuario no confiable; límites de tasa; sin PII en logs.
- Las cifras **nunca** vienen de la memoria del modelo: el modelo no tiene forma de emitir un valor sin un `figure_ref` que el validador resuelve contra el corpus.

### 7.3 Qué debe existir en el corpus desde V1
`answerability`, `required_qualifiers`, `forbidden_inferences`, citas versionadas, `semantic_id`, alias, provenance (Data Contract §12). V1 no los expone en la UI; los incluye y los valida por esquema en `CORE_BUILD` (`G-SCH-01`); los `G-ASK-*` son `FEATURE_GATED`.

---

## 8. Versionado, releases y correcciones

### 8.1 Tres ejes de versión

| Eje | Ejemplo | Cambia cuando |
|---|---|---|
| **Corpus por módulo** | `labor@1.0.0` (= `aletheia-labor-v1.0.0`, commit `ca6a85e`) | Nuevo pin de fuente |
| **Editorial** | `editorial@r<hash>` + `revision` por texto | Cambia cualquier texto público |
| **Release web** | `web-1.0.0` (semver) | Cualquier cambio publicado |

### 8.2 Release = snapshot inmutable
Un release fija, en `releases/<release>.json`: versiones de módulos, hash de cada `manifest.json`, hash del manifest editorial, versión y hash del Charter, versión del generador, `build_id` y lista de rutas con hash. Una vez publicado **no se modifica** (`G-REL-03`).

- **URL permanente por release** (`/v/<release>/…`). Mecanismos posibles: (A) directorio archivado dentro del mismo sitio; (B) deployments inmutables del host con redirección. **Recomendado A** por ser independiente del host; decisión final en OD-11.
- Las rutas sin prefijo (`/…`) apuntan siempre al release vigente.

### 8.3 Política de correcciones

| Clase | Ejemplo | Acción pública |
|---|---|---|
| **C1** | Errata tipográfica sin cambio de sentido | Nuevo release; línea en changelog |
| **C2** | Reformulación editorial | Reauditoría + nuevo release; changelog |
| **C3** | Cambia el corpus (nuevo pin / nueva versión de módulo) | Nuevo `module@x.y.z`; el anterior sigue accesible |
| **C4** | Error publicado en una cifra, estado, alcance o límite | **Aviso visible de corrección** en la página afectada, entrada destacada en changelog, release inmediato; **la versión errónea no se borra**: queda con banner «versión con corrección» |

- **Páginas antiguas:** permanecen bajo `/v/<release>/…`, con banner «Versión anterior (release X). Ver la vigente» y `rel=canonical` a la vigente.
- **La ciencia no se corrige desde la web.** `labor@1.0.0` está congelado: un error de contenido científico se resuelve con una nueva versión del corpus fuente (fuera de WEB) y un aviso en las páginas de `labor@1.0.0`; jamás parcheando el corpus web en silencio.
- **Changelog público** en `/versiones` (append-only): fecha, release, clase, IDs afectados, resumen.
- **Manifest visible** en `/versiones` y resumido en el pie (versión del sitio, `labor@1.0.0`, commit corto).

### 8.4 Cómo citar (formato)
```text
ALETHEIA. «<public_question>». Módulo labor v1.0.0 (aletheia-labor-v1.0.0, commit ca6a85e).
Release web-1.0.0. https://<dominio>/v/web-1.0.0/labor/preguntas/q-0005 (consultado <fecha>).
```
Se genera desde el manifest (no se escribe a mano) y se muestra en el nivel Auditoría de la página. Citar un claim usa el ancla (`#clm-0004`).

---

## 9. Seguridad, privacidad y legal

### 9.1 Reglas base

| Tema | Regla |
|---|---|
| **PII** | El corpus web no contiene datos personales. Escáner de PII en `generated/` y `editorial/` (`G-SEC-01`: correos, teléfonos, DNI/CUIT-like) con revisión manual de los positivos. |
| **Datos crudos** | **No se republican.** Lista de denegación de extensiones y tamaño en el repo (`.xlsx .xls .csv .zip .rar .parquet .duckdb`, etc.), espejo de `docs/storage-policy.md` de LABOR (`G-LEG-01`). |
| **Licencias (OD-03, revisión obligatoria pre-release)** | Cada `Source` lleva `license.status`. **Regla por defecto:** sin licencia de redistribución registrada (hoy la mayoría) ⇒ **no se redistribuyen datos crudos, se enlaza al publicador, no se asume permiso** y solo se admite contenido **derivado** compatible con el contrato de datos y **sujeto a revisión**. CGI (CC BY-SA 4.0): atribución obligatoria y revisión de *ShareAlike*. **Sin registro de revisión legal (`G-LEG-03`) no hay release público.** |
| **Enlaces a fuentes originales** | Toda `Source` usada por un hallazgo enlaza a su `original_url` **del corpus**; si no está registrada, se dice «enlace no registrado». No se completan URLs de memoria. |
| **Contenido externo** | El corpus incluye texto de terceros (leyes, términos de plataformas): citas breves con enlace; sin reproducción extensa. |
| **Sanitización** | Markdown sin HTML crudo; pipeline `remark/rehype` con lista blanca; sin `dangerouslySetInnerHTML` salvo salida del pipeline (lint); enlaces externos con `rel="noopener noreferrer"`. |
| **CSP** | `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`; sin `unsafe-inline`/`unsafe-eval` (hashes si hiciera falta). Además `Referrer-Policy`, `Permissions-Policy` restrictiva, HSTS. Configuradas en el host (no hay `headers()` en export). |
| **Terceros** | **Cero** scripts, fuentes, analytics o CDN de terceros. Fuentes autoalojadas. El gate `G-SEC-04` corre el sitio con red bloqueada: cualquier solicitud a otro origen falla el build. |
| **Analítica** | Ninguna por defecto. Si se agrega, sin cookies, sin PII y declarada en Sobre (OD-15). |
| **Cadena de suministro** | Lockfile, `npm ci --ignore-scripts`, auditoría de vulnerabilidades, dependencias directas ≤ 5 en producción (§3.2). |
| **Ask (futuro)** | Aislado del sitio (§7); trata el corpus como datos; entrada no confiable. |

### 9.2 Privacidad
Sin cuentas, sin formularios, sin cookies en V1. `Sobre` declara qué se registra (nada por defecto).

---

## 10. Presupuestos de rendimiento y accesibilidad

**Todos son gates medibles y solo pueden endurecerse (*ratchet*); relajarlos exige ADR.** Los valores son iniciales: el spike de WEB-1 los calibra **antes** de cerrar la elección de framework (OD-01). Condiciones de laboratorio: perfil móvil emulado (Lighthouse), caché fría.

### 10.1 Rendimiento

| ID | Métrica | Presupuesto inicial |
|---|---|---|
| B-JS-1 | JS transferido en primera carga, rutas de contenido (`/labor/…`, `/limites`, `/metodo`, `/sobre`, `/versiones`, `/explorar`) | **≤ 60 KB gzip** (framework incluido) |
| B-JS-2 | Ídem, Home (incluye la isla de la Apertura) | **≤ 90 KB gzip** |
| B-JS-3 | JS **propio** (sin framework) por ruta | **≤ 15 KB** contenido · **≤ 30 KB** Home |
| B-JS-4 | Búsqueda (carga perezosa: código + índice) | **≤ 40 KB gzip**, solo tras el primer uso |
| B-LCP | LCP | **≤ 2,0 s** |
| B-FCP | FCP | **≤ 1,5 s** |
| B-CLS | CLS | **≤ 0,02** |
| B-INP | INP (lab: TBT como proxy) | **≤ 200 ms** (TBT **≤ 100 ms**) |
| B-HTML | HTML por ruta | **≤ 80 KB gzip** (mapa incluido) |
| B-CSS | CSS total | **≤ 25 KB gzip** |
| B-FONT | Fuentes woff2 en total | **≤ 160 KB** (línea base del prototipo, **medida**: Newsreader 128,9 + 143,4 KB, Instrument Sans 29,4 KB, IBM Plex Mono 14,4 KB = **316 KB** ⇒ exige subset latino y solo ejes/pesos usados); ≤ 2 archivos en el camino crítico; `font-display: swap` con fallback de métricas ajustadas para sostener B-CLS |
| B-IMG | Imágenes rasterizadas | **0** en V1 (el Charter prohíbe fotografías); si se agregara una, ≤ 60 KB AVIF/WebP |
| B-SVG | SVG inline por figura / por página | **≤ 12 KB / ≤ 40 KB**; sprite de glifos ≤ 3 KB |
| B-REQ | Solicitudes en primera carga | **≤ 12** |
| B-TOT | Transferencia total primera carga, sin fuentes / con fuentes | **≤ 150 KB / ≤ 300 KB** gzip |

### 10.2 Accesibilidad (WCAG 2.2 AA, requisito de conformidad — Charter §15)

| ID | Gate |
|---|---|
| A-AXE | 0 violaciones axe (todas las severidades) en todas las rutas y estados (mapa con filas abiertas y cerradas; Rastro en 3 profundidades) |
| A-KBD | Todo lo interactivo alcanzable y operable con teclado; foco visible (contorno verdigris 2 px, Charter §15) |
| A-CONTRAST | Contrastes del Charter §15; `mute` y `hair-2` prohibidos para texto |
| A-TARGET | Objetivos táctiles ≥ 24×24 px CSS (SC 2.5.8) |
| A-MOTION | `prefers-reduced-motion` respetado; nada esencial depende de animación |
| A-NOJS | Contenido íntegro con JS deshabilitado |
| A-ALT | Cada figura con descripción textual y alternativa en tabla |
| A-REFLOW | **Reflow a 320 px sin scroll horizontal (SC 1.4.10, nivel AA)** |
| A-LANG | `lang="es-AR"`; nombres accesibles de glifos y formas de estado |

> **Resuelto como gate de release (OD-02, 2026-09-19).** `A-REFLOW` exige un diseño responsive, y el Charter lo declara *no congelado* (§18.4). Decisión: responsive/mobile **no bloquea** el freeze de WEB-0, la creación del repo ni el desarrollo inicial; **sí bloquea el release público**. La especificación responsive/mobile se produce dentro de WEB-1 (hito 2). **No se declara «WCAG 2.2 AA» hasta verificar reflow y comportamiento mobile real** (`G-A11Y-05`).

---

## 11. Pipeline de calidad (dónde corre cada cosa)

| Momento | Qué corre | Bloquea |
|---|---|---|
| Pre-commit (rápido) | tipos, lint, prohibición de literales de color y de numerales en editorial, `G-GEN-04`, `G-EDI-06/07` | commit |
| Pull request / CI | `corpus:build` (offline), esquemas, referencias, conteos, estados, límites, figuras, editorial, build del sitio, Playwright (JS off + red off), axe, Lighthouse/size-limit, `G-UX-*` | merge |
| **Release** | Todo lo anterior + `verify:pin` (requiere acceso de solo lectura a los tags; lo corre el autor y adjunta el reporte) + `G-REL-*` + manifest visible = manifest generado | publicación |

**Clasificación (Enmienda 1):** en PC/CI **bloquean los `CORE_BUILD`**; los `RELEASE` (responsive, WCAG AA completo, legal, presupuestos, SEO, OG, CSP, manifest de versión, link check completo) pueden correr en modo informativo y **bloquean el lanzamiento público**; los `FEATURE_GATED` (Ask, multi-módulo, relaciones entre módulos, descargas/API, verificación de hash en el navegador) se activan por disparador automático cuando existe la funcionalidad.

Detalle de cada gate y su clasificación: `WEB-0-INTEGRITY-GATES.md` §1.1.
