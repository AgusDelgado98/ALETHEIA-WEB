# ADR · OD-01 — Framework de ALETHEIA Web

| | |
|---|---|
| **Estado** | **RESUELTA** — `OD-01 = RESOLVED` |
| **Decisión** | **Astro 7.3.3, salida estática (`output: "static"`), TypeScript strict. Islas solo donde una interacción lo justifique.** |
| **Fecha** | 2026-09-19 |
| **Fase** | WEB-1 · hito 0 (M0) — spike de framework y de presupuestos |
| **Regla previa que se aplicó** | `governance/web-0/WEB-0-DECISION-LOG.md` OD-01: *«Next.js **si** cumple B-JS-1/2 en el spike; si no, ADR a Astro»* |
| **Efecto sobre WEB-0** | D-016 (stack objetivo con Next.js) queda **sustituido para el framework** por este ADR. Los documentos de `governance/` **no se editan** (siguen FROZEN); esta decisión es la vía prevista por el propio OD-01. El resto de D-016 se mantiene (TS strict, Zod solo en build, SVG propio, CSS con tokens sin Tailwind, búsqueda propia bajo demanda, Vitest + Playwright + axe). RSC deja de aplicar. |
| **Evidencia cruda** | `spikes/framework-od01/` (resultados JSON, scripts, código de los cuatro candidatos) |

---

## 1. Pregunta

> ¿Cuál permite construir ALETHEIA con **menos runtime**, menor complejidad y **sin bloquear** las interacciones futuras (Lupa, Rastro interactivo, búsqueda, `/preguntar`)?

## 2. Qué se comparó

| Candidato | Versión exacta | Notas |
|---|---|---|
| **A · Next.js App Router** | `next 16.3.5`, `react/react-dom 19.3.0`, TS 6.0.3 | `output: "export"`; es el stack de D-016 |
| A′ · Next.js Pages Router *(mejor caso de A)* | `next 16.3.5` | `unstable_runtimeJS: false` en la ruta estática. Añadido para no medir a Next solo en su configuración por defecto |
| **B · Astro (última con soporte Node 20)** | `astro 5.18.2`, `@astrojs/react 5.0.0` | Lo único de Astro instalable con el Node por defecto de esta máquina (v20.20.2) |
| **B′ · Astro (estable actual)** | `astro 7.3.3`, `@astrojs/react 6.0.6`, vite 8.3.0 | **Exige Node ≥ 22.12.** Se midió con Node 22.23.2 aislado (§7) |

Entorno: Windows 11 Pro, npm 10.8.2. Navegador: Edge 153.0.4234.46 headless (puppeteer-core 24.43.1); axe-core 4.13.0.

**Nota de honestidad sobre el requisito «instalables en este entorno».** Astro 7.3.3 no es instalable con el Node por defecto de esta máquina (`engines.node >= 22.12`); Node 20 además llegó a su fin de vida programado el 2026-04-30. Se probó igualmente con un Node 22 aislado dentro del spike, sin tocar el sistema. La consecuencia operativa está en §8.

## 3. Método

- **Página idéntica** en los cuatro: header textual, una pregunta (LAB-Q-0004, texto de `public_question` real), una cifra (32 aglomerados, con Encuadre), «Lo que sí / Lo que no» estático, Rastro estático (SVG accesible + lista). System fonts. Contenido de `shared/content.json`, CSS idéntico.
- **Equivalencia comprobada, no supuesta:** el hash del texto visible (sin JS) es **idéntico en los cuatro** (`0e110ee2…` en la ruta estática, `03b8bca7…` en la interactiva), con 0 fragmentos faltantes.
- **Rutas:** `/` (estática, sin interacción) y `/rastro` (Rastro con tres niveles Resumen/Detalle/Auditoría: componente React; en Next como Client Component, en Astro como isla `client:load`). En Astro además `/rastro-vanilla` (mismo comportamiento con un `<script>` de 336 B).
- **Tamaños:** análisis estático de la salida de producción; **JS inicial** = `<script src>` (excluyendo `nomodule`) + `modulepreload` + URLs de islas + clausura de imports estáticos (los `import()` dinámicos no cuentan). gzip nivel 9 (métrica de WEB-0) y brotli 11.
- **Navegador:** servidor local con brotli; caché deshabilitada; viewport móvil 375×812; perfil emulado tipo Lighthouse móvil (150 ms RTT, 1,6 Mbps, CPU ×4) por CDP — **no es una corrida de Lighthouse**; 5 corridas, mediana. TBT calculado con Long Tasks tras FCP.
- **Build:** 3 builds en frío por candidato (cachés borradas), tiempo de pared.
- **Sin JS:** `setJavaScriptEnabled(false)`.

