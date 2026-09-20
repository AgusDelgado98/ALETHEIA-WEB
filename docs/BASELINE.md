# Baseline de calidad — M0

Fecha: 2026-09-19. Instalación limpia (`npm ci`, con `ignore-scripts=true` y `engine-strict=true`) y `npm run verify`.

## Entorno de la verificación

| | |
|---|---|
| Node | **v22.23.2** (binario aislado del spike; el Node por defecto de la máquina, v20.20.2, es rechazado por `engine-strict`) |
| npm | 10.8.2 |
| SO | Windows 11 Pro 10.0.26200 |

## Versiones exactas (dependencias directas, fijadas con `save-exact`)

| Paquete | Versión | Tipo |
|---|---|---|
| `astro` | 7.3.3 | producción |
| `typescript` | 6.0.3 | dev — no 7.x: `typescript-eslint` soporta `< 6.1.0` |
| `@astrojs/check` | 0.9.10 | dev |
| `eslint` | 10.11.0 | dev |
| `@eslint/js` | 10.0.1 | dev |
| `typescript-eslint` | 8.70.0 | dev |
| `prettier` | 3.9.8 | dev |
| `prettier-plugin-astro` | 1.0.1 | dev |
| `vitest` | 5.0.1 | dev |
| `@types/node` | 22.20.4 | dev |

Dependencias directas de producción: **1** (límite de WEB-0 §9.1: ≤ 5). Árbol completo: 384 paquetes según `npm audit` (unos 192 alcanzables desde producción con `npm ls --omit=dev`). No se agregó ninguna dependencia sin uso: cada una la ejecuta un script (`astro` build/check, `eslint`/`@eslint/js`/`typescript-eslint` lint, `prettier`/plugin format, `vitest` test, `typescript`/`@types/node` typecheck y tests).

## Resultados

| Gate | Comando | Resultado |
|---|---|---|
| Typecheck (TS strict + `noUncheckedIndexedAccess`) | `npm run typecheck` | **0 errores, 0 warnings, 0 hints** (6 archivos); `tsc --noEmit` también rc 0 |
| Lint | `npm run lint` | **0 problemas** |
| Formato | `npm run format:check` | **conforme** |
| Tests | `npm run test` | **6/6** (2 archivos) — integridad de gobernanza y de pins |
| Build de producción | `npm run build` | **OK** — 1 página, `dist/index.html` 262 B (208 B gzip), **0 JS** |
| Auditoría | `npm audit` | **0 vulnerabilidades** |

**Los tests fallan cuando deben:** se alteró temporalmente un pin (`claims` 14→15) y un archivo de gobernanza (+1 byte); 4 de los 6 tests fallaron; ambos se restauraron y los 6 volvieron a pasar.

## Notas y límites

- **Node 22 es requisito**, no preferencia (ver ADR OD-01 §8).
- **`.astro` sin ESLint:** `eslint-plugin-astro` exige Node `^22.22.3`; se difiere a M1. Los `.astro` pasan `astro check`.
- El skeleton **no** ejerce presupuestos de rendimiento, accesibilidad ni la Home; solo demuestra que la cadena compila y se verifica.
- `npm ls` marca `@img/sharp-wasm32` como *extraneous*: es una dependencia **opcional** de `sharp` (binario wasm) presente en el lockfile; inocua y no usada (B-IMG = 0).
