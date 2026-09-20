# M1 — Checkpoint (2026-09-20)

Estado preservado para retomar con otro agente. **M1 NO está cerrado.** Este checkpoint no agrega funcionalidad nueva.

## Qué quedó implementado

- Pipeline de corpus: pin de LABOR (`corpus-pins/`, `pins/`, `corpus-src/labor@ca6a85e`), extracción, build y check (`tools/corpus`, `npm run corpus:*`).
- Pipeline editorial: `editorial/`, sellado, build y check (`tools/editorial`, `npm run editorial:*`).
- Contrato de módulo `modules/labor.contract.json`, `schemas/` y salida `generated/labor`.
- Corte vertical de Q-0013: ruta `src/pages/labor/preguntas`, componentes Astro (`EvidenceState`, `EvidenceTrail`, `ProvenanceDetails`, `WhatWeCanSay`, `WhatThisDoesNotMean`, etc.), tokens en `design/`, fuentes locales en `public/fonts`.
- Gates de integridad (`scripts/gates`), e2e (`scripts/e2e`) y capturas de referencia en `docs/m1/*.png`.
- Tests: `tests/` (corpus-pins, editorial, gates, governance, pipeline, unit, fixtures).
- Se reemplazó el `src/pages/index.astro` de placeholder por la estructura del corte.

## Último resultado verde conocido

Extraído de los reportes locales (`reports/`, ignorado por git), generados el 2026-09-19 23:59–00:00:

- `reports/gates/summary.json`: 55 PASS, 5 NA, 0 fail. Los NA son G-SRC-05, G-STA-07, G-LIM-04, G-FIG-04 y G-UX-04, todos con justificación en el reporte.
- `reports/e2e.json`: `failures: []`. axe con 0 violaciones en 4 estados (resumen, detalle, auditoría, auditoría + procedencia); tab stops con foco visible.

**Limitación:** estos reportes son del final de la cadena `npm run verify`, pero no se re-ejecutó `verify` para este checkpoint y no queda un log del run completo. Los resultados de typecheck, lint, format:check, build y `vitest` no están registrados en ningún archivo. Confirmar con un `npm run verify` completo al retomar.

## Qué falta para cerrar M1

- Volver a correr `npm run verify` completo y registrar el resultado.
- WCAG 2.2 AA **no se declara**: pendientes G-A11Y-05 (responsive) y G-A11Y-06 (lectores de pantalla). El axe automático cubre solo parte.
- OD-06 (hero) sigue abierta por diseño (WEB-0).
- Mapa de 18 preguntas (G-UX-04): fuera del alcance de M1.
- `npm run audit` no se corrió ni se registró en este checkpoint.

## Issues abiertos

- Ninguno registrado como issue formal. Los pendientes son los de arriba.
- Repo hermano `C:\Proyectos\ALETHEIA` tiene `ALETHEIA_FORENSIC_AUDIT_2026-09-17.md` sin trackear. No pertenece a este commit ni a este repo.

## Reglas para el siguiente agente

- `governance/` es FROZEN. No editar. Los cambios van por ADR en `docs/adr/`.
- LABOR y V1 no se tocan.
- Requiere Node 22.
