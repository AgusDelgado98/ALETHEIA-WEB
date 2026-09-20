import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadGenerated, type GeneratedCorpus } from "../../tools/corpus/load.ts";
import { sha256Hex } from "../../tools/corpus/util.ts";
import { parseSegments, type Segment } from "../../tools/editorial/directives.ts";
import { loadEditorial, type EditorialBundle } from "../../tools/editorial/load.ts";
import { pendingSignoff } from "../../tools/editorial/audit.ts";
import { limitationIdFromRef } from "../../tools/editorial/resolve.ts";
import { fromSegments, markTokens, type Part } from "./render.ts";

/**
 * Modelo de vista de una página de pregunta. Lee SOLO `generated/` (hechos y estados) y `editorial/` (palabras).
 * Ninguna cadena visible se escribe a mano en los componentes: si falta una, esto lanza (G-UX-01: nada de `undefined`).
 */
export interface TextItem {
  id: string;
  parts: Part[];
}

export interface QuestionView {
  slug: string;
  moduleId: string;
  id: string;
  publicQuestion: string;
  canonicalQuestion: string;
  ui: (key: string) => string;
  state: {
    question: string;
    claim: string;
    claimLabel: string;
    questionLabel: string;
    absenceNotNegative: boolean;
  };
  claim: { id: string; source: string; hypothesisId: string };
  title: Part[];
  intro: Part[];
  scope: Part[];
  canSay: TextItem[];
  doesNotMean: TextItem[];
  wouldNeed: TextItem[];
  absenceText: string;
  trail: {
    claim: Part[];
    hypothesis: Part[];
    evidence: Part[];
    objects: { id: string; parts: Part[] }[];
    source: { rootId: string; publication: Part[]; linkUnresolved: boolean };
    reasons: TextItem[];
    ids: {
      claim: string;
      hypothesis: string;
      evidence: string[];
      roots: string[];
      objects: string[];
      ruling: string[];
      episodes: string[];
    };
    auditOnly: { ownerId: string; text: Part[]; waiver: string }[];
  };
  provenance: {
    moduleVersion: string;
    tag: string;
    commit: string;
    commitShort: string;
    generatorVersion: string;
    manifestSha: string;
    editorialSha: string;
    preserved: string[];
    forbidden: string[];
    cite: Part[];
    disclosureRequired: boolean;
    pendingSignoff: number;
  };
}

export function questionSlug(id: string): string {
  return id.replace(/^LAB-/, "").toLowerCase();
}

export function availableQuestionIds(root: string): string[] {
  const c = loadGenerated(root);
  return c.manifest.slice.question_ids.filter((id) =>
    existsSync(join(root, "editorial", "labor", "findings", `${id}.yml`)),
  );
}

function req<T>(v: T | undefined | null, what: string): T {
  if (v === undefined || v === null)
    throw new Error(`Falta ${what}: no se renderiza una cadena inexistente`);
  return v;
}