## 4. Resultados medidos

### 4.1 JavaScript inicial (gzip, métrica de B-JS-1)

| Ruta | Next App Router | Next Pages (mejor caso) | Astro 5.18.2 | Astro 7.3.3 |
|---|---:|---:|---:|---:|
| `/` estática | **133.528 B** (6 archivos; brotli 114.187; raw 453.414) | **0** (`unstable_runtimeJS: false`) | **0** | **0** |
| `/rastro` con isla React | **133.528 B** (idéntico a `/`) | 123.412 B (8 archivos) | 70.899 B (3 archivos) | 69.287 B (3 archivos) |
| `/rastro-vanilla` | — | — | 0 externo + 234 B inline | 0 externo + 234 B inline |

- **Presupuesto B-JS-1: ≤ 60 KB gzip.** Next App Router **lo excede ×2,2** con una página que **no tiene ninguna interacción**: hidrata igual. Con isla React, Astro queda en ~69–71 KB (**excede en 9–11 KB**), por lo que las rutas de contenido **no deben llevar una isla React**; sí pueden llevar una isla vanilla (0 KB externos).
- **B-JS-2 (Home, ≤ 90 KB):** Next 133,5 KB ✗; Astro con isla React 69,3–70,9 KB ✓.
- **JS propio vs. framework.** Next: el componente propio ocupa **876 B raw (471 B gzip)** dentro de un total de 133.528 B: ~99,6 % es runtime. Astro con isla React: propio **0,6–0,8 KB gzip**; ~66 KB es React DOM (`client.js`), común a ambos frameworks. Es decir, Next añade del orden de **66 KB gzip por encima de React DOM** (133,5 KB − ~67 KB; router, RSC y bootstrap), cifra aproximada porque los bundles no se separan de forma exacta.
- **Transferencia real (CDP, brotli):** Next `/` 119.786 B totales (8 pedidos, 115.516 B de JS); Astro `/` **2.041–2.059 B (1 pedido)**.

### 4.2 HTML, CSS, fuentes

| | Next App | Next Pages | Astro 5 | Astro 7 |
|---|---:|---:|---:|---:|
| HTML `/` (gzip) | 3.577 B | 1.449 B | 2.238 B | 2.213 B |
| HTML `/rastro` (gzip) | 3.883 B | 1.925 B | 4.116 B | 4.462 B |
| CSS total `/` (gzip) | ~960 B | ~960 B | ~949 B | ~942 B |

Todos muy por debajo de B-HTML (≤ 80 KB) y B-CSS (≤ 25 KB). Fuentes no medidas (system fonts en el spike; B-FONT queda para M1).

### 4.3 Rendimiento en el perfil móvil emulado (mediana de 5)

| Ruta | Next App | Astro 5 | Astro 7 |
|---|---|---|---|
| `/` FCP · LCP | 580 ms | 488 ms | 484 ms |
| `/` **TBT** (presupuesto ≤ 100 ms) | **175 ms** (123–217) ✗ | **0** ✓ | **0** ✓ |
| `/rastro` TBT | 172 ms ✗ | 49 ms ✓ | 61 ms ✓ |
| `/rastro-vanilla` TBT | — | 0 ✓ | 0 ✓ |
| CLS (todas las rutas) | 0 | 0 | 0 |

