import { z } from "zod";

/**
 * Esquemas estrictos del corpus web (WEB-0 Data Contract §5–§8, §12). Zod solo corre en build/validación:
 * no se envía al cliente. Ninguna entidad admite campos desconocidos (G-SCH-01).
 */

export const HEX40 = /^[0-9a-f]{40}$/;
export const HEX64 = /^[0-9a-f]{64}$/;
const hex40 = z.string().regex(HEX40);
const hex64 = z.string().regex(HEX64);
const semver = z.string().regex(/^[0-9]+\.[0-9]+\.[0-9]+$/);
const nonEmpty = z.string().min(1);

/** Patrones de ID del corpus (G-SCH-02). Los IDs DERIVED se recomputan, no se validan solo por patrón. */
export const ID_PATTERNS = {
  question: /^LAB-Q-[0-9]{4}$/,
  claim: /^LAB-CLM-[0-9]{4}$/,
  hypothesis: /^LAB-HYP-[0-9]{4}$/,
  evidence: /^LAB-EVD-[0-9]{4}$/,
  root: /^LAB-ROOT-[0-9]{4}$/,
  object: /^LAB-OBJ-[0-9]{4}$/,
  ruling: /^LAB-GOV-[A-Z0-9-]+$/,
  episode: /^EP-[0-9]{4}-[A-Z]{3,}$/,
  relation: /^REL-[A-Z]+-[0-9]{3}$/,
  preserved: /^KEEP-[0-9]{3}$/,
  limitation: /^lim\.[A-Z0-9-]+\.[0-9a-f]{8}$/,
  blocker: /^blk\.LAB-CLM-[0-9]{4}\.[0-9]+\.[0-9a-f]{8}$/,
  anchor: /^anc\.LAB-CLM-[0-9]{4}\.[a-z0-9_]+$/,
} as const;

// ───────────────────────── vocabularios ─────────────────────────

/** Estado epistemológico de un CLAIM. `BLOCKED_BY_DESIGN`, `OUTSIDE_LAB_A` y `NOT_IDENTIFIABLE` NO pertenecen aquí (G-STA-03). */
export const CLAIM_LIFECYCLE_STATES = [
  "OBSERVED_IN_SOURCE",
  "REFUTED_WITHIN_SCOPE",
  "INSUFFICIENT_EVIDENCE",
  "ESTABLISHED_WITHIN_SCOPE",
  "CONVERGENT",
  "DIVERGENT",
] as const;
export const ClaimEpistemicState = z.enum(CLAIM_LIFECYCLE_STATES);
export type ClaimEpistemicStateValue = z.infer<typeof ClaimEpistemicState>;

export const DOCUMENTARY_LABELS = [
  "NOT_IDENTIFIABLE",
  "BLOCKED_BY_DESIGN",
  "OUTSIDE_LAB_A",
] as const;
export const CLAIM_KINDS = [
  "STATISTICAL_MEASUREMENT",
  "SCOPING_OR_EXISTENCE_FINDING",
  "REGULATORY_TEXT_MAPPING",
  "DESIGN_STAGE_ANALYSIS_NOT_A_MEASUREMENT",
  "HYPOTHESIS_NOT_COMPUTABLE",
  "SOURCE_AVAILABILITY_FINDING",
] as const;

// ───────────────────────── provenance (§5) ─────────────────────────

export const Provenance = z.strictObject({
  source_repo: z.enum(["ALETHEIA-LABOR", "ALETHEIA-V1"]),
  tag: nonEmpty,
  commit: hex40,
  source_path: nonEmpty,
  source_id: nonEmpty.nullable(),
  source_pointer: z.string().startsWith("/"),
  blob_sha: hex40,
  /** SOLO hashes que el propio corpus registró (G-PRV-02). Vacío si el corpus no registró ninguno. */
  recorded_hashes: z.array(z.strictObject({ file: nonEmpty, sha256: hex64 })),
  /** sha256 de los bytes extraídos; NO es el hash del dato crudo original. */
  extracted_sha256: hex64,
  generator_version: semver,
});
export type ProvenanceT = z.infer<typeof Provenance>;

const idOrigin = z.enum(["CORPUS", "DERIVED"]);
const globalId = z.string().regex(/^labor\/[A-Za-z0-9._-]+$/);

// ───────────────────────── answerability (§12) ─────────────────────────

