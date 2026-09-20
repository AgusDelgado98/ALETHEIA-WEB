import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  AnchorT,
  BlockerT,
  ClaimT,
  EpisodeT,
  EvidenceRootT,
  EvidenceT,
  GovernanceRulingT,
  HypothesisT,
  LimitationT,
  PreservedResultT,
  ProvenanceT,
  QuestionT,
  RelationT,
  StatisticalObjectT,
} from "../../schemas/corpus.ts";
import {
  CLAIM_LIFECYCLE_STATES,
  DOCUMENTARY_LABELS,
  GENERATOR_VERSION,
} from "../../schemas/corpus.ts";
import type { ModuleContractT } from "./contract.ts";
import { srcDir } from "./extract.ts";
import type { Pin } from "./pin.ts";
import { sha256Hex, short8 } from "./util.ts";

type Rec = Record<string, unknown>;

/** El corpus normalizado de un módulo (solo el corte pedido) más estadísticas del corpus completo. */
export interface NormalizedCorpus {
  questions: QuestionT[];
  claims: ClaimT[];
  hypotheses: HypothesisT[];
  evidence: EvidenceT[];
  "evidence-roots": EvidenceRootT[];
  "statistical-objects": StatisticalObjectT[];
  limitations: LimitationT[];
  blockers: BlockerT[];
  anchors: AnchorT[];
  episodes: EpisodeT[];
  "governance-rulings": GovernanceRulingT[];
  relations: RelationT[];
  "preserved-results": PreservedResultT[];
}

export interface CorpusStats {
  questions: number;
  questions_by_regime: Record<string, number>;
  claims: number;
  claims_by_regime: Record<string, number>;
  hypotheses: number;
  evidence: number;
  evidence_linked_to_claim: number;
  evidence_diagnostic_only: number;
  evidence_roots: number;
  statistical_objects: number;
  governance_rulings: number;
  relations: number;
  relations_by_category: Record<string, number>;
  preserved_results: number;
  claim_states: Record<string, number>;
  questions_with_claims: number;
  questions_without_claims: string[];
  questions_with_multiple_claims: string[];
  hypotheses_without_claim: string[];
  limitations_claims: number;
  limitations_questions: number;
}

/** Mapa mínimo para el golden test G-GEN-05 (las 18 preguntas / 14 claims, derivado de los ledgers completos). */
export interface CorpusMap {
  questions: Record<
    string,
    { claim_ids: string[]; claim_states: string[]; hypothesis_ids: string[]; resolution: string }
  >;
  claims: Record<string, { question_id: string; state: string }>;
}

export interface NormalizeResult {
  corpus: NormalizedCorpus;
  stats: CorpusStats;
  map: CorpusMap;
}

// ───────────────────────── helpers de lectura estricta ─────────────────────────

function asRec(v: unknown, what: string): Rec {
  if (typeof v !== "object" || v === null || Array.isArray(v))
    throw new Error(`${what}: se esperaba un objeto`);
  return v as Rec;
}
function asArr(v: unknown, what: string): unknown[] {
  if (!Array.isArray(v)) throw new Error(`${what}: se esperaba un array`);
  return v;
}
function str(r: Rec, k: string, what: string): string {
  const v = r[k];
  if (typeof v !== "string" || v === "") throw new Error(`${what}.${k}: falta el texto`);
  return v;
}
function strOrNull(r: Rec, k: string): string | null {
  const v = r[k];
  return typeof v === "string" && v !== "" ? v : null;
}
function strs(r: Rec, k: string, what: string, optional = false): string[] {
  const v = r[k];
  if (v === undefined && optional) return [];
  const arr = asArr(v, `${what}.${k}`);
  return arr.map((x, i) => {
    if (typeof x !== "string" || x === "") throw new Error(`${what}.${k}[${i}]: se esperaba texto`);
    return x;
  });
}
function bool(r: Rec, k: string, what: string): boolean {
  const v = r[k];
  if (typeof v !== "boolean") throw new Error(`${what}.${k}: se esperaba boolean`);
  return v;
}
const uniqSorted = (xs: readonly string[]): string[] => [...new Set(xs)].sort();
const eqSets = (a: readonly string[], b: readonly string[]): boolean =>
  JSON.stringify(uniqSorted(a)) === JSON.stringify(uniqSorted(b));

/** `KNOWN_BREAKS` llega como strings o como objetos `{ KNOWN_BREAK, … }`. */
function knownBreaks(r: Rec, field: string, what: string): string[] {
  const v = r[field];
  if (v === undefined) return [];
  const arr = asArr(v, `${what}.${field}`);
  return arr.map((x, i) => {
    if (typeof x === "string" && x !== "") return x;
    const rec = asRec(x, `${what}.${field}[${i}]`);
    return str(rec, "KNOWN_BREAK", `${what}.${field}[${i}]`);
  });
}

/** S0 `EFFECTIVE_OUTCOME`: array de estados, o el marcador `NO_CLAIM: …` en hipótesis sin claim. */
function effectiveOutcomes(r: Rec, hid: string): ClaimT["epistemic_state"][] {
  const v = r["EFFECTIVE_OUTCOME"];
  if (v === undefined || v === null) return [];
  if (typeof v === "string") {
    if (v.startsWith("NO_CLAIM")) return [];
    throw new Error(`${hid}: EFFECTIVE_OUTCOME texto no esperado: ${v}`);
  }
  return asArr(v, `${hid}.EFFECTIVE_OUTCOME`).map((s, i) => {
    if (typeof s !== "string" || s === "")
      throw new Error(`${hid}.EFFECTIVE_OUTCOME[${i}]: se esperaba texto`);
    if (!(CLAIM_LIFECYCLE_STATES as readonly string[]).includes(s))
      throw new Error(`${hid}: outcome fuera del vocabulario: ${s}`);
    return s as ClaimT["epistemic_state"];
  });
}

/** `LAB-CLM-0011` → `labor/LAB-CLM-0011`. */
export const gid = (id: string): string => `labor/${id}`;

interface Source {
  path: string;
  data: unknown;
}

const PATHS = {
  questions: "metadata/questions/question-ledger.json",
  claims: "metadata/claims/claim-ledger.json",
  hypotheses: "metadata/hypotheses/hypothesis-registry.json",
  evidence: "metadata/evidence/evidence-registry.json",
  roots: "metadata/lineage/evidence-root-registry.json",
  objects: "metadata/objects/object-ledger.json",
  gov: "metadata/governance/lab-gov-registry.json",
  b4: "reports/lab_b4/LAB-B4-episode-sources.json",
  s0: "reports/lab_s/LAB-S0-inventory.json",
  keep: "reports/lab_s/LAB-S0-preserved-results.json",
  rel: "reports/lab_s/LAB-S2-relation-register.json",
} as const;

/**
 * S2 `normalize`: lee SOLO `corpus-src/` (offline, sin red, sin reloj) y produce el corpus web del corte.
 * Es genérico: agregar preguntas al `slice` del contrato extiende la salida sin tocar este código.
 */
