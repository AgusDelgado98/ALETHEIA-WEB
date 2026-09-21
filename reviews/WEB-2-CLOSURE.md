# WEB-2 · cierre

**Estado: `TECHNICALLY COMPLETE / HUMAN RELEASE GATE ONLY`**

Fecha del cierre técnico: 2026-09-21 · Rama: `main` · Revisión pinneada: `1dbfbe78f2f7fc62a9dba49e70348574a75f8167`

## Técnico (cerrado)

`npm run ci` en `main`: typecheck, lint, format, corpus, editorial, reviews, fonts, build, 169 tests y 71 gates → 64 PASS · 4 N/A · 3 FAIL. `npm run audit`: 0 vulnerabilidades. Sin secretos ni archivos accidentales versionados. Deploy: Vercel (`vercel.json`), sin cambios.

Los 3 FAIL son exactamente los gates humanos, con `blocksCi: false`. No se marcó ninguno como PASS.

## Humano (pendiente, no falsificable)

| Gate | Decisión que falta | Dónde se registra |
|---|---|---|
| **G-OD-14** | Una segunda persona identificable, distinta del autor, revisa el sitio público y completa `reviewer`, `relationship_to_project`, `author_name`, `reviewer_equals_author: false`, `review_date`, `signature`, los 14 ítems de `checklist` (PASS/ISSUE/N/A) y `decision` (`APPROVED` / `REVISIONS_REQUIRED` / `REJECTED`). | `reviews/WEB-2-HUMAN-REVIEW.md` (encabezado YAML) |
| **G-LEG-03** | Una revisión legal humana fechada y firmada: decisión por Source/Root materializado (`CLEARED` / `CLEARED_WITH_CONDITIONS` / `NOT_CLEARED` / `REQUIRES_FURTHER_REVIEW`), por tipo de derivado y el caso CGI / CC BY-SA 4.0 (LAB-ROOT-0002). | `reviews/WEB-2-LEGAL-SOURCE-REVIEW.yml` |
| **G-LEG-02** | Depende de G-LEG-03: la revisión legal fija el texto/enlace de atribución (INDEC, CGI-IMO, CC BY-SA 4.0, link, ShareAlike) que debe agregarse a `/sobre` y a la cota. Ese cambio en `src/`/`editorial/` es posterior a la decisión legal y re-emite el pin (`npm run reviews:build`). | `required_public_attribution_changes` en el YAML; luego `/sobre` |

Orden mínimo: (1) legal completa el YAML → (2) se aplica la atribución en `/sobre` → (3) `reviews:build` → (4) el revisor independiente revisa el commit resultante y completa `WEB-2-HUMAN-REVIEW.md` → (5) `npm run gates` en verde → publicar.

## Fuera de alcance de este cierre

La rama `web-3` (rediseño de Home/Explorar y Figures) **no está mergeada** y modifica `src/`: invalidaría el pin de revisión. No forma parte de WEB-2 ni de este cierre.