export const Answerability = z.strictObject({
  answer_kind: z.enum(["MEASUREMENT", "DOCUMENTARY_FINDING", "ABSENCE", "NOT_ANSWERABLE"]),
  answerable_from_corpus: z.boolean(),
  required_qualifiers: z.array(z.string()),
  forbidden_inferences: z.array(z.string()),
  citation: z.strictObject({ global_id: globalId, permalink_version: nonEmpty }),
});

// ───────────────────────── pregunta: resolución (§8) ─────────────────────────

export const QUESTION_RESOLUTION_VALUES = [
  ...CLAIM_LIFECYCLE_STATES,
  ...DOCUMENTARY_LABELS,
] as const;

/**
 * `question_resolution` es un campo DISTINTO de `claim_epistemic_state` (§8). Su vocabulario declara de dónde
 * sale el valor: un valor de ciclo de vida solo puede provenir de un claim; una etiqueta documental nunca
 * puede declararse como estado de ciclo de vida.
 */
export const QuestionResolution = z
  .strictObject({
    value: z.enum(QUESTION_RESOLUTION_VALUES),
    vocabulary: z.enum([
      "CLAIM_LIFECYCLE_STATE",
      "CLAIM_LIFECYCLE_STATE_RECORDED_AS_QUESTION_LEDGER_STATUS",
      "DOCUMENTED_REGIME_A_CLOSEOUT_LABEL_NOT_A_LIFECYCLE_STATE",
    ]),
    basis: z.enum(["CLAIM", "QUESTION_LEDGER", "REGIME_CLOSEOUT"]),
    basis_refs: z.array(nonEmpty),
  })
  .superRefine((r, ctx) => {
    const isDocumentary = (DOCUMENTARY_LABELS as readonly string[]).includes(r.value);
    if (r.vocabulary === "CLAIM_LIFECYCLE_STATE") {
      if (isDocumentary)
        ctx.addIssue({ code: "custom", message: `${r.value} no es un estado de ciclo de vida` });
      if (r.basis !== "CLAIM")
        ctx.addIssue({
          code: "custom",
          message: "un valor de ciclo de vida solo puede basarse en un CLAIM",
        });
      if (r.basis_refs.length === 0)
        ctx.addIssue({
          code: "custom",
          message: "basis CLAIM exige basis_refs (0..N claims, al menos uno)",
        });
    } else if (r.basis === "CLAIM") {
      ctx.addIssue({
        code: "custom",
        message: "una etiqueta documental no puede basarse en un CLAIM",
      });
    }
  });
export type QuestionResolutionT = z.infer<typeof QuestionResolution>;

// ───────────────────────── entidades canónicas (§7) ─────────────────────────

const base = {
  global_id: globalId,
  id_origin: idOrigin,
  provenance: Provenance,
};

export const Question = z.strictObject({
  id: z.string().regex(ID_PATTERNS.question),
  ...base,
  regime: z.enum(["A", "B", "C"]),
  class: z.enum(["DESCRIPTIVE", "COMPARATIVE", "CAUSAL"]),
  canonical_text: nonEmpty,
  canonical_title: nonEmpty,
  /** Estado registrado en el ledger. Se conserva y NUNCA se muestra como resultado (Charter §20.3.4). */
  ledger_status: nonEmpty,
  /** 0..N. `questions : claims` no es 1:1. */
  claim_ids: z.array(z.string().regex(ID_PATTERNS.claim)),
  hypothesis_ids: z.array(z.string().regex(ID_PATTERNS.hypothesis)),
  object_ids: z.array(z.string().regex(ID_PATTERNS.object)),
  identification_requirements: z.array(nonEmpty),
  known_breaks: z.array(nonEmpty),
  causal_identification_status: nonEmpty.nullable(),
  limitation_ids: z.array(z.string().regex(ID_PATTERNS.limitation)),
  resolution: QuestionResolution,
  absent_vs_negative: z.enum([
    "ABSENT_NOT_NEGATIVE",
    "NEGATIVE_WITHIN_SCOPE",
    "OBSERVATION_WITHIN_SCOPE",
    "NOT_A_MEASUREMENT_OF_THE_LABOUR_MARKET",
  ]),
  preserved_result_ids: z.array(z.string().regex(ID_PATTERNS.preserved)),
  answerability: Answerability,
});
export type QuestionT = z.infer<typeof Question>;