export function normalize(args: {
  root: string;
  pin: Pin;
  contract: ModuleContractT;
  dir?: string;
}): NormalizeResult {
  const { root, pin, contract } = args;
  const dir = args.dir ?? srcDir(root, pin);
  if (pin.repo_id !== "ALETHEIA-LABOR")
    throw new Error("normalize: solo ALETHEIA-LABOR está soportado en este módulo");

  const sources = new Map<string, Source>();
  const load = (path: string): Source => {
    let s = sources.get(path);
    if (s === undefined) {
      const file = pin.files.find((f) => f.path === path);
      if (file === undefined) throw new Error(`El pin no lista ${path}: no puede consumirse`);
      const buf = readFileSync(join(dir, path));
      if (sha256Hex(buf) !== file.sha256)
        throw new Error(`G-SRC-03: ${path} no coincide con el pin`);
      s = { path, data: JSON.parse(buf.toString("utf8")) };
      sources.set(path, s);
    }
    return s;
  };

  const prov = (
    path: string,
    sourceId: string | null,
    pointer: string,
    recorded: ProvenanceT["recorded_hashes"] = [],
  ): ProvenanceT => {
    const file = pin.files.find((f) => f.path === path);
    if (file === undefined) throw new Error(`provenance: ${path} no está en el pin`);
    return {
      source_repo: "ALETHEIA-LABOR",
      tag: pin.tag,
      commit: pin.commit,
      source_path: path,
      source_id: sourceId,
      source_pointer: pointer,
      blob_sha: file.blob_sha,
      recorded_hashes: recorded,
      extracted_sha256: file.sha256,
      generator_version: GENERATOR_VERSION,
    };
  };

  // ── registros crudos ──
  const questions = asArr(load(PATHS.questions).data, "question-ledger").map((r, i) => ({
    r: asRec(r, `Q[${i}]`),
    i,
  }));
  const claims = asArr(load(PATHS.claims).data, "claim-ledger").map((r, i) => ({
    r: asRec(r, `CLM[${i}]`),
    i,
  }));
  const hyps = asArr(load(PATHS.hypotheses).data, "hypothesis-registry").map((r, i) => ({
    r: asRec(r, `HYP[${i}]`),
    i,
  }));
  const evidence = asArr(load(PATHS.evidence).data, "evidence-registry").map((r, i) => ({
    r: asRec(r, `EVD[${i}]`),
    i,
  }));
  const roots = asArr(load(PATHS.roots).data, "evidence-root-registry").map((r, i) => ({
    r: asRec(r, `ROOT[${i}]`),
    i,
  }));
  const objects = asArr(load(PATHS.objects).data, "object-ledger").map((r, i) => ({
    r: asRec(r, `OBJ[${i}]`),
    i,
  }));
  const gov = asArr(load(PATHS.gov).data, "lab-gov-registry").map((r, i) => ({
    r: asRec(r, `GOV[${i}]`),
    i,
  }));
  const s0 = asRec(load(PATHS.s0).data, "LAB-S0-inventory");
  const s0q = asArr(s0["QUESTIONS"], "S0.QUESTIONS").map((r, i) => ({
    r: asRec(r, `S0Q[${i}]`),
    i,
  }));
  const s0c = asArr(s0["CLAIMS"], "S0.CLAIMS").map((r, i) => ({ r: asRec(r, `S0C[${i}]`), i }));
  const s0h = asArr(s0["HYPOTHESES"], "S0.HYPOTHESES").map((r, i) => ({
    r: asRec(r, `S0H[${i}]`),
    i,
  }));
  const keep = asArr(
    asRec(load(PATHS.keep).data, "LAB-S0-preserved-results")["PRESERVED_RESULTS"],
    "KEEP",
  ).map((r, i) => ({ r: asRec(r, `KEEP[${i}]`), i }));
  const rels = asArr(
    asRec(load(PATHS.rel).data, "LAB-S2-relation-register")["RELATIONS"],
    "RELATIONS",
  ).map((r, i) => ({ r: asRec(r, `REL[${i}]`), i }));
  const episodes = asArr(
    asRec(load(PATHS.b4).data, "LAB-B4-episode-sources")["CANDIDATE_EPISODES"],
    "CANDIDATE_EPISODES",
  ).map((r, i) => ({ r: asRec(r, `EP[${i}]`), i }));

  const findBy = (list: { r: Rec; i: number }[], key: string, id: string, what: string) => {
    const hits = list.filter((x) => x.r[key] === id);
    if (hits.length !== 1)
      throw new Error(`${what}: ${id} aparece ${hits.length} veces (se esperaba 1)`);
    return hits[0]!;
  };

  // ── estadísticas y mapa del corpus COMPLETO (G-CNT-01, G-REF-04, G-GEN-05) ──
  const stats = corpusStats({
    questions,
    claims,
    hyps,
    evidence,
    roots,
    objects,
    gov,
    rels,
    keep,
    s0c,
  });
  const map = corpusMap({ questions, claims, hyps, s0q });

  // ── construcción por pregunta del corte ──
  const out: NormalizedCorpus = {
    questions: [],
    claims: [],
    hypotheses: [],
    evidence: [],
    "evidence-roots": [],
    "statistical-objects": [],
    limitations: [],
    blockers: [],
    anchors: [],
    episodes: [],
    "governance-rulings": [],
    relations: [],
    "preserved-results": [],
  };
  const put = <T extends { id: string }>(list: T[], item: T): void => {
    const existing = list.find((x) => x.id === item.id);
    if (existing === undefined) list.push(item);
    else if (JSON.stringify(existing) !== JSON.stringify(item))
      throw new Error(`ID duplicado con contenido distinto: ${item.id}`);
  };

  const deflatorRoots = new Set(
    s0c.map((c) => strOrNull(c.r, "DEFLATOR_ROOT_ID")).filter((x): x is string => x !== null),
  );

  const makeLimitations = (
    ownerKind: "claim" | "question" | "evidence",
    ownerId: string,
    texts: string[],
    path: string,
    index: number,
    field: string,
    sourceId: string,
  ): string[] => {
    const ids: string[] = [];
    texts.forEach((text, k) => {
      const lim: LimitationT = {
        id: `lim.${ownerId}.${short8(sha256Hex(text))}`,
        global_id: gid(`lim.${ownerId}.${short8(sha256Hex(text))}`),
        id_origin: "DERIVED",
        provenance: prov(path, sourceId, `/${index}/${field}/${k}`),
        owner_kind: ownerKind,
        owner_id: ownerId,
        ordinal: k + 1,
        text,
        origin_path: `${path}#${sourceId}/${field}[${k}]`,
      };
      if (ids.includes(lim.id))
        throw new Error(`Limitación duplicada en ${ownerId}: ${text.slice(0, 40)}`);
      ids.push(lim.id);
      put(out.limitations, lim);
    });
    return ids;
  };

  for (const qid of contract.slice.question_ids) {
    const q = findBy(questions, "QUESTION_ID", qid, "question-ledger");
    const qs0 = findBy(s0q, "QUESTION_ID", qid, "S0.QUESTIONS");
    const qClaims = claims
      .filter((c) => c.r["QUESTION_ID"] === qid)
      .sort((a, b) => str(a.r, "CLAIM_ID", "claim").localeCompare(str(b.r, "CLAIM_ID", "claim")));
    const qHyps = hyps.filter((h) => h.r["QUESTION_ID"] === qid);
    const claimIds = qClaims.map((c) => str(c.r, "CLAIM_ID", "claim"));
    const hypIds = qHyps.map((h) => str(h.r, "HYPOTHESIS_ID", "hypothesis")).sort();

    // G-REF-05: RELATED_HYPOTHESES == hypothesis-registry
    const related = strs(q.r, "RELATED_HYPOTHESES", qid, true);
    if (!eqSets(related, hypIds))
      throw new Error(
        `G-REF-05: ${qid} RELATED_HYPOTHESES ${JSON.stringify(related)} != registry ${JSON.stringify(hypIds)}`,
      );
    if (!eqSets(strs(qs0.r, "CLAIM_IDS", "S0Q", true), claimIds))
      throw new Error(`G-REF-02: S0 lista otros claims para ${qid}`);

    // ── resolución de la pregunta: campo DISTINTO del epistemic_state del claim (§8, G-STA-02) ──
    const s0Res = asRec(qs0.r["EFFECTIVE_RESOLUTION"], `${qid}.S0.EFFECTIVE_RESOLUTION`);
    const s0Value = str(s0Res, "VALUE", qid);
    const s0Vocab = str(s0Res, "VOCABULARY", qid);
    let resolutionValue: QuestionT["resolution"]["value"];
    let resolutionVocab: QuestionT["resolution"]["vocabulary"];
    let resolutionBasis: QuestionT["resolution"]["basis"];
    let resolutionBasisRefs: string[];

    if (claimIds.length === 0) {
      if (!(DOCUMENTARY_LABELS as readonly string[]).includes(s0Value))
        throw new Error(
          `G-STA-02: ${qid} sin claims y S0 resuelve ${s0Value}, que no es etiqueta documental`,
        );
      resolutionValue = s0Value as (typeof DOCUMENTARY_LABELS)[number];
      resolutionVocab = s0Vocab as QuestionT["resolution"]["vocabulary"];
      const keepIdsForRes = uniqSorted(strs(qs0.r, "PRESERVED_RESULT_IDS", "S0Q", true));
      const keepWitnesses = keepIdsForRes.map((kid) => findBy(keep, "PRESERVE_ID", kid, "KEEP"));
      if (keepWitnesses.length === 0)
        throw new Error(`G-STA-02: ${qid} sin claims y sin KEEP como segundo testigo`);
      for (const k of keepWitnesses) {
        const kid = str(k.r, "PRESERVE_ID", "keep");
        if (str(k.r, "STATUS_VALUE", kid) !== resolutionValue)
          throw new Error(
            `G-STA-02: ${qid} S0=${resolutionValue} y KEEP ${kid}=${str(k.r, "STATUS_VALUE", kid)}`,
          );
      }
      if (resolutionValue === "NOT_IDENTIFIABLE") {
        if (str(q.r, "STATUS", qid) !== "NOT_IDENTIFIABLE")
          throw new Error(
            `G-STA-02: ${qid} NOT_IDENTIFIABLE en S0 pero el ledger registra ${str(q.r, "STATUS", qid)}`,
          );
        if (s0Vocab !== "CLAIM_LIFECYCLE_STATE_RECORDED_AS_QUESTION_LEDGER_STATUS")
          throw new Error(`G-STA-02: vocabulario de S0 inesperado para ${qid}: ${s0Vocab}`);
        resolutionBasis = "QUESTION_LEDGER";
        resolutionBasisRefs = [qid];
      } else {
        if (s0Vocab !== "DOCUMENTED_REGIME_A_CLOSEOUT_LABEL_NOT_A_LIFECYCLE_STATE")
          throw new Error(`G-STA-02: vocabulario de S0 inesperado para ${qid}: ${s0Vocab}`);
        resolutionBasis = "REGIME_CLOSEOUT";
        resolutionBasisRefs = keepIdsForRes;
      }
    } else {
      const states = uniqSorted(qClaims.map((c) => str(c.r, "STATE", "claim")));
      if (states.length !== 1)
        throw new Error(
          `G-STA-02: ${qid} tiene claims con estados distintos (${states.join(", ")}): requiere una regla gobernada`,
        );
      resolutionValue = states[0] as ClaimT["epistemic_state"];
      if (s0Value !== resolutionValue)
        throw new Error(
          `G-STA-02: S0 resuelve ${qid} como ${s0Value} y los claims como ${resolutionValue}`,
        );
      if (s0Vocab !== "CLAIM_LIFECYCLE_STATE" || s0Res["BASIS"] !== "CLAIM")
        throw new Error(`G-STA-02: vocabulario/base de S0 inesperados para ${qid}`);
      if (!(CLAIM_LIFECYCLE_STATES as readonly string[]).includes(resolutionValue))
        throw new Error(`Estado de claim fuera del vocabulario: ${resolutionValue}`);
      resolutionVocab = "CLAIM_LIFECYCLE_STATE";
      resolutionBasis = "CLAIM";
      resolutionBasisRefs = claimIds;
    }

    // ── limitaciones ──
    const qLimIds = makeLimitations(
      "question",
      qid,
      strs(q.r, "KNOWN_LIMITATIONS", qid, true),
      PATHS.questions,
      q.i,
      "KNOWN_LIMITATIONS",
      qid,
    );

    // ── hipótesis ──
    const hypEntities: HypothesisT[] = [];
    for (const h of qHyps) {
      const hid = str(h.r, "HYPOTHESIS_ID", "hypothesis");
      const hs0 = findBy(s0h, "HYPOTHESIS_ID", hid, "S0.HYPOTHESES");
      const exposure = str(h.r, "PRIOR_DATA_EXPOSURE", hid);
      if (hs0.r["PRIOR_DATA_EXPOSURE"] !== exposure)
        throw new Error(`${hid}: PRIOR_DATA_EXPOSURE difiere entre registro y S0`);
      if (exposure !== "DIRECT" && exposure !== "INDIRECT" && exposure !== "NONE")
        throw new Error(`${hid}: exposición desconocida ${exposure}`);
      const outcome = effectiveOutcomes(hs0.r, hid);
      const hClaimIds = qClaims
        .filter((c) => c.r["HYPOTHESIS_ID"] === hid)
        .map((c) => str(c.r, "CLAIM_ID", "claim"));
      if (!eqSets(strs(hs0.r, "CLAIM_IDS", hid, true), hClaimIds))
        throw new Error(`${hid}: S0 y el ledger de claims discrepan en claim_ids`);
      const hyp: HypothesisT = {
        id: hid,
        global_id: gid(hid),
        id_origin: "CORPUS",
        provenance: prov(PATHS.hypotheses, hid, `/${h.i}`),
        question_id: qid,
        object_ids: uniqSorted(strs(h.r, "OBJECT_IDS", hid, true)),
        population: str(h.r, "POPULATION", hid),
        period: str(h.r, "PERIOD", hid),
        prior_data_exposure: exposure,
        disclosure_required: bool(hs0.r, "PRIOR_DATA_EXPOSURE_DISCLOSURE_REQUIRED", hid),
        metric: str(h.r, "METRIC", hid),
        operational_definition: str(h.r, "OPERATIONAL_DEFINITION", hid),
        expected_observation: str(h.r, "EXPECTED_OBSERVATION", hid),
        failure_condition: str(h.r, "FAILURE_CONDITION", hid),
        candidate_sources: strs(h.r, "CANDIDATE_SOURCES", hid, true),
        known_breaks: knownBreaks(h.r, "KNOWN_BREAKS", hid),
        registry_status: str(h.r, "STATUS", hid),
        claim_ids: hClaimIds,
        effective_outcome: outcome,
      };
      hypEntities.push(hyp);
      put(out.hypotheses, hyp);
    }

    // ── claims, evidencia, raíces ──
    const claimEntities: ClaimT[] = [];
    const evidenceIds = new Set<string>();
    const rootIds = new Set<string>();
    const objectIds = new Set<string>(strs(q.r, "RELATED_OBJECTS", qid, true));
    const rulingIds = new Set<string>();
    const episodeIds = new Set<string>();

    for (const c of qClaims) {
      const cid = str(c.r, "CLAIM_ID", "claim");
      const cs0 = findBy(s0c, "CLAIM_ID", cid, "S0.CLAIMS");
      const state = str(c.r, "STATE", cid);
      if (cs0.r["STATE"] !== state) throw new Error(`${cid}: STATE difiere entre ledger y S0`);
      if (!(CLAIM_LIFECYCLE_STATES as readonly string[]).includes(state))
        throw new Error(`G-STA-03: ${cid} tiene estado fuera del ciclo de vida: ${state}`);
      const kind = str(cs0.r, "CLAIM_KIND", cid);
      if (!contract.vocabularies.claim_kind.includes(kind))
        throw new Error(`${cid}: claim_kind desconocido ${kind}`);
      const abn = str(cs0.r, "ABSENT_VS_NEGATIVE", cid);
      const text = str(c.r, "CLAIM_TEXT", cid);
      const evIds = strs(c.r, "EVIDENCE_IDS", cid, true);
      evIds.forEach((e) => evidenceIds.add(e));
      strs(c.r, "ROOT_IDS", cid, true).forEach((r) => rootIds.add(r));
      strs(c.r, "OBJECT_IDS", cid, true).forEach((o) => objectIds.add(o));
      strs(c.r, "LAB_GOV", cid, true).forEach((g) => rulingIds.add(g));
      const referencedRoots = uniqSorted(
        [...text.matchAll(/LAB-ROOT-[0-9]{4}/g)].map((m) => m[0]),
      ).filter((r) => !strs(c.r, "ROOT_IDS", cid, true).includes(r));
      referencedRoots.forEach((r) => rootIds.add(r));
      // Episodios citados por ID explícito en el claim (no por parecido de nombres)
      [...text.matchAll(/EP-[0-9]{4}-[A-Z]{3,}/g)].forEach((m) => episodeIds.add(m[0]));

      const limIds = makeLimitations(
        "claim",
        cid,
        strs(c.r, "LIMITATIONS", cid),
        PATHS.claims,
        c.i,
        "LIMITATIONS",
        cid,
      );
      const claimEntity: ClaimT = {
        id: cid,
        global_id: gid(cid),
        id_origin: "CORPUS",
        provenance: prov(PATHS.claims, cid, `/${c.i}`),
        question_id: qid,
        hypothesis_id: strOrNull(c.r, "HYPOTHESIS_ID"),
        epistemic_state: state as ClaimT["epistemic_state"],
        claim_kind: kind as ClaimT["claim_kind"],
        absent_vs_negative: abn as ClaimT["absent_vs_negative"],
        canonical_text: text,
        scope_statement: str(c.r, "SCOPE_STATEMENT", cid),
        what_would_unseat: str(c.r, "WHAT_WOULD_UNSEAT_THIS", cid),
        limitation_ids: limIds,
        evidence_ids: evIds,
        object_ids: uniqSorted(strs(c.r, "OBJECT_IDS", cid, true)),
        root_ids: uniqSorted(strs(c.r, "ROOT_IDS", cid, true)),
        referenced_root_ids: referencedRoots,
        deflator_root_ids:
          cs0.r["DEFLATOR_ROOT_ID"] === null || cs0.r["DEFLATOR_ROOT_ID"] === undefined
            ? []
            : [str(cs0.r, "DEFLATOR_ROOT_ID", cid)],
        lab_gov: strs(c.r, "LAB_GOV", cid, true),
        v1_gov: strs(c.r, "V1_GOV", cid, true),
        not_eligible_for: strs(c.r, "NOT_ELIGIBLE_FOR", cid, true),
        lineage_independence: str(c.r, "LINEAGE_INDEPENDENCE", cid),
        scope_coverage_adequacy: str(c.r, "SCOPE_COVERAGE_ADEQUACY", cid),
        shared_coverage_bias: strOrNull(c.r, "SHARED_COVERAGE_BIAS"),
        source_label: str(c.r, "SOURCE", cid),
        figure_ids: [],
        blocker_ids: [],
        answerability: {
          answer_kind: "ABSENCE",
          answerable_from_corpus: true,
          required_qualifiers: [],
          forbidden_inferences: [],
          citation: {
            global_id: gid(cid),
            permalink_version: `${contract.module_id}@${contract.version}`,
          },
        },
      };
      claimEntities.push(claimEntity);
    }

    // Evidencia: registros del claim o de la pregunta (los `DIAGNOSTIC_ONLY` nunca respaldan un claim)
    const qEvidence = evidence.filter(
      (e) => evidenceIds.has(str(e.r, "EVIDENCE_ID", "evidence")) || e.r["QUESTION_ID"] === qid,
    );
    for (const e of qEvidence) {
      const eid = str(e.r, "EVIDENCE_ID", "evidence");
      evidenceIds.add(eid);
      strs(e.r, "ROOT_IDS", eid, true).forEach((r) => rootIds.add(r));
      strs(e.r, "OBJECT_IDS", eid, true).forEach((o) => objectIds.add(o));
      const inputHash = asArr(e.r["INPUT_HASH"] ?? [], `${eid}.INPUT_HASH`).map((h, k) => {
        const hr = asRec(h, `${eid}.INPUT_HASH[${k}]`);
        return { file: str(hr, "FILE", eid), sha256: str(hr, "SHA256", eid) };
      });
      const limIds = makeLimitations(
        "evidence",
        eid,
        strs(e.r, "LIMITATIONS", eid, true),
        PATHS.evidence,
        e.i,
        "LIMITATIONS",
        eid,
      );
      put(out.evidence, {
        id: eid,
        global_id: gid(eid),
        id_origin: "CORPUS",
        provenance: prov(PATHS.evidence, eid, `/${e.i}`, inputHash),
        claim_id: strOrNull(e.r, "CLAIM_ID"),
        question_id: strOrNull(e.r, "QUESTION_ID"),
        hypothesis_id: strOrNull(e.r, "HYPOTHESIS_ID"),
        diagnostic_only: bool(e.r, "DIAGNOSTIC_ONLY", eid),
        object_ids: uniqSorted(strs(e.r, "OBJECT_IDS", eid, true)),
        source_label: str(e.r, "SOURCE", eid),
        root_ids: uniqSorted(strs(e.r, "ROOT_IDS", eid, true)),
        method: str(e.r, "METHOD", eid),
        metric: str(e.r, "METRIC", eid),
        result_text: str(e.r, "RESULT", eid),
        reproducibility: str(e.r, "REPRODUCIBILITY", eid),
        status: str(e.r, "STATUS", eid),
        limitation_ids: limIds,
      });
    }

    // Raíces (su objeto estadístico entra al cierre del corte: G-REF-01)
    for (const rid of uniqSorted([...rootIds])) {
      const r = findBy(roots, "ROOT_ID", rid, "evidence-root-registry");
      objectIds.add(str(r.r, "STATISTICAL_OBJECT", rid));
      put(out["evidence-roots"], {
        id: rid,
        global_id: gid(rid),
        id_origin: "CORPUS",
        provenance: prov(PATHS.roots, rid, `/${r.i}`),
        publication: str(r.r, "PUBLICATION", rid),
        dataset_release: str(r.r, "DATASET_RELEASE", rid),
        primary_producer: str(r.r, "PRIMARY_PRODUCER", rid),
        collection_instrument: str(r.r, "COLLECTION_INSTRUMENT", rid),
        frame_population: str(r.r, "FRAME_POPULATION", rid),
        period: str(r.r, "PERIOD", rid),
        transformations: strs(r.r, "TRANSFORMATIONS", rid, true),
        statistical_object: str(r.r, "STATISTICAL_OBJECT", rid),
        independence_class: str(r.r, "INDEPENDENCE_CLASS", rid),
        relative_to_root_id: strOrNull(r.r, "RELATIVE_TO_ROOT_ID"),
        shared_coverage_bias: str(r.r, "SHARED_COVERAGE_BIAS", rid),
        is_deflator: deflatorRoots.has(rid),
        source_links: [],
        source_link_status: "UNRESOLVED",
      });
    }

    // Objetos estadísticos
    for (const oid of uniqSorted([...objectIds])) {
      const o = findBy(objects, "OBJECT_ID", oid, "object-ledger");
      put(out["statistical-objects"], {
        id: oid,
        global_id: gid(oid),
        id_origin: "CORPUS",
        provenance: prov(PATHS.objects, oid, `/${o.i}`),
        name: str(o.r, "NAME", oid),
        unit: str(o.r, "UNIT", oid),
        population: str(o.r, "POPULATION", oid),
        universe: str(o.r, "UNIVERSE", oid),
        grain: str(o.r, "GRAIN", oid),
        producer: str(o.r, "PRODUCER", oid),
        observation_mechanism: str(o.r, "OBSERVATION_MECHANISM", oid),
        is: str(o.r, "IS", oid),
        is_not: strs(o.r, "IS_NOT", oid, true),
        status: str(o.r, "STATUS", oid),
        v1_references: strs(o.r, "V1_REFERENCES", oid, true),
      });
    }

    // Rulings y episodios
    for (const gidRuling of uniqSorted([...rulingIds])) {
      const g = findBy(gov, "RULING_ID", gidRuling, "lab-gov-registry");
      put(out["governance-rulings"], {
        id: gidRuling,
        global_id: gid(gidRuling),
        id_origin: "CORPUS",
        provenance: prov(PATHS.gov, gidRuling, `/${g.i}`),
        domain: str(g.r, "DOMAIN", gidRuling),
        disposition: str(g.r, "DISPOSITION", gidRuling),
        summary: str(g.r, "SUMMARY", gidRuling),
        v1_gov_references: strs(g.r, "V1_GOV_REFERENCES", gidRuling, true),
      });
    }
    for (const epId of uniqSorted([...episodeIds])) {
      const e = findBy(episodes, "EPISODE_ID", epId, "LAB-B4 CANDIDATE_EPISODES");
      const owningRuling = out["governance-rulings"].find((g) => g.summary.includes(epId));
      if (owningRuling === undefined)
        throw new Error(`${epId}: ningún ruling del claim lo menciona`);
      const verdict = str(e.r, "VERDICT", epId);
      const selected =
        verdict.startsWith("SELECTED") && owningRuling.summary.includes(`SELECTED (${epId}`);
      put(out.episodes, {
        id: epId,
        global_id: gid(epId),
        id_origin: "CORPUS",
        provenance: prov(PATHS.b4, epId, `/CANDIDATE_EPISODES/${e.i}`),
        ruling_id: owningRuling.id,
        claim_ids: claimEntities.filter((c) => c.canonical_text.includes(epId)).map((c) => c.id),
        date_raw: str(e.r, "DATE", epId),
        norm: str(e.r, "NORM", epId),
        vigencia: str(e.r, "VIGENCIA", epId),
        verdict_raw: verdict,
        selected,
      });
    }

    // Relaciones y resultados preservados
    const sliceClaimSet = new Set(claimIds);
    const relEntities: RelationT[] = [];
    for (const rr of rels) {
      const r = rr.r;
      const hit =
        strs(r, "CLAIM_IDS", "rel", true).some((c) => sliceClaimSet.has(c)) ||
        strs(r, "CONTEXT_CLAIM_IDS", "rel", true).some((c) => sliceClaimSet.has(c)) ||
        strs(r, "QUESTION_IDS", "rel", true).includes(qid) ||
        strs(r, "HYPOTHESIS_IDS", "rel", true).some((h) => hypIds.includes(h));
      if (!hit) continue;
      const rid = str(r, "RELATION_ID", "rel");
      const rel: RelationT = {
        id: rid,
        global_id: gid(rid),
        id_origin: "CORPUS",
        provenance: prov(PATHS.rel, rid, `/RELATIONS/${rr.i}`),
        category: str(r, "CATEGORY", rid) as RelationT["category"],
        title: str(r, "TITLE", rid),
        claim_ids: strs(r, "CLAIM_IDS", rid, true),
        context_claim_ids: strs(r, "CONTEXT_CLAIM_IDS", rid, true),
        question_ids: strs(r, "QUESTION_IDS", rid, true),
        hypothesis_ids: strs(r, "HYPOTHESIS_IDS", rid, true),
        scope_of_relation: str(r, "SCOPE_OF_RELATION", rid),
        permitted_comparison: str(r, "PERMITTED_COMPARISON", rid),
        prohibited_inference: str(r, "PROHIBITED_INFERENCE", rid),
        reason: str(r, "REASON", rid),
      };
      relEntities.push(rel);
      put(out.relations, rel);
    }

    const keepIds = uniqSorted(strs(qs0.r, "PRESERVED_RESULT_IDS", "S0Q", true));
    const keepByQuestion = keep
      .filter((k) => k.r["QUESTION_ID"] === qid)
      .map((k) => str(k.r, "PRESERVE_ID", "keep"));
    if (!eqSets(keepIds, keepByQuestion))
      throw new Error(
        `${qid}: KEEP en S0 (${keepIds.join(",")}) != registro de resultados preservados (${keepByQuestion.join(",")})`,
      );
    for (const kid of keepIds) {
      const k = findBy(keep, "PRESERVE_ID", kid, "preserved-results");
      put(out["preserved-results"], {
        id: kid,
        global_id: gid(kid),
        id_origin: "CORPUS",
        provenance: prov(PATHS.keep, kid, `/PRESERVED_RESULTS/${k.i}`),
        category: str(k.r, "CATEGORY", kid),
        regime: str(k.r, "REGIME", kid) as "A" | "B" | "C",
        question_id: str(k.r, "QUESTION_ID", kid),
        claim_id: strOrNull(k.r, "CLAIM_ID"),
        hypothesis_id: strOrNull(k.r, "HYPOTHESIS_ID"),
        status_value: str(k.r, "STATUS_VALUE", kid),
        status_vocabulary: str(k.r, "STATUS_VOCABULARY", kid),
        what_is_preserved: str(k.r, "WHAT_IS_PRESERVED", kid),
        must_not: str(k.r, "MUST_NOT", kid),
        what_would_unseat: strOrNull(k.r, "WHAT_WOULD_UNSEAT_THIS"),
      });
    }

    // ── bloqueos numerados del claim (doble testigo: texto del claim + RESULT de la evidencia) ──
    for (const claim of claimEntities) {
      const spec = contract.blocker_specs[claim.id];
      if (spec === undefined) continue;
      const claimRaw = claims.find((c) => c.r["CLAIM_ID"] === claim.id)!;
      const ev = out.evidence.find((e) => e.claim_id === claim.id);
      if (ev === undefined)
        throw new Error(`${claim.id}: sin evidencia para el segundo testigo de los bloqueos`);
      const primary = numberedSegments(
        claim.canonical_text,
        spec.end_marker,
        `${claim.id}.CLAIM_TEXT`,
      );
      const witness = numberedSegments(ev.result_text, spec.witness_end_marker, `${ev.id}.RESULT`);
      if (primary.length !== spec.expected_count)
        throw new Error(
          `${claim.id}: ${primary.length} bloqueos en el claim, el contrato exige ${spec.expected_count}`,
        );
      if (witness.length !== spec.expected_count)
        throw new Error(
          `${claim.id}: ${witness.length} bloqueos en la evidencia ${ev.id}, el contrato exige ${spec.expected_count}`,
        );
      for (const b of spec.blockers) {
        const seg = primary.find((p) => p.ordinal === b.ordinal);
        const wit = witness.find((p) => p.ordinal === b.ordinal);
        if (seg === undefined || wit === undefined)
          throw new Error(`${claim.id}: falta el bloqueo ${b.ordinal}`);
        const sep = " -- ";
        const cut = seg.text.indexOf(sep);
        if (cut < 0)
          throw new Error(`${claim.id}: el bloqueo ${b.ordinal} no tiene etiqueta ('${sep}')`);
        const label = seg.text.slice(0, cut);
        if (!label.startsWith(b.label_prefix))
          throw new Error(
            `${claim.id}: etiqueta del bloqueo ${b.ordinal} es «${label}», se esperaba «${b.label_prefix}…» (posible drift del corpus)`,
          );
        const blk: BlockerT = {
          id: `blk.${claim.id}.${b.ordinal}.${short8(sha256Hex(seg.text))}`,
          global_id: gid(`blk.${claim.id}.${b.ordinal}.${short8(sha256Hex(seg.text))}`),
          id_origin: "DERIVED",
          provenance: prov(PATHS.claims, claim.id, `/${claimRaw.i}/CLAIM_TEXT`),
          claim_id: claim.id,
          ordinal: b.ordinal,
          kind: b.kind as BlockerT["kind"],
          label,
          text: seg.text.slice(cut + sep.length),
          witness: { evidence_id: ev.id, segment_text: wit.text },
        };
        put(out.blockers, blk);
        claim.blocker_ids.push(blk.id);
      }
    }

    // ── anclas de período/fecha (doble testigo) ──
    for (const spec of contract.anchor_specs.filter((a) => claimIds.includes(a.claim_id))) {
      const values: string[] = [];
      const witnesses: AnchorT["witnesses"] = [];
      for (const w of spec.witnesses) {
        let raw: { r: Rec; i: number } | undefined;
        let path: string;
        let pointerBase: string;
        let entity: string;
        if (w.source === "claim") {
          raw = findBy(claims, "CLAIM_ID", w.id, "claim-ledger");
          path = PATHS.claims;
          pointerBase = `/${raw.i}`;
          entity = gid(w.id);
        } else if (w.source === "evidence_root") {
          raw = findBy(roots, "ROOT_ID", w.id, "evidence-root-registry");
          path = PATHS.roots;
          pointerBase = `/${raw.i}`;
          entity = gid(w.id);
        } else {
          raw = findBy(episodes, "EPISODE_ID", w.id, "LAB-B4 CANDIDATE_EPISODES");
          path = PATHS.b4;
          pointerBase = `/CANDIDATE_EPISODES/${raw.i}`;
          entity = gid(w.id);
        }
        const text = str(raw.r, w.field, w.id);
        const m = new RegExp(w.regex).exec(text);
        if (m === null || m[1] === undefined)
          throw new Error(
            `ancla ${spec.key}: el testigo ${w.id}.${w.field} no contiene el patrón ${w.regex}`,
          );
        values.push(m[1]);
        const file = pin.files.find((f) => f.path === path)!;
        witnesses.push({
          entity,
          source_path: path,
          blob_sha: file.blob_sha,
          field: w.field,
          pointer: `${pointerBase}/${w.field}`,
          text_anchor: m[0],
        });
      }
      if (new Set(values).size !== 1)
        throw new Error(`ancla ${spec.key}: los testigos discrepan: ${values.join(" ≠ ")}`);
      const anchorClaim =
        out.claims.find((c) => c.id === spec.claim_id) ??
        claimEntities.find((c) => c.id === spec.claim_id)!;
      const claimRaw = claims.find((c) => c.r["CLAIM_ID"] === anchorClaim.id)!;
      put(out.anchors, {
        id: `anc.${spec.claim_id}.${spec.key}`,
        global_id: gid(`anc.${spec.claim_id}.${spec.key}`),
        id_origin: "DERIVED",
        provenance: prov(PATHS.claims, spec.claim_id, `/${claimRaw.i}/CLAIM_TEXT`),
        key: spec.key,
        claim_id: spec.claim_id,
        kind: spec.kind,
        value_raw: values[0]!,
        display: { style: spec.display_style, locale: "es-AR" },
        witnesses,
      });
    }

    // ── answerability: se DERIVA del estado y del tipo de claim, no la decide un editor (§12) ──
    const forbidden = relEntities
      .filter((r) => r.category === "PROHIBITED" || r.category === "GOVERNANCE_REQUIRED")
      .map((r) => r.id)
      .sort();
    for (const claim of claimEntities) {
      claim.answerability = {
        answer_kind: answerKind(claim.epistemic_state, claim.claim_kind),
        answerable_from_corpus: true,
        required_qualifiers: [...claim.limitation_ids],
        forbidden_inferences: forbidden.filter(
          (rid) =>
            relEntities.find((r) => r.id === rid)!.claim_ids.includes(claim.id) ||
            relEntities.find((r) => r.id === rid)!.question_ids.includes(qid),
        ),
        citation: {
          global_id: gid(claim.id),
          permalink_version: `${contract.module_id}@${contract.version}`,
        },
      };
      put(out.claims, claim);
    }

    const questionEntity: QuestionT = {
      id: qid,
      global_id: gid(qid),
      id_origin: "CORPUS",
      provenance: prov(PATHS.questions, qid, `/${q.i}`),
      regime: str(q.r, "REGIME", qid) as QuestionT["regime"],
      class: str(q.r, "CLASS", qid) as QuestionT["class"],
      canonical_text: str(q.r, "TEXT", qid),
      canonical_title: str(q.r, "TITLE", qid),
      ledger_status: str(q.r, "STATUS", qid),
      claim_ids: claimIds,
      hypothesis_ids: hypIds,
      object_ids: uniqSorted(strs(q.r, "RELATED_OBJECTS", qid, true)),
      identification_requirements: strs(q.r, "IDENTIFICATION_REQUIREMENTS", qid, true),
      known_breaks: knownBreaks(q.r, "KNOWN_BREAKS", qid),
      causal_identification_status: strOrNull(q.r, "CAUSAL_IDENTIFICATION_STATUS"),
      limitation_ids: qLimIds,
      resolution: {
        value: resolutionValue,
        vocabulary: resolutionVocab,
        basis: resolutionBasis,
        basis_refs: resolutionBasisRefs,
      },
      absent_vs_negative: str(qs0.r, "ABSENT_VS_NEGATIVE", qid) as QuestionT["absent_vs_negative"],
      preserved_result_ids: keepIds,
      answerability: {
        answer_kind:
          claimEntities.length === 0
            ? "NOT_ANSWERABLE"
            : answerKind(
                resolutionValue as ClaimT["epistemic_state"],
                claimEntities[0]!.claim_kind,
              ),
        answerable_from_corpus: true,
        required_qualifiers: uniqSorted([
          ...qLimIds,
          ...claimEntities.flatMap((c) => c.limitation_ids),
        ]),
        forbidden_inferences: forbidden,
        citation: {
          global_id: gid(qid),
          permalink_version: `${contract.module_id}@${contract.version}`,
        },
      },
    };
    put(out.questions, questionEntity);
  }

  // Evidencia DIAGNOSTIC_ONLY que el registro no ata a una pregunta: entra al corpus completo, no al corte de una ficha.
  for (const e of evidence) {
    const eid = str(e.r, "EVIDENCE_ID", "evidence");
    if (out.evidence.some((x) => x.id === eid)) continue;
    const inputHash = asArr(e.r["INPUT_HASH"] ?? [], `${eid}.INPUT_HASH`).map((h, k) => {
      const hr = asRec(h, `${eid}.INPUT_HASH[${k}]`);
      return { file: str(hr, "FILE", eid), sha256: str(hr, "SHA256", eid) };
    });
    const limIds = makeLimitations(
      "evidence",
      eid,
      strs(e.r, "LIMITATIONS", eid, true),
      PATHS.evidence,
      e.i,
      "LIMITATIONS",
      eid,
    );
    put(out.evidence, {
      id: eid,
      global_id: gid(eid),
      id_origin: "CORPUS",
      provenance: prov(PATHS.evidence, eid, `/${e.i}`, inputHash),
      claim_id: strOrNull(e.r, "CLAIM_ID"),
      question_id: strOrNull(e.r, "QUESTION_ID"),
      hypothesis_id: strOrNull(e.r, "HYPOTHESIS_ID"),
      diagnostic_only: bool(e.r, "DIAGNOSTIC_ONLY", eid),
      object_ids: uniqSorted(strs(e.r, "OBJECT_IDS", eid, true)),
      source_label: str(e.r, "SOURCE", eid),
      root_ids: uniqSorted(strs(e.r, "ROOT_IDS", eid, true)),
      method: str(e.r, "METHOD", eid),
      metric: str(e.r, "METRIC", eid),
      result_text: str(e.r, "RESULT", eid),
      reproducibility: str(e.r, "REPRODUCIBILITY", eid),
      status: str(e.r, "STATUS", eid),
      limitation_ids: limIds,
    });
    const extraRoots = uniqSorted(strs(e.r, "ROOT_IDS", eid, true));
    const extraObjects = new Set(strs(e.r, "OBJECT_IDS", eid, true));
    for (const rid of extraRoots) {
      if (out["evidence-roots"].some((x) => x.id === rid)) continue;
      const r = findBy(roots, "ROOT_ID", rid, "evidence-root-registry");
      extraObjects.add(str(r.r, "STATISTICAL_OBJECT", rid));
      put(out["evidence-roots"], {
        id: rid,
        global_id: gid(rid),
        id_origin: "CORPUS",
        provenance: prov(PATHS.roots, rid, `/${r.i}`),
        publication: str(r.r, "PUBLICATION", rid),
        dataset_release: str(r.r, "DATASET_RELEASE", rid),
        primary_producer: str(r.r, "PRIMARY_PRODUCER", rid),
        collection_instrument: str(r.r, "COLLECTION_INSTRUMENT", rid),
        frame_population: str(r.r, "FRAME_POPULATION", rid),
        period: str(r.r, "PERIOD", rid),
        transformations: strs(r.r, "TRANSFORMATIONS", rid, true),
        statistical_object: str(r.r, "STATISTICAL_OBJECT", rid),
        independence_class: str(r.r, "INDEPENDENCE_CLASS", rid),
        relative_to_root_id: strOrNull(r.r, "RELATIVE_TO_ROOT_ID"),
        shared_coverage_bias: str(r.r, "SHARED_COVERAGE_BIAS", rid),
        is_deflator: deflatorRoots.has(rid),
        source_links: [],
        source_link_status: "UNRESOLVED",
      });
    }
    for (const oid of uniqSorted([...extraObjects])) {
      if (out["statistical-objects"].some((x) => x.id === oid)) continue;
      const o = findBy(objects, "OBJECT_ID", oid, "object-ledger");
      put(out["statistical-objects"], {
        id: oid,
        global_id: gid(oid),
        id_origin: "CORPUS",
        provenance: prov(PATHS.objects, oid, `/${o.i}`),
        name: str(o.r, "NAME", oid),
        unit: str(o.r, "UNIT", oid),
        population: str(o.r, "POPULATION", oid),
        universe: str(o.r, "UNIVERSE", oid),
        grain: str(o.r, "GRAIN", oid),
        producer: str(o.r, "PRODUCER", oid),
        observation_mechanism: str(o.r, "OBSERVATION_MECHANISM", oid),
        is: str(o.r, "IS", oid),
        is_not: strs(o.r, "IS_NOT", oid, true),
        status: str(o.r, "STATUS", oid),
        v1_references: strs(o.r, "V1_REFERENCES", oid, true),
      });
    }
  }

  for (const o of objects) {
    const oid = str(o.r, "OBJECT_ID", "object");
    if (out["statistical-objects"].some((x) => x.id === oid)) continue;
    put(out["statistical-objects"], {
      id: oid,
      global_id: gid(oid),
      id_origin: "CORPUS",
      provenance: prov(PATHS.objects, oid, `/${o.i}`),
      name: str(o.r, "NAME", oid),
      unit: str(o.r, "UNIT", oid),
      population: str(o.r, "POPULATION", oid),
      universe: str(o.r, "UNIVERSE", oid),
      grain: str(o.r, "GRAIN", oid),
      producer: str(o.r, "PRODUCER", oid),
      observation_mechanism: str(o.r, "OBSERVATION_MECHANISM", oid),
      is: str(o.r, "IS", oid),
      is_not: strs(o.r, "IS_NOT", oid, true),
      status: str(o.r, "STATUS", oid),
      v1_references: strs(o.r, "V1_REFERENCES", oid, true),
    });
  }
  for (const rr of rels) {
    const rid = str(rr.r, "RELATION_ID", "rel");
    if (out.relations.some((x) => x.id === rid)) continue;
    put(out.relations, {
      id: rid,
      global_id: gid(rid),
      id_origin: "CORPUS",
      provenance: prov(PATHS.rel, rid, `/RELATIONS/${rr.i}`),
      category: str(rr.r, "CATEGORY", rid) as RelationT["category"],
      title: str(rr.r, "TITLE", rid),
      claim_ids: strs(rr.r, "CLAIM_IDS", rid, true),
      context_claim_ids: strs(rr.r, "CONTEXT_CLAIM_IDS", rid, true),
      question_ids: strs(rr.r, "QUESTION_IDS", rid, true),
      hypothesis_ids: strs(rr.r, "HYPOTHESIS_IDS", rid, true),
      scope_of_relation: str(rr.r, "SCOPE_OF_RELATION", rid),
      permitted_comparison: str(rr.r, "PERMITTED_COMPARISON", rid),
      prohibited_inference: str(rr.r, "PROHIBITED_INFERENCE", rid),
      reason: str(rr.r, "REASON", rid),
    });
  }

  // Orden explícito de todo (Data Contract §4.2.6)
  for (const key of Object.keys(out) as (keyof NormalizedCorpus)[]) {
    (out[key] as { id: string }[]).sort((a, b) => a.id.localeCompare(b.id));
  }
  return { corpus: out, stats, map };
}

