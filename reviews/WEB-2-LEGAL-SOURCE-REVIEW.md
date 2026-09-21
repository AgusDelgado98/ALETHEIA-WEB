# WEB-2 · revisión legal de Source (G-LEG-03)

**Estado: `PENDING`**

> Este documento vacío no satisface G-LEG-03.

No emitir opinión legal automática. Este archivo humano acompaña `reviews/WEB-2-LEGAL-SOURCE-REVIEW.yml`, que es el registro máquina. Completar el YAML; no basta con leer este Markdown.

- Commit: `c599a8c0b85a38aed19f5782fdfc4b46cac11ef5`
- Production URL: https://aletheia-web-seven.vercel.app
- Package date: 2026-09-20
- Reviewer: _vacío_
- Review date: _vacío_
- Signature: _vacío_

Decisiones admitidas por Source (nada preseleccionado):

* `CLEARED`
* `CLEARED_WITH_CONDITIONS`
* `NOT_CLEARED`
* `REQUIRES_FURTHER_REVIEW`

## G-LEG-02

Contrato: atribuciones y licencias exigidas por cada Source mostrada, presentes en `/sobre` y en la cota.

Estado actual: **OPEN**. `/sobre` no lista fuentes, no atribuye INDEC/CGI ni cita CC BY-SA 4.0. La cota muestra `source_label`, no la licencia. **No se modifica `/sobre` en esta fase.**

### Required public attribution changes

Campo YAML `required_public_attribution_changes`:

_vacío: la revisión legal determina qué texto/enlace debe incorporarse._

## Caso CGI / CC BY-SA 4.0 (LAB-ROOT-0002)

Publicación: Cuenta de generacion del ingreso e insumo de mano de obra (CGI-IMO)
Productor: Instituto Nacional de Estadistica y Censos (INDEC)
Licencia registrada: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

Forzar decisión humana (YAML `cgi_cc_by_sa`, todo vacío):

* atribución a INDEC
* denominación CGI-IMO
* referencia a CC BY-SA 4.0
* link de licencia cuando proceda
* ShareAlike
* naturaleza de los derivados realmente publicados
* cambios necesarios en `/sobre`

No está CLEARED.

## NOT_RECORDED

Toda Source/Root materializada con `recorded_license = NOT_RECORDED` conserva exactamente ese estado. No se convierte en permitido, prohibido, dominio público, fair use ni redistribuible. La plantilla pide decisión humana por ítem.

## Inventario (decisión por ítem)

| ID | Materialización | Licencia registrada | Decisión |
|---|---|---|---|
| `LAB-ROOT-0001` | PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LAB-ROOT-0002` | PUBLICLY_MATERIALIZED | CC BY-SA 4.0 | _vacío_ |
| `LAB-ROOT-0003` | PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LAB-ROOT-0004` | NOT_PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LAB-ROOT-0005` | PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LAB-ROOT-0006` | PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LAB-ROOT-0007` | PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LAB-SRC-0001` | NOT_PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LAB-SRC-0002` | NOT_PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LAB-SRC-0003` | NOT_PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LAB-SRC-0004` | NOT_PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LAB-SRC-0005` | NOT_PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LAB-SRC-0006` | NOT_PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LAB-SRC-0007` | NOT_PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LAB-SRC-0008` | NOT_PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LAB-SRC-0009` | NOT_PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LAB-SRC-0010` | NOT_PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LAB-SRC-0011` | NOT_PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LAB-SRC-UNIDENTIFIED-COUNT` | NOT_PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LABEL:OBSERVATORY_DESIGN` | PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LABEL:PLATFORM_EVALUATION` | PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LABEL:REGULATORY` | PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LABEL:SOURCE_AVAILABILITY_REVIEW` | PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |

## Tipos de derivado

G-LEG-03 exige decisión por tipo de derivado. Clearance actual: PENDING.

| Tipo | Clearance | Notas |
|---|---|---|
| `editorial_prose` | PENDING | _vacío_ |
| `publication_names` | PENDING | _vacío_ |
| `epistemic_status_labels` | PENDING | _vacío_ |
| `structural_ui` | PENDING | _vacío_ |
| `disclaimers` | PENDING | _vacío_ |
| `provenance_representations` | PENDING | _vacío_ |
| `numerical_figures` | PENDING | _vacío_ |
| `typography_ofl` | PENDING | _vacío_ |
| `preserved_keep_text` | PENDING | _vacío_ |
| `governance_required_text` | PENDING | _vacío_ |

## Website assets (no son corpus Source)

Tipografías OFL-1.1 autoalojadas. Van en el inventario con tipo `website_asset`. No se firman como Source del corpus.