export const Claim = z.strictObject({
  id: z.string().regex(ID_PATTERNS.claim),
  ...base,
  /** Exactamente 1 pregunta por claim. */
  question_id: z.string().regex(ID_PATTERNS.question),
  hypothesis_id: z.string().regex(ID_PATTERNS.hypothesis).nullable(),
  epistemic_state: ClaimEpistemicState,
  claim_kind: z.enum(CLAIM_KINDS),
  absent_vs_negative: z.enum([
    "ABSENT_NOT_NEGATIVE",
    "NEGATIVE_WITHIN_SCOPE",
    "OBSERVATION_WITHIN_SCOPE",
    "NOT_A_MEASUREMENT_OF_THE_LABOUR_MARKET",
  ]),
  canonical_text: nonEmpty,
  scope_statement: nonEmpty,
  what_would_unseat: nonEmpty,
  limitation_ids: z.array(z.string().regex(ID_PATTERNS.limitation)),
  evidence_ids: z.array(z.string().regex(ID_PATTERNS.evidence)),
  object_ids: z.array(z.string().regex(ID_PATTERNS.object)),
  root_ids: z.array(z.string().regex(ID_PATTERNS.root)),
  /** Raíces citadas por ID explícito en el texto del claim (no en `ROOT_IDS`). Base: cita textual. */
  referenced_root_ids: z.array(z.string().regex(ID_PATTERNS.root)),
  deflator_root_ids: z.array(z.string().regex(ID_PATTERNS.root)),
  lab_gov: z.array(nonEmpty),
  v1_gov: z.array(nonEmpty),
  not_eligible_for: z.array(nonEmpty),
  lineage_independence: nonEmpty,
  scope_coverage_adequacy: nonEmpty,
  shared_coverage_bias: nonEmpty.nullable(),
  /** Texto tal cual (`"ARCA"`, `"EPH+IPC"`): NO es una clave de join. */
  source_label: nonEmpty,
  /** Sin cifras estructuradas en este corte: `figure_ids` debe estar vacío (no se inventan Figures). */
  figure_ids: z.array(nonEmpty).max(0),
  blocker_ids: z.array(z.string().regex(ID_PATTERNS.blocker)),
  answerability: Answerability,
});
export type ClaimT = z.infer<typeof Claim>;

export const Hypothesis = z.strictObject({
  id: z.string().regex(ID_PATTERNS.hypothesis),
  ...base,
  question_id: z.string().regex(ID_PATTERNS.question),
  object_ids: z.array(z.string().regex(ID_PATTERNS.object)),
  population: nonEmpty,
  period: nonEmpty,
  prior_data_exposure: z.enum(["DIRECT", "INDIRECT", "NONE"]),
  disclosure_required: z.boolean(),
  metric: nonEmpty,
  operational_definition: nonEmpty,
  expected_observation: nonEmpty,
  failure_condition: nonEmpty,
  candidate_sources: z.array(nonEmpty),
  known_breaks: z.array(nonEmpty),
  /** Marcador de categoría congelado al registrar: NO es un resultado. */
  registry_status: nonEmpty,
  claim_ids: z.array(z.string().regex(ID_PATTERNS.claim)),
  effective_outcome: z.array(z.enum(CLAIM_LIFECYCLE_STATES)),
});
export type HypothesisT = z.infer<typeof Hypothesis>;

export const Evidence = z.strictObject({
  id: z.string().regex(ID_PATTERNS.evidence),
  ...base,
  claim_id: z.string().regex(ID_PATTERNS.claim).nullable(),
  /** Null en evidencia DIAGNOSTIC_ONLY que el registro no ata a una pregunta. */
  question_id: z.string().regex(ID_PATTERNS.question).nullable(),
  hypothesis_id: z.string().regex(ID_PATTERNS.hypothesis).nullable(),
  diagnostic_only: z.boolean(),
  object_ids: z.array(z.string().regex(ID_PATTERNS.object)),
  source_label: nonEmpty,
  root_ids: z.array(z.string().regex(ID_PATTERNS.root)),
  method: nonEmpty,
  metric: nonEmpty,
  /** Texto libre del corpus: no se parsea como fuente de cifras. */
  result_text: nonEmpty,
  reproducibility: nonEmpty,
  status: nonEmpty,
  limitation_ids: z.array(z.string().regex(ID_PATTERNS.limitation)),
});
export type EvidenceT = z.infer<typeof Evidence>;