/** Regla derivada de `answer_kind` (Data Contract §12). Combinaciones no previstas fallan: no se adivinan. */
export function answerKind(
  state: ClaimT["epistemic_state"],
  kind: ClaimT["claim_kind"],
): "MEASUREMENT" | "DOCUMENTARY_FINDING" | "ABSENCE" | "NOT_ANSWERABLE" {
  if (state === "INSUFFICIENT_EVIDENCE") return "ABSENCE";
  if (state === "OBSERVED_IN_SOURCE" || state === "REFUTED_WITHIN_SCOPE")
    return kind === "STATISTICAL_MEASUREMENT" ? "MEASUREMENT" : "DOCUMENTARY_FINDING";
  throw new Error(`answer_kind no definido para ${state}/${kind}`);
}

interface Segment {
  ordinal: number;
  text: string;
}

/** Divide un texto en sus cláusulas numeradas `(1) … (2) … (3) …`; la última termina en `endMarker`. */
export function numberedSegments(text: string, endMarker: string, what: string): Segment[] {
  const end = text.indexOf(endMarker);
  if (end < 0)
    throw new Error(
      `${what}: no contiene el marcador de fin «${endMarker}» (posible drift del corpus)`,
    );
  const body = text.slice(0, end);
  const marks = [...body.matchAll(/\(([1-9])\) /g)];
  const out: Segment[] = [];
  marks.forEach((m, k) => {
    const start = (m.index ?? 0) + m[0].length;
    const stop = k + 1 < marks.length ? (marks[k + 1]!.index ?? body.length) : body.length;
    const seg = body.slice(start, stop).trim().replace(/;$/, "").trim();
    out.push({ ordinal: Number(m[1]), text: seg });
  });
  out.forEach((s, k) => {
    if (s.ordinal !== k + 1) throw new Error(`${what}: numeración no consecutiva`);
  });
  return out;
}

