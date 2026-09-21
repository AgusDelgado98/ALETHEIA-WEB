import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadGenerated } from "../corpus/load.ts";

/**
 * Auditoría de candidatos a Figure (ADR-WEB3-01). SOLO LECTURA: no escribe nada, no calcula nada.
 * Detecta, por regla mecánica, qué cantidades aparecen con el mismo valor y la misma unidad en el texto del claim
 * y en el texto de una evidencia vigente (doble testigo, Data Contract §9.2.4). Es un DETECTOR de candidatos: que una
 * coincidencia sea una Figure válida lo decide la revisión de contexto documentada en docs/web-3/FIGURES-AUDIT.md.
 */

export interface Quantity {
  sign: "+" | "-" | "";
  magnitude: string;
  unit: "%" | "pp" | "";
  raw: string;
  context: string;
}

/** Número con separador de miles (`1,678,677`) o con unidad (`%`, `pp`, `percentage points`). Excluye fechas e IDs. */
const QUANTITY =
  /(?<![\w.-])([+\-−±]?)(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?(?:\s?(%|pp|percentage[ -]points?))?(?![\w-]|\.\d)/g;

export function quantities(text: string): Quantity[] {
  const out: Quantity[] = [];
  for (const m of text.matchAll(QUANTITY)) {
    const unit = m[4] === undefined ? "" : m[4].startsWith("p") ? "pp" : "%";
    const hasThousands = (m[2] ?? "").includes(",");
    if (unit === "" && !hasThousands) continue;
    const at = m.index ?? 0;
    const sign = m[1] === "+" ? "+" : m[1] === "-" || m[1] === "−" ? "-" : "";
    out.push({
      sign,
      magnitude: `${(m[2] ?? "").replace(/,/g, "")}${m[3] ?? ""}`,
      unit,
      raw: m[0],
      context: text.slice(Math.max(0, at - 50), at + m[0].length + 30).replace(/\s+/g, " "),
    });
  }
  return out;
}

export interface Candidate {
  claimId: string;
  evidenceId: string;
  magnitude: string;
  unit: string;
  claimSign: string;
  evidenceSign: string;
  claimContext: string;
  evidenceContext: string;
}

export interface ClaimAudit {
  claimId: string;
  questionId: string;
  claimKind: string;
  state: string;
  candidates: Candidate[];
  claimOnly: string[];
  evidenceOnly: string[];
  supersededMatches: string[];
}

interface Supersession {
  claim_id: string;
  replaced_evidence_id: string;
}

export function auditFigures(root: string): ClaimAudit[] {
  const c = loadGenerated(root);
  const contract = JSON.parse(
    readFileSync(join(root, "modules", "labor.contract.json"), "utf8"),
  ) as {
    claim_supersessions: Supersession[];
  };
  const replaced = new Set(contract.claim_supersessions.map((s) => s.replaced_evidence_id));
  return c.claims.map((claim) => {
    const cq = quantities(claim.canonical_text);
    const evidences = c.evidence.filter((e) => e.claim_id === claim.id);
    const valid = evidences.filter((e) => !replaced.has(e.id));
    const candidates: Candidate[] = [];
    const seen = new Set<string>();
    for (const e of valid) {
      const eq = quantities(e.result_text);
      for (const q of cq) {
        const hit = eq.find((x) => x.magnitude === q.magnitude && x.unit === q.unit);
        if (hit === undefined) continue;
        seen.add(`${q.magnitude}${q.unit}`);
        candidates.push({
          claimId: claim.id,
          evidenceId: e.id,
          magnitude: q.magnitude,
          unit: q.unit,
          claimSign: q.sign,
          evidenceSign: hit.sign,
          claimContext: q.context,
          evidenceContext: hit.context,
        });
      }
    }
    const validKeys = new Set(
      valid.flatMap((e) => quantities(e.result_text).map((x) => `${x.magnitude}${x.unit}`)),
    );
    const supersededMatches = evidences
      .filter((e) => replaced.has(e.id))
      .flatMap((e) => quantities(e.result_text))
      .filter((x) => cq.some((q) => q.magnitude === x.magnitude && q.unit === x.unit))
      .filter((x) => !validKeys.has(`${x.magnitude}${x.unit}`))
      .map((x) => `${x.magnitude}${x.unit}`);
    return {
      claimId: claim.id,
      questionId: claim.question_id,
      claimKind: claim.claim_kind,
      state: claim.epistemic_state,
      candidates,
      claimOnly: cq.filter((q) => !seen.has(`${q.magnitude}${q.unit}`)).map((q) => q.raw),
      evidenceOnly: [
        ...new Set(
          valid
            .flatMap((e) => quantities(e.result_text))
            .filter((x) => !cq.some((q) => q.magnitude === x.magnitude && q.unit === x.unit))
            .map((x) => x.raw),
        ),
      ],
      supersededMatches: [...new Set(supersededMatches)],
    };
  });
}

if (
  import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` ||
  process.argv[1]?.endsWith("audit.ts")
) {
  const audits = auditFigures(process.cwd());
  if (process.argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify(audits, null, 2)}\n`);
  } else {
    for (const a of audits) {
      process.stdout.write(
        `\n${a.claimId} · ${a.questionId} · ${a.claimKind} · ${a.state}\n` +
          `  coincidencias claim↔evidencia vigente: ${a.candidates.length}\n`,
      );
      for (const k of a.candidates)
        process.stdout.write(
          `    [${k.evidenceId}] ${k.claimSign}${k.magnitude}${k.unit}  (evidencia: ${k.evidenceSign || "sin signo"})\n` +
            `        claim: «${k.claimContext}»\n        evid.: «${k.evidenceContext}»\n`,
        );
      if (a.claimOnly.length > 0)
        process.stdout.write(`  solo en el claim (1 testigo): ${a.claimOnly.join(" ")}\n`);
      if (a.evidenceOnly.length > 0)
        process.stdout.write(`  solo en la evidencia (1 testigo): ${a.evidenceOnly.join(" ")}\n`);
      if (a.supersededMatches.length > 0)
        process.stdout.write(
          `  coincidencias solo con evidencia REEMPLAZADA (rechazadas): ${a.supersededMatches.join(" ")}\n`,
        );
    }
  }
}
