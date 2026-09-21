# WEB-2 · cierre

**Estado: `TECHNICALLY COMPLETE / FINAL INDEPENDENT HUMAN REVIEW PENDING`**

Rama: `main`. El commit exacto que debe revisar la segunda persona es `WEB2_REVIEWED_COMMIT` (`tools/reviews/constants.ts`, repetido en `reviews/WEB-2-PIN.json` y en `reviews/WEB-2-HUMAN-REVIEW.md`). No se copia aquí para no crear una referencia circular entre este archivo y el commit que fija.

## Cerrado

| Gate | Estado | Evidencia |
|---|---|---|
| G-LEG-03 | PASS | `reviews/WEB-2-LEGAL-SOURCE-REVIEW.yml` completado (reviewer, fecha, firma, `status: COMPLETED`) con decisión por Source materializada y por tipo de derivado. |
| G-LEG-02 | PASS | `/sobre` incluye la sección «Atribuciones y licencias» (INDEC, CGI-IMO, CC BY-SA 4.0 y enlace oficial), con el texto de `required_public_attribution_changes` del registro legal. |
| Gates técnicos | PASS | `npm run ci`. |

## Pendiente (única condición humana)

**G-OD-14**: una segunda persona identificable, distinta del autor, completa `reviews/WEB-2-HUMAN-REVIEW.md` (`reviewer`, `relationship_to_project`, `author_name`, `reviewer_equals_author: false`, `review_date`, `signature`, los 14 ítems de `checklist`, `decision`, `status: COMPLETED`) sobre el commit `WEB2_REVIEWED_COMMIT`. No se registra ninguna aprobación en su nombre.

## Excepción legal (registro de waiver)

WEB-0 (congelado) exige que toda excepción a un gate sea un *waiver* registrado con motivo, alcance y vencimiento (`WEB-0-INTEGRITY-GATES.md`, principio 1). El decision log de WEB-0 está congelado y protegido por `M1-GOV-01`, así que no se edita. El proyecto no tiene otro registro de waivers, por lo que la excepción se implementó en los gates y se registra aquí.

- **Motivo:** la revisión legal de Source (G-LEG-03, CC BY-SA 4.0 de INDEC/CGI-IMO) y G-LEG-02 exigen atribución y enlace oficial a la licencia en `/sobre`. Sin excepción, ese enlace contradice `G-PRV-03`, `G-PERF-04` y `G-EDI-08`.
- **Alcance (estricto):** un único `<a href>` en la ruta `/sobre` cuyo `href` sea exactamente `https://creativecommons.org/licenses/by-sa/4.0/`. Es una navegación iniciada por la persona lectora hacia la licencia legal obligatoria. No se autoriza ningún script, imagen, fuente, fetch, analítica ni otro recurso remoto, ni ninguna otra URL (ni del mismo dominio, ni variantes de esa URL), ni el mismo enlace en otra ruta. Implementación: `isLegalLicenseLink` en `scripts/gates/gates.ts`, aplicada en `G-PRV-03`, `G-PERF-04` y `G-EDI-08`.
- **`G-FIG-02`:** no se necesita excepción. La URL y la versión `4.0` no están en texto editorial (viven como constantes de `src/pages/sobre.astro`) y en el HTML van clasificadas como `data-num="id"` (`G-FIG-03`).
- **Pruebas:** `tests/legal-license-exception.test.ts` (la URL exacta pasa; otra URL, variantes, otra ruta y otros tipos de recurso siguen fallando).
- **Vencimiento:** sin fecha fijada por el autor. Pendiente de decisión.