// ───────────────────────── estadísticas y mapa del corpus completo ─────────────────────────

type L = { r: Rec; i: number }[];

function corpusStats(a: {
  questions: L;
  claims: L;
  hyps: L;
  evidence: L;
  roots: L;
  objects: L;
  gov: L;
  rels: L;
  keep: L;
  s0c: L;
}): CorpusStats {
  const count = (list: L, key: string): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const x of list) {
      const k = String(x.r[key]);
      out[k] = (out[k] ?? 0) + 1;
    }
    return out;
  };
  const byQuestion = new Map<string, string[]>();
  for (const c of a.claims) {
    const q = str(c.r, "QUESTION_ID", "claim");
    byQuestion.set(q, [...(byQuestion.get(q) ?? []), str(c.r, "CLAIM_ID", "claim")]);
  }
  const claimStates = count(a.claims, "STATE");
  const allStates: Record<string, number> = {};
  for (const s of CLAIM_LIFECYCLE_STATES) allStates[s] = claimStates[s] ?? 0;
  for (const s of Object.keys(claimStates)) if (!(s in allStates)) allStates[s] = claimStates[s]!;
  const qIds = a.questions.map((q) => str(q.r, "QUESTION_ID", "question")).sort();
  const claimedHyps = new Set(
    a.claims.map((c) => strOrNull(c.r, "HYPOTHESIS_ID")).filter((x): x is string => x !== null),
  );
  return {
    questions: a.questions.length,
    questions_by_regime: count(a.questions, "REGIME"),
    claims: a.claims.length,
    claims_by_regime: count(a.s0c, "REGIME"),
    hypotheses: a.hyps.length,
    evidence: a.evidence.length,
    evidence_linked_to_claim: a.evidence.filter((e) => e.r["DIAGNOSTIC_ONLY"] === false).length,
    evidence_diagnostic_only: a.evidence.filter((e) => e.r["DIAGNOSTIC_ONLY"] === true).length,
    evidence_roots: a.roots.length,
    statistical_objects: a.objects.length,
    governance_rulings: a.gov.length,
    relations: a.rels.length,
    relations_by_category: count(a.rels, "CATEGORY"),
    preserved_results: a.keep.length,
    claim_states: allStates,
    questions_with_claims: qIds.filter((q) => byQuestion.has(q)).length,
    questions_without_claims: qIds.filter((q) => !byQuestion.has(q)),
    questions_with_multiple_claims: qIds.filter((q) => (byQuestion.get(q)?.length ?? 0) > 1),
    hypotheses_without_claim: a.hyps
      .map((h) => str(h.r, "HYPOTHESIS_ID", "hypothesis"))
      .filter((h) => !claimedHyps.has(h))
      .sort(),
    limitations_claims: a.claims.reduce(
      (n, c) => n + strs(c.r, "LIMITATIONS", "claim", true).length,
      0,
    ),
    limitations_questions: a.questions.reduce(
      (n, q) => n + strs(q.r, "KNOWN_LIMITATIONS", "question", true).length,
      0,
    ),
  };
}