export const EvidenceRoot = z.strictObject({
  id: z.string().regex(ID_PATTERNS.root),
  ...base,
  publication: nonEmpty,
  dataset_release: nonEmpty,
  primary_producer: nonEmpty,
  collection_instrument: nonEmpty,
  frame_population: nonEmpty,
  period: nonEmpty,
  transformations: z.array(nonEmpty),
  statistical_object: z.string().regex(ID_PATTERNS.object),
  independence_class: nonEmpty,
  relative_to_root_id: z.string().regex(ID_PATTERNS.root).nullable(),
  shared_coverage_bias: nonEmpty,
  is_deflator: z.boolean(),
  /** Sin registro directo raíz→fuente: lista vacía y estado UNRESOLVED (§13.1). Nunca se infiere por nombre. */
  source_links: z.array(
    z.strictObject({
      source_id: nonEmpty,
      link_basis: z.enum(["SHA256_EQUALITY", "EXPLICIT_RECORD"]),
    }),
  ),
  source_link_status: z.enum(["RESOLVED", "UNRESOLVED"]),
});
export type EvidenceRootT = z.infer<typeof EvidenceRoot>;

export const StatisticalObject = z.strictObject({
  id: z.string().regex(ID_PATTERNS.object),
  ...base,
  name: nonEmpty,
  unit: nonEmpty,
  population: nonEmpty,
  universe: nonEmpty,
  grain: nonEmpty,
  producer: nonEmpty,
  observation_mechanism: nonEmpty,
  is: nonEmpty,
  is_not: z.array(nonEmpty),
  status: nonEmpty,
  v1_references: z.array(nonEmpty),
});
export type StatisticalObjectT = z.infer<typeof StatisticalObject>;

export const Limitation = z.strictObject({
  id: z.string().regex(ID_PATTERNS.limitation),
  ...base,
  owner_kind: z.enum(["claim", "question", "evidence"]),
  owner_id: nonEmpty,
  ordinal: z.number().int().min(1),
  /** Verbatim del corpus. No lleva clasificación ni disposición: eso es editorial (§7.8). */
  text: nonEmpty,
  origin_path: nonEmpty,
});
export type LimitationT = z.infer<typeof Limitation>;

export const Blocker = z.strictObject({
  id: z.string().regex(ID_PATTERNS.blocker),
  ...base,
  claim_id: z.string().regex(ID_PATTERNS.claim),
  ordinal: z.number().int().min(1),
  kind: z.enum(["STOCK_VS_FLOW", "EMPLOYMENT_RELATIONSHIP_COVERAGE", "NO_PERSON_LEVEL_LINKAGE"]),
  label: nonEmpty,
  text: nonEmpty,
  /** Segundo testigo: el mismo bloqueo numerado en el `RESULT` de la evidencia del claim. */
  witness: z.strictObject({
    evidence_id: z.string().regex(ID_PATTERNS.evidence),
    segment_text: nonEmpty,
  }),
});
export type BlockerT = z.infer<typeof Blocker>;

/**
 * Ancla de período/fecha: valor estructurado con DOBLE TESTIGO en el corpus. NO es una Figure (no es una
 * métrica del corpus): existe para que el texto editorial no contenga fechas tipeadas a mano.
 */
export const Anchor = z.strictObject({
  id: z.string().regex(ID_PATTERNS.anchor),
  ...base,
  key: z.string().regex(/^[a-z0-9_]+$/),
  claim_id: z.string().regex(ID_PATTERNS.claim),
  kind: z.enum(["PERIOD_MONTH", "DATE"]),
  value_raw: z.string().regex(/^[0-9]{4}-[0-9]{2}(-[0-9]{2})?$/),
  display: z.strictObject({
    style: z.enum(["month-long", "date-long"]),
    locale: z.literal("es-AR"),
  }),
  witnesses: z
    .array(
      z.strictObject({
        entity: nonEmpty,
        source_path: nonEmpty,
        blob_sha: hex40,
        field: nonEmpty,
        pointer: z.string().startsWith("/"),
        text_anchor: nonEmpty,
      }),
    )
    .min(2),
});
export type AnchorT = z.infer<typeof Anchor>;

