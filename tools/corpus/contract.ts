import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const witness = z.strictObject({
  source: z.enum(["claim", "evidence_root", "episode"]),
  id: z.string().min(1),
  field: z.string().min(1),
  regex: z.string().min(1),
});

/**
 * Testigo de una Figure (ADR-WEB3-01 D1/D7). `pattern` es una expresión regular con grupos con nombre:
 * `value` (obligatorio), `sign` o `verb` (opcionales) y, si atestigua el período, `start` (y `end`).
 * `period_pattern` atestigua el período por separado (en `period_field`, por defecto el mismo campo).
 */
const figureWitness = z.strictObject({
  source: z.enum(["claim", "evidence"]),
  id: z.string().min(1),
  field: z.enum(["CLAIM_TEXT", "RESULT"]),
  pattern: z.string().min(1),
  period_field: z.enum(["CLAIM_TEXT", "RESULT", "METRIC"]).optional(),
  period_pattern: z.string().min(1).optional(),
});

const figureBase = {
  key: z.string().regex(/^[a-z0-9_]+$/),
  claim_id: z.string().regex(/^LAB-CLM-[0-9]{4}$/),
  question_id: z.string().regex(/^LAB-Q-[0-9]{4}$/),
  value_text: z.string().regex(/^[0-9]+(\.[0-9]+)?$/),
  unit: z.enum(["pct", "pp", "count"]),
};

/** `ELIGIBLE` y `PENDING_REVIEW`: se verifican en el build. Solo `ELIGIBLE` se materializa. */
const verifiedFigureSpec = z.strictObject({
  ...figureBase,
  status: z.enum(["ELIGIBLE", "PENDING_REVIEW"]),
  sign: z.enum(["+", "-", "none"]),
  metric_key: z.string().regex(/^[a-z0-9_]+$/),
  object_ids: z.array(z.string().regex(/^LAB-OBJ-[0-9]{4}$/)).min(1),
  period: z.strictObject({
    start: z.string().min(1),
    end: z.string().min(1),
    granularity: z.enum(["month", "quarter", "year", "date"]),
  }),
  /** `CONTAINED`: un testigo da el período con menos granularidad (p. ej. el año del mes). Nunca `ELIGIBLE`. */
  period_compat: z.enum(["EXACT", "CONTAINED"]),
  /** `POSITIONAL`: el testigo asocia la cifra a su objeto/período solo por orden en la frase. Nunca `ELIGIBLE`. */
  pairing: z.enum(["EXPLICIT", "POSITIONAL"]),
  nominal_real: z.enum(["NOMINAL", "REAL", "NA"]),
  stock_flow: z.enum(["STOCK", "FLOW", "NA"]),
  display: z.strictObject({
    decimals: z.number().int().min(0).max(4),
    sign: z.enum(["explicit", "none"]),
  }),
  witness_a: figureWitness,
  witness_b: figureWitness,
  review_note: z.string().min(1).optional(),
});

/** `REJECTED`: decisión registrada de no publicar. Sin testigos: nunca se extrae ni se materializa. */
const rejectedFigureSpec = z.strictObject({
  ...figureBase,
  status: z.literal("REJECTED"),
  reason: z.enum([
    "SINGLE_WITNESS",
    "RANGE_OR_APPROXIMATE",
    "DIFFERENT_CONTEXT",
    "SUPERSEDED_EVIDENCE",
  ]),
  note: z.string().min(1),
});

export const FigureSpec = z.union([verifiedFigureSpec, rejectedFigureSpec]);
export type FigureSpecT = z.infer<typeof FigureSpec>;
export type VerifiedFigureSpecT = z.infer<typeof verifiedFigureSpec>;
export type FigureWitnessSpecT = z.infer<typeof figureWitness>;

/** Contrato de módulo (`modules/<módulo>.contract.json`, Data Contract §7.12). Lo revisa una persona. */
export const ModuleContract = z.strictObject({
  schema: z.literal("aletheia-web/module-contract/1"),
  module_id: z.literal("labor"),
  title: z.string(),
  version: z.string(),
  status: z.enum(["FROZEN", "LIVE"]),
  schema_version: z.string(),
  pin: z.string(),
  repo: z.strictObject({ repo_id: z.string(), tag: z.string(), commit: z.string() }),
  consumed_paths: z.array(z.string()).min(1),
  slice: z.strictObject({
    note: z.string(),
    question_ids: z.array(z.string()).min(1),
  }),
  corpus_expected_counts: z.strictObject({
    note: z.string(),
    questions: z.number(),
    questions_by_regime: z.record(z.string(), z.number()),
    claims: z.number(),
    claims_by_regime: z.record(z.string(), z.number()),
    hypotheses: z.number(),
    evidence: z.number(),
    evidence_linked_to_claim: z.number(),
    evidence_diagnostic_only: z.number(),
    evidence_roots: z.number(),
    statistical_objects: z.number(),
    governance_rulings: z.number(),
    relations: z.number(),
    relations_by_category: z.record(z.string(), z.number()),
    preserved_results: z.number(),
    claim_states: z.record(z.string(), z.number()),
    questions_with_claims: z.number(),
    questions_without_claims: z.array(z.string()),
    questions_with_multiple_claims: z.array(z.string()),
    hypotheses_without_claim: z.array(z.string()),
    limitations_claims: z.number(),
    limitations_questions: z.number(),
  }),
  slice_expected_counts: z.strictObject({
    note: z.string(),
    questions: z.number(),
    claims: z.number(),
    hypotheses: z.number(),
    evidence: z.number(),
    evidence_roots: z.number(),
    statistical_objects: z.number(),
    governance_rulings: z.number(),
    episodes: z.number(),
    limitations: z.strictObject({
      claim: z.number(),
      question: z.number(),
      evidence: z.number(),
    }),
    blockers: z.number(),
    anchors: z.number(),
    figures: z.number(),
    relations: z.number(),
    preserved_results: z.number(),
  }),
  vocabularies: z.strictObject({
    claim_lifecycle_state: z.array(z.string()),
    claim_lifecycle_state_note: z.string(),
    question_documentary_label: z.array(z.string()),
    claim_kind: z.array(z.string()),
  }),
  invariants: z.record(z.string(), z.number()),
  blocker_specs: z.record(
    z.string(),
    z.strictObject({
      marker_source: z.literal("CLAIM_TEXT"),
      witness_source: z.literal("EVIDENCE_RESULT"),
      expected_count: z.number(),
      end_marker: z.string().min(1),
      witness_end_marker: z.string().min(1),
      blockers: z.array(
        z.strictObject({ ordinal: z.number(), kind: z.string(), label_prefix: z.string() }),
      ),
    }),
  ),
  anchor_specs: z.array(
    z.strictObject({
      key: z.string(),
      claim_id: z.string(),
      kind: z.enum(["PERIOD_MONTH", "DATE"]),
      display_style: z.enum(["month-long", "date-long"]),
      witnesses: z.array(witness).min(2),
    }),
  ),
  figure_specs: z.array(FigureSpec),
  claim_supersessions: z.array(
    z.strictObject({
      claim_id: z.string(),
      replaced_evidence_id: z.string(),
      superseding_evidence_id: z.string(),
      corpus_quote: z.string().min(1),
    }),
  ),
});
export type ModuleContractT = z.infer<typeof ModuleContract>;

export function loadContract(
  root: string,
  moduleId: string,
): { contract: ModuleContractT; raw: Buffer } {
  const raw = readFileSync(join(root, "modules", `${moduleId}.contract.json`));
  return { contract: ModuleContract.parse(JSON.parse(raw.toString("utf8"))), raw };
}
