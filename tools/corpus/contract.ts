import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const witness = z.strictObject({
  source: z.enum(["claim", "evidence_root", "episode"]),
  id: z.string().min(1),
  field: z.string().min(1),
  regex: z.string().min(1),
});

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