export const Episode = z.strictObject({
  id: z.string().regex(ID_PATTERNS.episode),
  ...base,
  ruling_id: z.string().regex(ID_PATTERNS.ruling),
  claim_ids: z.array(z.string().regex(ID_PATTERNS.claim)).min(1),
  date_raw: nonEmpty,
  norm: nonEmpty,
  vigencia: nonEmpty,
  verdict_raw: nonEmpty,
  selected: z.boolean(),
});
export type EpisodeT = z.infer<typeof Episode>;

export const GovernanceRuling = z.strictObject({
  id: z.string().regex(ID_PATTERNS.ruling),
  ...base,
  domain: nonEmpty,
  disposition: nonEmpty,
  summary: nonEmpty,
  v1_gov_references: z.array(nonEmpty),
});
export type GovernanceRulingT = z.infer<typeof GovernanceRuling>;

export const RELATION_CATEGORIES = [
  "AUTHORIZED_EXISTING_RELATION",
  "JUXTAPOSITION_ONLY",
  "GOVERNANCE_REQUIRED",
  "PROHIBITED",
] as const;
export const Relation = z.strictObject({
  id: z.string().regex(ID_PATTERNS.relation),
  ...base,
  category: z.enum(RELATION_CATEGORIES),
  title: nonEmpty,
  claim_ids: z.array(z.string().regex(ID_PATTERNS.claim)),
  context_claim_ids: z.array(z.string().regex(ID_PATTERNS.claim)),
  question_ids: z.array(z.string().regex(ID_PATTERNS.question)),
  hypothesis_ids: z.array(z.string().regex(ID_PATTERNS.hypothesis)),
  scope_of_relation: nonEmpty,
  permitted_comparison: nonEmpty,
  prohibited_inference: nonEmpty,
  reason: nonEmpty,
});
export type RelationT = z.infer<typeof Relation>;

export const PreservedResult = z.strictObject({
  id: z.string().regex(ID_PATTERNS.preserved),
  ...base,
  category: nonEmpty,
  regime: z.enum(["A", "B", "C"]),
  question_id: z.string().regex(ID_PATTERNS.question),
  claim_id: z.string().regex(ID_PATTERNS.claim).nullable(),
  hypothesis_id: z.string().regex(ID_PATTERNS.hypothesis).nullable(),
  status_value: nonEmpty,
  status_vocabulary: nonEmpty,
  what_is_preserved: nonEmpty,
  must_not: nonEmpty,
  what_would_unseat: nonEmpty.nullable(),
});
export type PreservedResultT = z.infer<typeof PreservedResult>;

// ───────────────────────── contenedores y manifest ─────────────────────────

export const ENTITY_FILES = {
  questions: Question,
  claims: Claim,
  hypotheses: Hypothesis,
  evidence: Evidence,
  "evidence-roots": EvidenceRoot,
  "statistical-objects": StatisticalObject,
  limitations: Limitation,
  blockers: Blocker,
  anchors: Anchor,
  episodes: Episode,
  "governance-rulings": GovernanceRuling,
  relations: Relation,
  "preserved-results": PreservedResult,
} as const;
export type EntityFileName = keyof typeof ENTITY_FILES;

export const EntityFile = z.strictObject({
  schema_version: semver,
  module_id: z.literal("labor"),
  entity: nonEmpty,
  items: z.array(z.unknown()),
});

export const Manifest = z.strictObject({
  schema: z.literal("aletheia-web/module-manifest/1"),
  module_id: z.literal("labor"),
  version: semver,
  status: z.enum(["FROZEN", "LIVE"]),
  schema_version: semver,
  generator_version: semver,
  generator_source_sha256: hex64,
  pin: z.strictObject({
    repo_id: nonEmpty,
    tag: nonEmpty,
    tag_object: hex40,
    commit: hex40,
    tree: hex40,
  }),
  contract_sha256: hex64,
  slice: z.strictObject({ question_ids: z.array(z.string().regex(ID_PATTERNS.question)).min(1) }),
  source_files: z.array(
    z.strictObject({
      path: nonEmpty,
      blob_sha: hex40,
      sha256: hex64,
      bytes: z.number().int().positive(),
    }),
  ),
  files: z.array(
    z.strictObject({ path: nonEmpty, sha256: hex64, bytes: z.number().int().positive() }),
  ),
  entity_counts: z.record(z.string(), z.number().int().min(0)),
  invariants: z.record(z.string(), z.number().int().min(0)),
});
export type ManifestT = z.infer<typeof Manifest>;

export const GENERATOR_VERSION = "1.0.0";
