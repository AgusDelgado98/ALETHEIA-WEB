import { stringify } from "yaml";
import { OD14_WARNING, LEG03_WARNING, CGI_LICENSE, CGI_LICENSE_URL } from "./constants.ts";
import type { ReviewInventory } from "./inventory.ts";
import type { HumanReviewT, LegalReviewT } from "./schema.ts";

export function renderHumanReviewMarkdown(r: HumanReviewT): string {
  const fm = stringify(r, { lineWidth: 100 });
  const rows = r.checklist
    .map(
      (c) =>
        `| ${c.id} | ${c.item} | ${c.result === "" ? "_vacío (PASS / ISSUE / N/A)_" : c.result} |`,
    )
    .join("\n");
  return `---
${fm}---

# WEB-2 · revisión humana independiente (OD-14)

**Estado: \`${r.status}\`**

> ${OD14_WARNING}

Esta plantilla no firma textos, no aprueba el release y no cierra OD-14.

## Identificación

| Campo | Valor |
|---|---|
| Project | ${r.project} |
| Release | ${r.release} |
| Commit reviewed | \`${r.reviewed_commit}\` |
| Production URL reviewed | ${r.production_url} |
| Package generated at | ${r.package_generated_at} |
| Reviewer | ${r.reviewer === "" ? "_vacío_" : r.reviewer} |
| Relationship to project | ${r.relationship_to_project === "" ? "_vacío_" : r.relationship_to_project} |
| Author name | ${r.author_name === "" ? "_vacío_" : r.author_name} |
| Confirmation reviewer ≠ author | ${r.reviewer_equals_author === null ? "_vacío (debe ser false)_" : String(r.reviewer_equals_author)} |
| Review date | ${r.review_date === "" ? "_vacío (ISO date)_" : r.review_date} |
| Signature | ${r.signature === "" ? "_vacío_" : r.signature} |

## Checklist

Registrar el resultado **en el encabezado YAML** (\`checklist[].result\`: \`PASS\` / \`ISSUE\` / \`N/A\`). No marcar esta tabla como aprobación automática.

| # | Pregunta | Resultado |
|---|---|---|
${rows}

## Decisión

Sin preselección. Valores admitidos:

* \`APPROVED\`
* \`REVISIONS_REQUIRED\`
* \`REJECTED\`

Campo YAML \`decision\`: ${r.decision === "" ? "_vacío_" : r.decision}

## Observations

${r.observations === "" ? "_vacío_" : r.observations}

## Required changes

${r.required_changes === "" ? "_vacío_" : r.required_changes}

## Scope of this review

Sitio público WEB-2 (presentación). No reabre claims, hypotheses ni research questions del corpus frozen. No modifica governance.
`;
}

export function renderLegalMarkdown(review: LegalReviewT, inv: ReviewInventory): string {
  const itemRows = review.items
    .map((i) => {
      const src = inv.sources.find((s) => s.id === i.id);
      return `| \`${i.id}\` | ${src?.materialization ?? "?"} | ${src?.recorded_license ?? "?"} | ${i.decision === "" ? "_vacío_" : i.decision} |`;
    })
    .join("\n");
  const derived = review.derived_types
    .map((d) => `| \`${d.id}\` | ${d.clearance} | ${d.notes === "" ? "_vacío_" : d.notes} |`)
    .join("\n");
  const cgi = inv.sources.find((s) => s.id === "LAB-ROOT-0002");
  return `# WEB-2 · revisión legal de Source (G-LEG-03)

**Estado: \`${review.status}\`**

> ${LEG03_WARNING}

No emitir opinión legal automática. Este archivo humano acompaña \`reviews/WEB-2-LEGAL-SOURCE-REVIEW.yml\`, que es el registro máquina. Completar el YAML; no basta con leer este Markdown.

- Commit: \`${review.reviewed_commit}\`
- Production URL: ${review.production_url}
- Package date: ${review.package_generated_at}
- Reviewer: ${review.reviewer === "" ? "_vacío_" : review.reviewer}
- Review date: ${review.review_date === "" ? "_vacío_" : review.review_date}
- Signature: ${review.signature === "" ? "_vacío_" : review.signature}

Decisiones admitidas por Source (nada preseleccionado):

* \`CLEARED\`
* \`CLEARED_WITH_CONDITIONS\`
* \`NOT_CLEARED\`
* \`REQUIRES_FURTHER_REVIEW\`

## G-LEG-02

Contrato: atribuciones y licencias exigidas por cada Source mostrada, presentes en \`/sobre\` y en la cota.

Estado actual: **OPEN**. \`/sobre\` no lista fuentes, no atribuye INDEC/CGI ni cita ${CGI_LICENSE}. La cota muestra \`source_label\`, no la licencia. **No se modifica \`/sobre\` en esta fase.**

### Required public attribution changes

Campo YAML \`required_public_attribution_changes\`:

${review.required_public_attribution_changes === "" ? "_vacío: la revisión legal determina qué texto/enlace debe incorporarse._" : review.required_public_attribution_changes}

## Caso CGI / ${CGI_LICENSE} (LAB-ROOT-0002)

Publicación: ${cgi?.publication ?? "CGI-IMO"}
Productor: ${cgi?.producer ?? "INDEC"}
Licencia registrada: ${CGI_LICENSE} (${CGI_LICENSE_URL})

Forzar decisión humana (YAML \`cgi_cc_by_sa\`, todo vacío):

* atribución a INDEC
* denominación CGI-IMO
* referencia a ${CGI_LICENSE}
* link de licencia cuando proceda
* ShareAlike
* naturaleza de los derivados realmente publicados
* cambios necesarios en \`/sobre\`

No está CLEARED.

## NOT_RECORDED

Toda Source/Root materializada con \`recorded_license = NOT_RECORDED\` conserva exactamente ese estado. No se convierte en permitido, prohibido, dominio público, fair use ni redistribuible. La plantilla pide decisión humana por ítem.

## Inventario (decisión por ítem)

| ID | Materialización | Licencia registrada | Decisión |
|---|---|---|---|
${itemRows}

## Tipos de derivado

G-LEG-03 exige decisión por tipo de derivado. Clearance actual: PENDING.

| Tipo | Clearance | Notas |
|---|---|---|
${derived}

## Website assets (no son corpus Source)

Tipografías OFL-1.1 autoalojadas. Van en el inventario con tipo \`website_asset\`. No se firman como Source del corpus.
`;
}

