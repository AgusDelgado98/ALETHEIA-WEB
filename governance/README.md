# Gobernanza importada (FROZEN)

Copia de referencia de los documentos que gobiernan ALETHEIA Web. **No se editan.** Cualquier cambio se hace por ADR en `docs/adr/` (o por la enmienda que el propio documento prevé), nunca modificando estas copias.

| Archivo | Estado |
|---|---|
| `ALETHEIA-WEB-DESIGN-CHARTER.md` | Design Charter v1.2 — FROZEN |
| `web-0/WEB-0-CHARTER.md`, `…-DATA-CONTRACT.md`, `…-EDITORIAL-CONTRACT.md`, `…-ARCHITECTURE.md`, `…-MVP.md`, `…-INTEGRITY-GATES.md`, `…-DECISION-LOG.md` | WEB-0 v1.0 — FROZEN (2026-09-19); OD-06 (hero) abierta por diseño |
| `web-0/SHA256SUMS.txt` | Sumas tal como se emitieron al congelar WEB-0 |

- **Origen, hash de origen, hash de la copia, fecha y estado** de cada archivo: [`IMPORT-MANIFEST.json`](IMPORT-MANIFEST.json). Las 9 copias son **idénticas byte a byte** a su origen (`C:\Proyectos\ALETHEIA-WEB-PROTOTYPE\ALETHEIA-WEB-V2.1-for-Claude-Code`).
- **Derivaciones: ninguna.** El Charter queda un nivel por encima de `web-0/` (igual que en el origen) para que `sha256sum -c SHA256SUMS.txt` funcione **sin modificar** ningún archivo. Se verifica con `cd governance/web-0 && sha256sum -c SHA256SUMS.txt` y con `npm run test`.
- Los archivos usan CRLF y `.gitattributes` los marca `-text` para que Git no los normalice.
- Las rutas internas de los documentos (`reconciliation/`, `web-0/`…) describen el layout del prototipo y **no se reescribieron**.
- **Decisiones posteriores que afectan a estos textos:** `docs/adr/OD-01-framework-decision.md` resuelve OD-01 y reemplaza el framework de D-016 (Next.js) por Astro, por la vía que OD-01 preveía. WEB-0 no se modificó.