Los tiempos de FCP/LCP son de laboratorio, sobre servidor local y con mucho ruido entre corridas: **se usan solo como indicio**. El TBT de Next sobre el presupuesto sí es consistente en las 5 corridas de las dos rutas.

### 4.4 Build

| | Next App | Next Pages | Astro 5.18.2 | Astro 7.3.3 (Node 22) |
|---|---:|---:|---:|---:|
| Build en frío (3 corridas, s) | 12,2 · 12,6 · 12,1 | 8,5 · 8,6 · 8,9 | 19,8 · 8,8 · 7,4 | 21,7 · 4,4 · 4,5 |
| Archivos generados | 27 | 23 | 6 | 6 |
| Salida total (B) | 678.394 | 479.280 | 247.964 | 245.420 |

La primera corrida de Astro es un valor atípico (arranque en frío de la máquina); se reportan las tres.

### 4.5 Sin JavaScript, accesibilidad, teclado

- **Sin JS (A-NOJS):** las cuatro variantes muestran el 100 % del contenido. Nota: Next hace **1 pedido de script incluso con JS deshabilitado** (un `<link rel=preload as=script>`); Astro 0.
- **axe-core (wcag2a/aa, 2.1, 2.2 aa, best-practice): 0 violaciones** en todas las rutas de todos los candidatos.
- **Teclado:** en las tres implementaciones de la isla (Next, Astro-React, Astro-vanilla), Tab llega a «Resumen», Tab+Enter activa «Detalle» y `aria-pressed` se actualiza. Las alternativas de contenido se muestran completas antes de la hidratación y los botones se ocultan hasta que hay JS (mejora progresiva).
- **SVG accesible:** `role="img"` + `<title>`/`<desc>` + lista equivalente, idéntico en los cuatro.
- **`prefers-reduced-motion`:** cubierto en el CSS compartido; el spike no tiene animaciones que probar.

### 4.6 Cadena de suministro

| | Next 16.3.5 | Astro 5.18.2 | Astro 7.3.3 |
|---|---|---|---|
| `npm audit` | **0** | **3 (1 crítica, 1 alta, 1 baja)**: 10 advisories de Astro + esbuild + sharp; el arreglo exige `astro >= 7.2.8` | **0** |
| Paquetes en el lockfile del spike | 60 | 506 | 338 |
| Dependencias directas de producción | 3 (`next`, `react`, `react-dom`) | 1 + adaptador | 1 (`astro`) |

Los advisories de Astro 5 tocan sobre todo funciones que un sitio estático no usa (server islands, optimización de imágenes, view transitions, `define:vars`), pero **el gate de auditoría de WEB-0 (§9.1) no pasaría** y el arreglo no existe para Node 20.

## 5. Matriz de decisión

**Criterio de la matriz:** primero **compuertas** (medidas contra un presupuesto o requisito de WEB-0; no compensables entre sí), después **criterios comparativos** con la evidencia y el sentido del trade-off. **No se suma ninguna puntuación:** una nota ponderada esconde justamente lo que importa (que una compuerta fallida no se compensa con comodidad).

### 5.1 Compuertas

| # | Criterio (fuente) | Next 16.3.5 App Router | Astro 7.3.3 |
|---|---|---|---|
| G1 | JS inicial ≤ 60 KB gzip en rutas de contenido (B-JS-1) | **✗** 133,5 KB | **✓** 0 KB |
| G2 | JS inicial ≤ 90 KB en Home con una isla (B-JS-2) | **✗** 133,5 KB | **✓** 69,3 KB (isla React) / ~0 (vanilla) |
| G3 | TBT ≤ 100 ms (B-INP proxy) | **✗** 175 ms | **✓** 0–61 ms |
| G4 | Contenido íntegro sin JS (A-NOJS) | ✓ | ✓ |
| G5 | 0 violaciones axe | ✓ | ✓ |
| G6 | `npm audit` sin hallazgos (WEB-0 §9.1) | ✓ | ✓ (con 7.3.3) |
| G7 | Instalable en el entorno actual | ✓ | **✗** requiere Node ≥ 22.12 (ver §8) |