function corpusMap(a: { questions: L; claims: L; hyps: L; s0q: L }): CorpusMap {
  const out: CorpusMap = { questions: {}, claims: {} };
  for (const c of a.claims) {
    out.claims[str(c.r, "CLAIM_ID", "claim")] = {
      question_id: str(c.r, "QUESTION_ID", "claim"),
      state: str(c.r, "STATE", "claim"),
    };
  }
  for (const q of a.questions) {
    const id = str(q.r, "QUESTION_ID", "question");
    const cl = a.claims
      .filter((c) => c.r["QUESTION_ID"] === id)
      .sort((x, y) => str(x.r, "CLAIM_ID", "c").localeCompare(str(y.r, "CLAIM_ID", "c")));
    const s0 = a.s0q.find((x) => x.r["QUESTION_ID"] === id);
    const res =
      s0 === undefined
        ? ""
        : String(asRec(s0.r["EFFECTIVE_RESOLUTION"], "S0.EFFECTIVE_RESOLUTION")["VALUE"]);
    out.questions[id] = {
      claim_ids: cl.map((c) => str(c.r, "CLAIM_ID", "claim")),
      claim_states: cl.map((c) => str(c.r, "STATE", "claim")),
      hypothesis_ids: a.hyps
        .filter((h) => h.r["QUESTION_ID"] === id)
        .map((h) => str(h.r, "HYPOTHESIS_ID", "hyp"))
        .sort(),
      resolution: res,
    };
  }
  return out;
}
