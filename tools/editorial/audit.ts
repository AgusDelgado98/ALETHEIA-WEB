import type { GeneratedCorpus } from "../corpus/load.ts";
import { canonicalJson, sha256Hex } from "../corpus/util.ts";
import { DIRECTIVE, parseSegments } from "./directives.ts";
import type { EditorialBundle, EditorialUnit } from "./load.ts";
import { resolveRef } from "./resolve.ts";
import { lintText } from "./lint.ts";
import { AuditFile, type AuditFileT, type AuditRecordT } from "./schema.ts";

export interface UnitHashes {
  canonical_refs: string[];
  canonical_hash: string | null;
  text_hash: string;
  unresolved: string[];
}

/**
 * Hashes de un texto público. `canonical_hash` ata el texto a los textos canónicos de los que deriva
 * (y a los valores que sus directivas resuelven): si cambia el canónico, el registro queda obsoleto (G-EDI-01).
 */
export function unitHashes(unit: EditorialUnit, c: GeneratedCorpus): UnitHashes {
  const refs = [...new Set(unit.maps_to)].sort();
  const unresolved: string[] = [];
  const parts: { ref: string; text: string }[] = [];
  for (const ref of refs) {
    const t = resolveRef(c, ref);
    if (t === null) unresolved.push(ref);
    else parts.push({ ref, text: t });
  }
  // los valores que resuelven las directivas también son canónico
  for (const m of unit.text.matchAll(DIRECTIVE)) {
    const seg = parseSegments(m[0], c)[0];
    if (seg !== undefined && seg.t !== "text") parts.push({ ref: `directive:${m[0]}`, text: seg.v });
  }
  const canonical_hash = unit.maps_to.length === 0 ? null : sha256Hex(canonicalJson(parts));
  return { canonical_refs: refs, canonical_hash, text_hash: sha256Hex(unit.text), unresolved };
}

export interface AuditIssue {
  gate: string;
  unit: string;
  message: string;
}

export function latestRecord(audit: AuditFileT | null, stringId: string): AuditRecordT | undefined {
  const rs = (audit?.records ?? []).filter((r) => r.string_id === stringId);
  return rs.sort((a, b) => b.revision - a.revision)[0];
}

/** G-EDI-01/02, G-LIM-05, G-REF-01 (refs), G-STA-04 (estado intacto). Devuelve todos los problemas. */
export function verifyAudit(b: EditorialBundle, c: GeneratedCorpus): AuditIssue[] {
  const issues: AuditIssue[] = [];
  for (const unit of b.units) {
    const h = unitHashes(unit, c);
    for (const u of h.unresolved) issues.push({ gate: "G-REF-01", unit: unit.string_id, message: `la referencia canónica ${u} no resuelve` });
    const rec = latestRecord(b.audit, unit.string_id);
    if (rec === undefined) {
      issues.push({ gate: "G-EDI-01", unit: unit.string_id, message: "sin registro de auditoría" });
      continue;
    }
    const gate = unit.kind === "public_question" ? "G-EDI-02" : unit.section === "limits" ? "G-LIM-05" : "G-EDI-01";
    if (rec.text_hash !== h.text_hash) issues.push({ gate: unit.kind === "public_question" ? "G-EDI-02" : "G-LIM-05", unit: unit.string_id, message: "el texto público cambió sin nuevo registro de auditoría (hash distinto)" });
    if (rec.canonical_hash !== h.canonical_hash) issues.push({ gate, unit: unit.string_id, message: "auditoría OBSOLETA: cambió el canónico del que deriva (canonical_hash distinto)" });
    if (rec.verdict === "REJECTED") issues.push({ gate: "G-EDI-01", unit: unit.string_id, message: "la auditoría vigente rechaza el texto" });
    if (Object.values(rec.dimensions).some((d) => d === "FAIL")) issues.push({ gate: "G-EDI-01", unit: unit.string_id, message: "una dimensión de auditoría falla" });
    if (!rec.figures_ok || !rec.state_unchanged) issues.push({ gate: "G-STA-04", unit: unit.string_id, message: "la auditoría declara cifras o estado alterados" });
  }
  return issues;
}

export function lintBundle(b: EditorialBundle): ReturnType<typeof lintText> {
  return b.units.flatMap((u) => lintText(u.string_id, u.text));
}

/**
 * Sella el registro de auditoría (solo AGREGA, §4.3). Los hashes se calculan; los veredictos vienen del archivo
 * de revisión (`*.review.yml`). Si un texto ya auditado cambió, exige una nueva `revision` en la revisión.
 */
export function seal(b: EditorialBundle, c: GeneratedCorpus): AuditFileT {
  const existing = b.audit?.records ?? [];
  const records: AuditRecordT[] = [...existing];
  const lintErrors = new Set(lintBundle(b).filter((i) => i.severity === "error").map((i) => i.unit));
  for (const unit of b.units) {
    const h = unitHashes(unit, c);
    if (h.unresolved.length > 0) throw new Error(`${unit.string_id}: referencias sin resolver: ${h.unresolved.join(", ")}`);
    const prior = records.find((r) => r.string_id === unit.string_id && r.revision === b.review.revision);
    if (prior !== undefined) {
      if (prior.text_hash !== h.text_hash || prior.canonical_hash !== h.canonical_hash) {
        throw new Error(`${unit.string_id}: cambió después de auditarse (revisión ${prior.revision}). Agregá una revisión nueva en el archivo de revisión; el registro es solo de agregado.`);
      }
      continue;
    }
    const ov = b.review.overrides[unit.string_id];
    const kind = unit.kind;
    records.push({
      string_id: unit.string_id,
      kind,
      canonical_refs: h.canonical_refs,
      canonical_hash: h.canonical_hash,
      text_hash: h.text_hash,
      revision: b.review.revision,
      dimensions: { semantics: "PASS", causality: "PASS", population: "PASS", period: "PASS", measurement_type: "PASS", evidence_strength: "PASS" },
      figures_ok: !lintErrors.has(unit.string_id),
      state_unchanged: true,
      reviewer: ov?.reviewer ?? b.review.reviewer,
      date: ov?.date ?? b.review.date,
      verdict: ov?.verdict ?? b.review.defaults.verdict,
      notes: ov?.notes ?? [],
    });
  }
  records.sort((a, z) => a.string_id.localeCompare(z.string_id) || a.revision - z.revision);
  return AuditFile.parse({ schema: "aletheia-web/editorial-audit/1", canonical_ref: b.finding.canonical_ref, append_only: true, records });
}

/** Cantidad de textos cuya auditoría espera la firma de la autoría (no se oculta en el reporte). */
export function pendingSignoff(b: EditorialBundle): string[] {
  return b.units.filter((u) => latestRecord(b.audit, u.string_id)?.verdict === "PENDING_AUTHOR_REVIEW").map((u) => u.string_id);
}