G7 es una restricción **de entorno, no de producto**, y tiene salida (instalar Node 22 LTS o 24 con `nvm`, ya presente como `nvm4w`). G1–G3 son restricciones **de producto** y para Next **no tienen salida soportada**: la única vía sin runtime (`unstable_runtimeJS: false`, Pages Router) es **inestable, no está en el tipo oficial de `config`** (el build de tipos la rechaza; hubo que desactivar el chequeo para medirla) y desaparece en cuanto la página tiene una interacción (123 KB gzip).

### 5.2 Comparativos

| Criterio | Next | Astro | Sentido del trade-off |
|---|---|---|---|
| Arquitectura de componentes | React en todo | `.astro` para estática + cualquier isla (React medido) | Next unifica; Astro separa «contenido» de «interacción», que es la forma de ALETHEIA (documento primero). Costo de Astro: dos modelos mentales |
| SVG / dataviz propio | SVG en servidor | SVG en servidor, 0 JS | Empate en capacidad; Astro no paga runtime por figura |
| Accesibilidad | axe 0, teclado OK | axe 0, teclado OK | Empate medido |
| Mejora progresiva | Posible, pero el runtime siempre se envía | Nativa; isla vanilla de 234 B | Astro |
| Lupa / Rastro interactivo | Componentes React sobre 133 KB ya pagados | Islas; React añade ~69 KB **una vez por página**; vanilla ~0 | Astro deja elegir el costo por componente. **Riesgo:** estado compartido entre islas (Lupa↔Rastro↔Mapa) exige un mecanismo extra |
| Búsqueda | Índice estático + carga perezosa | Ídem | Neutral (B-JS-4 es aparte); en Astro no se suma a un runtime base |
| Páginas de corpus estáticas | `generateStaticParams` | `getStaticPaths` | Empate; Astro entrega 0 JS |
| `/preguntar` y APIs | Route handlers de primera clase | Endpoints SSR con adaptador, por ruta | Next mejor **si** Ask viviera en el mismo sitio; WEB-0 (§7) lo separa en otro deployment, así que **no pesa hoy** |
| Deploy en Vercel | Primera clase | Primera clase (adaptador) | **No probado** (fuera de M0); declarado por los proveedores |
| Mantenimiento por una persona | Superficie conceptual grande (RSC, caché); estable | Superficie chica para contenido; **majors rápidos** (6.0 el 2026-03-10 y 7.0 el 2026-06-22: dos majors en 3,5 meses; Next 15→16 tardó 12 meses) **y saltos de Node** (fechas: registro npm) | Mixto |
| Riesgo de ecosistema | 60 paquetes, 0 advisories | 338 paquetes transitivos; 5.x con advisories y sin arreglo para Node 20 | Mixto; se mitiga con versiones exactas, lockfile, `npm ci --ignore-scripts` y gate de auditoría |
| Complejidad | Más partes móviles para un sitio estático | Menos para este caso | Astro |
| Build | 12,2 s, 27 archivos | 4,5 s, 6 archivos | Astro (irrelevante frente al resto) |

## 6. Decisión

**Astro 7.3.3**, salida estática, sin integraciones de UI por ahora. La regla de OD-01 se cumple literalmente: Next.js App Router **no cumple B-JS-1/2** (133,5 KB > 60/90 KB) ni el proxy de TBT, y no hay una vía soportada que lo arregle; por lo tanto «ADR a Astro».

Se descarta **Astro 5.18.2** como versión de producción aunque corra en Node 20: es funcionalmente equivalente en las mediciones pero tiene advisories abiertos sin arreglo en su rama.

## 7. Por qué se descartó Next.js (y qué se le reconoce)