export function renderEditorialPending(inv: ReviewInventory): string {
  const counts = Object.entries(inv.pending_by_family)
    .map(([k, n]) => `| \`${k}\` | ${n} |`)
    .join("\n");
  const lines = inv.pending
    .map(
      (u) =>
        `| \`${u.string_id}\` | \`${u.text_hash.slice(0, 12)}\` | \`${u.canonical_hash === null ? "null" : u.canonical_hash.slice(0, 12)}\` | ${u.verdict} | \`${u.source_yaml}\` | ${u.family} | ${u.pages.join(" ")} |`,
    )
    .join("\n");
  return `# WEB-2 · textos PENDING_AUTHOR_REVIEW

Este inventario **no aprueba** ningún texto. Verdicts intactos.

- Total unidades editoriales: ${inv.verdicts.total_units}
- \`PENDING_AUTHOR_REVIEW\`: ${inv.pending.length}
- Hash del conjunto pendiente: \`${inv.pending_set_hash}\`
- Manifest editorial: \`${inv.editorial_manifest_sha256}\`
- Commit atado: \`${inv.reviewed_commit}\`

## Reconciliación de veredictos

${Object.entries(inv.verdicts.by_verdict)
  .map(([k, n]) => `- \`${k}\`: ${n}`)
  .join("\n")}

Suma: ${Object.values(inv.verdicts.by_verdict).reduce((a, b) => a + b, 0)} (debe ser ${inv.verdicts.total_units}).

## public_question

- Research questions: ${inv.verdicts.public_question.research_questions}
- Registros \`public_question\`: ${inv.verdicts.public_question.records}
- APPROVED: ${inv.verdicts.public_question.APPROVED}
- REVISED_AND_APPROVED: ${inv.verdicts.public_question.REVISED_AND_APPROVED}
- PENDING_AUTHOR_REVIEW: ${inv.verdicts.public_question.PENDING_AUTHOR_REVIEW}
- REJECTED: ${inv.verdicts.public_question.REJECTED}

Las 4 \`public_question\` que no estaban en el recuento «14» son las de las otras fichas destacadas (Q-0003, Q-0004, Q-0005, Q-0011), todas \`APPROVED\`. No se modifican.

## Conteos por familia (solo pendientes)

| Familia | Count |
|---|---|
${counts}

## Unidades pendientes

| string_id | text_hash | canonical_hash | verdict | YAML | familia | páginas |
|---|---|---|---|---|---|---|
${lines}
`;
}

export function renderBatchApprovalGuide(inv: ReviewInventory): string {
  return `# WEB-2 · aprobación editorial por lote (no ejecutada)

**No se ejecuta en esta fase.** Ningún verdict cambia.

El mecanismo ya existente es \`editorial/labor/audit/*.review.yml\`:

1. \`defaults.verdict\` aplica a todas las unidades del bundle sin override.
2. \`overrides[string_id]\` puede fijar verdict, reviewer, date y notes por unidad.
3. \`npm run editorial:seal\` **agrega** registros atados a \`text_hash\` / \`canonical_hash\`.
4. \`npm run editorial:build\` actualiza \`editorial/manifest.json\`.

Una aprobación colectiva futura solo es válida si conserva:

* lista exacta de \`string_id\` (las ${inv.pending.length} pendientes, o un subconjunto por familia);
* \`text_hash\` y \`canonical_hash\` de cada una (hash de conjunto actual: \`${inv.pending_set_hash}\`);
* reviewer / author reales;
* fecha ISO;
* verdict \`APPROVED\` o \`REVISED_AND_APPROVED\`;
* overrides / excepciones;
* vínculo al manifest.

No es válido un simple \`all approved\` sin identificación de unidades.

No tocar registros que ya están \`APPROVED\` o \`REVISED_AND_APPROVED\` (las 18 \`public_question\`).

Si el material editorial cambia, \`REVIEW INVALIDATED BY DRIFT\` y hay que volver a sellar con nueva revisión.
`;
}

export function legalYaml(review: LegalReviewT): string {
  return stringify(review, { lineWidth: 100 });
}
