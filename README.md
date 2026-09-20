# ALETHEIA Web

Repositorio de **producción** del sitio ALETHEIA Web (fase **WEB-1**). Publica, sin agregar conclusiones nuevas, lo que dicen los corpus de investigación congelados.

> **Estado:** WEB-1 · hito 0 (M0) — repo, gobernanza y pins de corpus, framework resuelto (OD-01), skeleton con gates en verde. **No hay Home, componentes ni datos de producción todavía.**

## Autoridad

| Qué | Dónde | Regla |
|---|---|---|
| Investigación V1 | `C:\Proyectos\ALETHEIA` · tag `aletheia-research-foundation-v1.0.0` · commit `2da6a2b5…` | Solo lectura, vía objetos Git del tag |
| Investigación LABOR | `C:\Proyectos\ALETHEIA-LABOR` · tag `aletheia-labor-v1.0.0` · commit `ca6a85e1…` | Solo lectura, vía objetos Git del tag |
| Gobernanza (FROZEN) | [`governance/`](governance/README.md) | Copias byte a byte; no se editan |
| Pins | [`corpus-pins/corpus-pins.json`](corpus-pins/corpus-pins.json) | Un cambio exige ADR |
| Decisiones | [`docs/adr/`](docs/adr/) | Una decisión = un ADR |

Un backup (Google Drive, `ALETHEIA-BACKUP-2026-09-19`) es copia de recuperación, **no fuente de verdad**.

## Stack (OD-01 = RESUELTA)

Astro 7.3.3 (salida estática) · TypeScript strict · Vitest · ESLint + typescript-eslint · Prettier. Ver [`docs/adr/OD-01-framework-decision.md`](docs/adr/OD-01-framework-decision.md).

## Requisitos

**Node ≥ 22.12** (`.nvmrc` = 22; `engine-strict=true`). Con Node 20, `npm ci` se rechaza a propósito.

```bash
nvm install 22 && nvm use 22
npm ci            # .npmrc: ignore-scripts=true, engine-strict=true
npm run verify    # typecheck + lint + format:check + test + build
```

| Script | Qué hace |
|---|---|
| `npm run dev` / `preview` | Servidor de desarrollo / vista previa del build |
| `npm run typecheck` | `astro check` (TypeScript strict) |
| `npm run lint` | ESLint (TS/JS) |
| `npm run format` / `format:check` | Prettier |
| `npm run test` | Vitest (integridad de gobernanza y de pins) |
| `npm run build` | Build estático a `dist/` |

## Estructura

```text
governance/     Design Charter v1.2 + WEB-0 (FROZEN) + IMPORT-MANIFEST.json
corpus-pins/    Pins de V1 y LABOR (commit/tag/tree, conteos esperados)
docs/adr/       Registros de decisión (OD-01)
docs/BASELINE.md  Versiones exactas y resultado de los gates de M0
spikes/         Evidencia cruda del spike de framework (no forma parte del build)
src/            Skeleton mínimo (una página neutra)
tests/          Tests de integridad
```

## Fuera de alcance de M0

Home, componentes visuales, Design System, extractor de corpus, visualizaciones, búsqueda, Ask ALETHEIA, deploy. Empiezan en M1 o después.