1. **Incumple el presupuesto por diseño, no por configuración**: una página sin interacción envía 133,5 KB gzip (99,6 % runtime). Hidratar todo es el modelo de App Router.
2. **Sin salida soportada**: la variante sin runtime es inestable, sin tipos y sin interacción posible en esa ruta.
3. **Cada interacción futura suma sobre esa base**; en Astro se paga por isla.
4. Se le reconoce: 0 advisories, 60 paquetes, route handlers y un modelo único. Si el producto pasara a ser una aplicación (Ask en el mismo sitio, sesiones, estado global), estas ventajas volverían a pesar (ver §9).

## 8. Consecuencias operativas

- **Node ≥ 22.12 es requisito del proyecto.** `package.json` declara `engines.node >= 22.12.0`, `.npmrc` tiene `engine-strict=true` (con Node 20, `npm ci` se **rechaza**: verificado) y `.nvmrc` = `22`.
- **En esta máquina el Node por defecto (v20.20.2) no sirve para el proyecto.** Los gates de M0 se ejecutaron con Node 22.23.2 del spike (paquete npm `node@22.23.2`, mantenido por una sola persona: **solo validación local, no es dependencia del repo**). Se recomienda instalar Node 22 LTS o 24 con `nvm` (no lo hice: cambia el sistema).
- **Tooling condicionado por Node 22:** Vitest 5 (`^22.12`), `prettier-plugin-astro` (`>=22.12`). `eslint-plugin-astro` 3.2.1 exige `^22.22.3` y se **difiere a M1**: los `.astro` se validan con `astro check` (0 errores) hasta que se decida elevar el mínimo de Node.
- **TypeScript 6.0.3, no 7.x:** `typescript-eslint` 8.70.0 soporta `< 6.1.0`.
- Sin `sharp` en uso (B-IMG = 0): es una dependencia opcional de Astro; sus binarios libvips llevan licencia LGPL y **no deben incorporarse a un artefacto distribuido** sin revisión (`G-LIC`, futuro).

## 9. Condiciones para revisar esta decisión

Reabrir OD-01 (por ADR) si ocurre cualquiera de estas:

1. **Ask o cualquier función con servidor/sesión pasa a vivir en el mismo sitio** (rutas dinámicas, estado global, autenticación).
2. **El estado compartido entre islas** (Lupa ↔ Rastro ↔ Mapa) requiere más código propio que el ahorro de runtime, o la Home no cabe en B-JS-2 (90 KB) con las islas necesarias.
3. **No se puede adoptar Node ≥ 22.12** en el entorno de desarrollo o de despliegue.
4. **Astro publica advisories con parches lentos**, o un major nuevo rompe la compatibilidad de forma costosa (dos majors en 3,5 meses es un riesgo real de mantenimiento para una persona; además 7.3.3 tiene solo 3 días de antigüedad a la fecha de esta decisión, así que hay poco historial de estabilidad).
5. **Next.js ofrece un modo estático soportado y sin hidratación** que alcance ≤ 60 KB gzip en rutas de contenido.
6. Un ADR **relaja o reemplaza** B-JS-1/2 (los presupuestos solo se endurecen; relajarlos exige ADR).

## 10. Límites de esta evidencia

- Una sola página de prueba (con una interacción); no se midieron fuentes finales, la Home real, la búsqueda ni el mapa de 18 filas.
- Servidor local, no CDN; perfil emulado por CDP, **no Lighthouse**; sin deploy en Vercel.
- Astro 7.3.3 se midió con Node 22 aislado porque el Node del sistema no lo soporta.
- No se midió Astro con Preact u otra librería de islas ligera (posible optimización de las islas interactivas; no necesaria para la decisión).
- `unstable_runtimeJS` se midió con el chequeo de tipos desactivado (único modo de compilarlo).
- Sin control de carga de la máquina durante los builds; los tiempos de build son orientativos.
- La comparación de Astro 5 vs 7 mide versiones distintas de Node y de Vite a la vez.

## 11. Referencias

- `spikes/framework-od01/README.md` — cómo reproducir; `results/measure.json`, `results/build-time.json`, `results/environment.json`.
- `governance/web-0/WEB-0-ARCHITECTURE.md` §10 (presupuestos), `WEB-0-DECISION-LOG.md` (D-016, OD-01).
