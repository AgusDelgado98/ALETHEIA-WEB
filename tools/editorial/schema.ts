import { z } from "zod";

/**
 * Esquemas estrictos de la capa editorial (WEB-0 Editorial Contract §3). Son `strictObject`: un campo de
 * ESTADO (`state`, `status`, `epistemic_state`, `resolution`…) en editorial es un error de esquema (G-STA-04).
 */
export const Unit = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  text: z.string().min(1),
  maps_to: z.array(z.string().min(1)),
});
export type UnitT = z.infer<typeof Unit>;

const rev = z.number().int().min(1);

export const QuestionEditorial = z.strictObject({
  schema: z.literal("aletheia-web/editorial-question/1"),
  canonical_ref: z.string().min(1),
  revision: rev,
  public_question: z.string().min(1),
  editorial_transform: z.boolean(),
  approval: z.strictObject({ source: z.string(), approved_by: z.literal("author"), audit_report: z.string() }),
});

export const Finding = z.strictObject({
  schema: z.literal("aletheia-web/editorial-finding/1"),
  canonical_ref: z.string().min(1),
  claim_ref: z.string().min(1),
  revision: rev,
  title: Unit,
  intro: Unit,
  scope: Unit,
  can_say: z.array(Unit).min(1),
  does_not_mean: z.array(Unit).min(1),
  would_need: z.array(Unit).min(1),
  trail: z.strictObject({ claim: Unit, hypothesis: Unit, evidence: Unit, object_employment: Unit, object_registration: Unit }),
  blockers_at_cut: z.array(z.string()),
});
export type FindingT = z.infer<typeof Finding>;

export const LIMIT_CLASSES = ["SCOPE", "POPULATION", "PERIOD", "MEASUREMENT", "CAUSAL", "INDEPENDENCE", "COMPARABILITY", "DATA_QUALITY", "PROCEDURAL"] as const;

export const Limits = z.strictObject({
  schema: z.literal("aletheia-web/editorial-limits/1"),
  canonical_ref: z.string().min(1),
  revision: rev,
  dispositions: z.array(
    z.strictObject({
      limitation: z.string().min(1),
      class: z.enum(LIMIT_CLASSES),
      disposition: z.enum(["SHOWN", "AUDIT_ONLY"]),
      public_refs: z.array(z.string()).optional(),
      waiver_reason: z.string().optional(),
    }),
  ),
});
export type LimitsT = z.infer<typeof Limits>;

const labeled = z.strictObject({ id: z.string().regex(/^[a-z0-9-]+$/), text: z.string().min(1) });

export const States = z.strictObject({
  schema: z.literal("aletheia-web/editorial-states/1"),
  revision: rev,
  claim_state_labels: z.record(z.string(), labeled),
  question_resolution_labels: z.record(z.string(), labeled),
  fixed: z.strictObject({ absence_not_negative: labeled }),
});
export type StatesT = z.infer<typeof States>;

export const Ui = z.strictObject({
  schema: z.literal("aletheia-web/editorial-ui/1"),
  revision: rev,
  strings: z.record(z.string(), labeled),
});
export type UiT = z.infer<typeof Ui>;

// ───────────────────────── auditoría (§4.1) ─────────────────────────

export const AUDIT_DIMENSIONS = ["semantics", "causality", "population", "period", "measurement_type", "evidence_strength"] as const;
const dim = z.enum(["PASS", "FAIL"]);

export const AuditRecord = z.strictObject({
  string_id: z.string().min(1),
  kind: z.enum(["public_question", "finding_text", "limit_waiver", "state_label", "fixed_text", "ui_label"]),
  canonical_refs: z.array(z.string()),
  /** sha256 del canónico atado; `null` solo para etiquetas de interfaz sin canónico. */
  canonical_hash: z.string().regex(/^[0-9a-f]{64}$/).nullable(),
  text_hash: z.string().regex(/^[0-9a-f]{64}$/),
  revision: rev,
  dimensions: z.strictObject({
    semantics: dim,
    causality: dim,
    population: dim,
    period: dim,
    measurement_type: dim,
    evidence_strength: dim,
  }),
  figures_ok: z.boolean(),
  state_unchanged: z.boolean(),
  reviewer: z.string().min(1),
  date: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/),
  verdict: z.enum(["APPROVED", "REVISED_AND_APPROVED", "REJECTED", "PENDING_AUTHOR_REVIEW"]),
  notes: z.array(z.string()),
});
export type AuditRecordT = z.infer<typeof AuditRecord>;

export const AuditFile = z.strictObject({
  schema: z.literal("aletheia-web/editorial-audit/1"),
  canonical_ref: z.string().min(1),
  append_only: z.literal(true),
  records: z.array(AuditRecord),
});
export type AuditFileT = z.infer<typeof AuditFile>;

export const Review = z.strictObject({
  schema: z.literal("aletheia-web/editorial-review/1"),
  canonical_ref: z.string().min(1),
  revision: rev,
  reviewer: z.string().min(1),
  date: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/),
  independence_declaration: z.string().min(1),
  adversarial_review: z.array(z.string()).min(1),
  defaults: z.strictObject({ verdict: z.enum(["APPROVED", "REVISED_AND_APPROVED", "REJECTED", "PENDING_AUTHOR_REVIEW"]) }),
  overrides: z.record(
    z.string(),
    z.strictObject({
      verdict: z.enum(["APPROVED", "REVISED_AND_APPROVED", "REJECTED", "PENDING_AUTHOR_REVIEW"]).optional(),
      reviewer: z.string().optional(),
      date: z.string().optional(),
      notes: z.array(z.string()),
    }),
  ),
});
export type ReviewT = z.infer<typeof Review>;