export function loadQuestionView(root: string, qid: string): QuestionView {
  const c: GeneratedCorpus = loadGenerated(root);
  const e: EditorialBundle = loadEditorial(root, qid);

  const q = req(
    c.questions.find((x) => x.id === qid),
    `pregunta ${qid}`,
  );
  const claim = req(
    c.claims.find((x) => x.id === q.claim_ids[0]),
    `claim de ${qid}`,
  );
  if (q.claim_ids.length !== 1)
    throw new Error(
      `${qid}: la página de M1 muestra un claim; hay ${q.claim_ids.length}. La regla 0..N exige una plantilla multi-claim antes de publicarla`,
    );
  const hyp = req(
    c.hypotheses.find((x) => x.id === claim.hypothesis_id),
    "hipótesis del claim",
  );

  const segs = (text: string): Segment[] => parseSegments(text, c);
  const parts = (text: string): Part[] => fromSegments(segs(text));
  const item = (u: { id: string; text: string }): TextItem => ({ id: u.id, parts: parts(u.text) });
  const ui = (key: string): string => req(e.ui.strings[key], `cadena de interfaz «${key}»`).text;

  const qLabel = req(
    e.states.question_resolution_labels[q.resolution.value],
    `etiqueta pública de la resolución ${q.resolution.value} (G-STA-06)`,
  ).text;
  const cLabel = req(
    e.states.claim_state_labels[claim.epistemic_state],
    `etiqueta pública del estado ${claim.epistemic_state} (G-STA-06)`,
  ).text;

  const byId = (list: { id: string; text: string }[], id: string): { id: string; text: string } =>
    req(
      list.find((x) => x.id === id),
      `texto editorial ${id}`,
    );
  const root7 = c["evidence-roots"].filter((r) => claim.root_ids.includes(r.id));
  if (root7.length !== 1) throw new Error("M1 muestra una raíz de evidencia en el Rastro");
  const rootPrimary = root7[0]!;

  const audit = e.limits.dispositions
    .filter((d) => d.disposition === "AUDIT_ONLY")
    .map((d) => {
      const id = req(limitationIdFromRef(c, d.limitation), `limitación ${d.limitation}`);
      const lim = req(
        c.limitations.find((l) => l.id === id),
        id,
      );
      return {
        ownerId: lim.owner_id,
        text: markTokens(lim.text),
        waiver: req(d.waiver_reason, "razón de la disposición AUDIT_ONLY"),
      };
    });

  const editorialManifest = readFileSync(join(root, "editorial", "manifest.json"));
  const cite = ui("cite_template")
    .replace("{question}", e.question.public_question)
    .replace("{version}", c.manifest.version)
    .replace("{tag}", c.manifest.pin.tag)
    .replace("{commit}", c.manifest.pin.commit.slice(0, 7))
    .replace("{claim}", claim.id);

  return {
    slug: questionSlug(qid),
    moduleId: c.manifest.module_id,
    id: qid,
    publicQuestion: e.question.public_question,
    canonicalQuestion: q.canonical_text,
    ui,
    state: {
      question: q.resolution.value,
      claim: claim.epistemic_state,
      claimLabel: cLabel,
      questionLabel: qLabel,
      absenceNotNegative: q.absent_vs_negative === "ABSENT_NOT_NEGATIVE",
    },
    claim: { id: claim.id, source: claim.source_label, hypothesisId: hyp.id },
    title: parts(e.finding.title.text),
    intro: parts(e.finding.intro.text),
    scope: parts(e.finding.scope.text),
    canSay: e.finding.can_say.map(item),
    doesNotMean: e.finding.does_not_mean.map(item),
    wouldNeed: e.finding.would_need.map(item),
    absenceText: e.states.fixed.absence_not_negative.text,
    trail: {
      claim: parts(e.finding.trail.claim.text),
      hypothesis: parts(e.finding.trail.hypothesis.text),
      evidence: parts(e.finding.trail.evidence.text),
      objects: [
        { id: "LAB-OBJ-0003", parts: parts(e.finding.trail.object_employment.text) },
        { id: "LAB-OBJ-0016", parts: parts(e.finding.trail.object_registration.text) },
      ],
      source: {
        rootId: rootPrimary.id,
        publication: markTokens(rootPrimary.publication),
        linkUnresolved: rootPrimary.source_link_status === "UNRESOLVED",
      },
      reasons: e.finding.blockers_at_cut.map((id) => item(byId(e.finding.can_say, id))),
      ids: {
        claim: claim.id,
        hypothesis: hyp.id,
        evidence: claim.evidence_ids,
        roots: [...claim.root_ids, ...claim.referenced_root_ids],
        objects: claim.object_ids,
        ruling: claim.lab_gov,
        episodes: c.episodes.filter((x) => x.claim_ids.includes(claim.id)).map((x) => x.id),
      },
      auditOnly: audit,
    },
    provenance: {
      moduleVersion: c.manifest.version,
      tag: c.manifest.pin.tag,
      commit: c.manifest.pin.commit,
      commitShort: c.manifest.pin.commit.slice(0, 7),
      generatorVersion: c.manifest.generator_version,
      manifestSha: c.manifestSha256,
      editorialSha: sha256Hex(editorialManifest),
      preserved: q.preserved_result_ids,
      forbidden: claim.answerability.forbidden_inferences,
      cite: markTokens(cite),
      disclosureRequired: hyp.disclosure_required,
      pendingSignoff: pendingSignoff(e).length,
    },
  };
}
